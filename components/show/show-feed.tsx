'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'
import { 
  Users, 
  MessageCircle, 
  Clock, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  MapPin
} from 'lucide-react'
import { UserCard } from '@/components/show/user-card'
import { ChatList } from '@/components/chat/chat-list'
import type { Event, EventUser, UserSession, Chat, Message } from '@/lib/types'
import { useRef } from 'react'

interface ShowFeedProps {
  event: Event
  currentUser: EventUser
  session: UserSession
}

export function ShowFeed({ event, currentUser, session }: ShowFeedProps) {
  const router = useRouter()
  const [users, setUsers] = useState<EventUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [showChats, setShowChats] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null)
  const soundTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const chatIdsRef = useRef<Set<string>>(new Set())
  const notificationPermissionRef = useRef(notificationPermission)
  const showBrowserNotificationRef = useRef<((title: string, body: string) => void) | null>(null)
  const playNotificationSoundRef = useRef<(() => void) | null>(null)

  // Keep refs updated
  useEffect(() => {
    notificationPermissionRef.current = notificationPermission
  }, [notificationPermission])

  // Notification functions - declared BEFORE they're used
  const playNotificationSound = useCallback(() => {
    if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current)

    soundTimeoutRef.current = setTimeout(() => {
      // Try to play the notification sound first
      const audio = new Audio('/Notification.mp3')
      audio.volume = 1.0
      audio.play().catch(() => {
        // Fallback: play a beep sound using Web Audio API
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = 800
          oscillator.type = 'sine'
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
          setTimeout(() => audioContext.close(), 300)
        } catch (e) {
          console.log('Audio not supported', e)
        }
      })
    }, 100)
  }, [])

  const showBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && notificationPermission === 'granted') {
      new Notification(title, { body, icon: '/logo.png', tag: 'message-notification' })
    }
  }, [notificationPermission])

  // Update refs when functions change
  useEffect(() => {
    showBrowserNotificationRef.current = showBrowserNotification
  }, [showBrowserNotification])

  useEffect(() => {
    playNotificationSoundRef.current = playNotificationSound
  }, [playNotificationSound])

  useEffect(() => {
    chatIdsRef.current = new Set(chats.map(c => c.id))
  }, [chats])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && notificationPermission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission as 'granted' | 'denied')
      })
    }
  }, [notificationPermission])

  // Preload notification sound
  useEffect(() => {
    const audio = new Audio('/Notification.mp3')
    audio.preload = 'auto'
    audio.volume = 1.0
    notificationAudioRef.current = audio
  }, [])

  // Global visibility change listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && notificationPermission === 'granted') {
        // Optional: update badge or something
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [notificationPermission])

  // Global message subscription for notifications (all event messages)
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel(`event-${event.id}-messages-notif`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Check if message is from a chat in this event and not from current user
          if (chatIdsRef.current.has(newMsg.chat_id) && newMsg.sender_id !== currentUser.id) {
            if (document.hidden && notificationPermissionRef.current === 'granted') {
              showBrowserNotificationRef.current?.(
                'New Message',
                newMsg.content?.slice(0, 50) + '...' || 'New message'
              )
            }
            playNotificationSoundRef.current?.()
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event.id, currentUser.id])

  // Load users
  const loadUsers = useCallback(async () => {
    const supabase = createClient()
    
    // Build query dynamically
    let query = supabase
      .from('event_users')
      .select('*', { count: 'exact' })
      .eq('event_id', event.id)
      .neq('id', currentUser.id)
    
    // For multi-location events, only show users at the same location
    if (event.locations && event.locations.length > 1 && currentUser.location) {
      query = query.eq('location', currentUser.location)
    }
    
    const { data, count } = await query.order('created_at', { ascending: false })

    setUsers(data || [])
    setUserCount((count || 0) + 1) // Include self
  }, [event.id, currentUser.id, event.locations, currentUser.location])

  // Load chats
  const loadChats = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('event_id', event.id)
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .eq('is_active', true)

    setChats(data || [])
  }, [event.id, currentUser.id])

  useEffect(() => {
    loadUsers()
    loadChats()
  }, [loadUsers, loadChats])

  // Real-time subscription for users
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`event-${event.id}-users`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_users', filter: `event_id=eq.${event.id}` },
        () => loadUsers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event.id, loadUsers])

  // Real-time subscription for chats
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`user-${currentUser.id}-chats`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats' },
        () => loadChats()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser.id, loadChats])

  // Countdown timer - FIXED: Immediate countdown for live events
  useEffect(() => {
    function updateTimer() {
      const now = Date.now();
      let endTime: number;

      if (event.status !== 'live') {
        setTimeRemaining(event.status === 'ended' ? 'Event ended' : 'Not live yet');
        return;
      }

      if (event.ends_at) {
        endTime = new Date(event.ends_at).getTime();
      } else {
        const createdTime = new Date(event.created_at).getTime();
        endTime = createdTime + (event.duration_hours * 60 * 60 * 1000);
      }

      const remaining = endTime - now;
      if (remaining <= 0) {
        setTimeRemaining('Event ended');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event])

  function handlePrevious() {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : users.length - 1))
  }

  function handleNext() {
    setCurrentIndex(prev => (prev < users.length - 1 ? prev + 1 : 0))
  }

  async function handleStartChat(targetUser: EventUser) {
    // No chat limit - unlimited per location

    const supabase = createClient()

    // Check if chat already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('event_id', event.id)
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${currentUser.id})`)
      .single()

    if (existingChat) {
      router.push(`/show/${event.id}/chat/${existingChat.id}`)
      return
    }

    // Create new chat
    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        event_id: event.id,
        user1_id: currentUser.id,
        user2_id: targetUser.id,
      })
      .select()
      .single()

    if (!error && newChat) {
      router.push(`/show/${event.id}/chat/${newChat.id}`)
    }
  }

  function handleLeave() {
    clearLocalSession()
    router.push('/')
  }

  const currentViewUser = users[currentIndex]

  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h1 className="font-bold text-foreground truncate">{event.show_name}</h1>
            <div className="flex items-center justify-center gap-6 text-center mx-auto">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{userCount} here</span>
              </div>
              {event.locations && event.locations.length > 1 && currentUser.location && (
                <div className="flex items-center gap-1 text-xs text-primary font-medium">
                  <MapPin className="h-3 w-3" />
                  <span>{currentUser.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-sm font-mono font-bold text-primary">
                <Clock className="h-4 w-4" />
                <span>{timeRemaining}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showChats ? "secondary" : "ghost"}
              size="icon"
              className="relative"
              onClick={() => {
                setShowChats(!showChats)
                if (unreadCount > 0) setUnreadCount(0)
              }}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLeave}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* User info bar */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            {currentUser.selfie_url ? (
              <img 
                src={currentUser.selfie_url} 
                alt={currentUser.username}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-primary overflow-hidden">
                <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-secondary">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{currentUser.username}</p>
                <p className="text-xs font-mono text-muted-foreground">{currentUser.vibe_key}</p>
              </div>
              {currentUser.is_vip && (
                <img src="/tick.png" alt="VIP" className="w-5 h-5" />
              )}
            </div>
          </div>
          {/* Removed chat limit badge - unlimited chats per location */}
        </div>
      </header>

      {/* Main content */}
      {showChats ? (
        <ChatList 
          chats={chats} 
          currentUser={currentUser}
          eventId={event.id}
          event={event}
          onClose={() => setShowChats(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {users.length === 0 ? (
            // Empty state - removed text
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image 
                  src="/logo.png" 
                  alt="LinkedUp" 
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              {/* Text removed, logo only */}
            </div>
          ) : (
            // User cards
            <div className="flex-1 relative">
              {/* Navigation buttons */}


              {/* Current user card */}
              {currentViewUser && (
                <UserCard 
                  user={currentViewUser} 
                  onChat={() => handleStartChat(currentViewUser)}
                  onPass={handleNext}
                  canChat={true}
                />
              )}


            </div>
          )}
        </div>
      )}
    </main>
  )
}