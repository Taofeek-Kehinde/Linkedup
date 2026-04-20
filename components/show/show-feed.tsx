'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { 
  Users, 
  MessageCircle, 
  Clock, 
  LogOut, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react'
import { UserCard } from '@/components/show/user-card'
import { ChatList } from '@/components/chat/chat-list'
import type { Event, EventUser, UserSession, Chat } from '@/lib/types'

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

  // Load users
  const loadUsers = useCallback(async () => {
    const supabase = createClient()
    const { data, count } = await supabase
      .from('event_users')
      .select('*', { count: 'exact' })
      .eq('event_id', event.id)
      .neq('id', currentUser.id)
      .order('created_at', { ascending: false })

    setUsers(data || [])
    setUserCount((count || 0) + 1) // Include self
  }, [event.id, currentUser.id])

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
    // Check chat limit
    if (chats.length >= 6 && !currentUser.is_upgraded) {
      // Redirect to upgrade flow
      router.push(`/show/${event.id}/upgrade`)
      return
    }

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
              onClick={() => setShowChats(!showChats)}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-xs flex items-center justify-center text-accent-foreground">
                  {unreadCount}
                </span>
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
            <div>
              <p className="text-sm font-medium text-foreground">{currentUser.username}</p>
              <p className="text-xs font-mono text-muted-foreground">{currentUser.vibe_key}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {chats.length}/6 chats
          </Badge>
        </div>
      </header>

      {/* Main content */}
      {showChats ? (
        <ChatList 
          chats={chats} 
          currentUser={currentUser}
          eventId={event.id}
          onClose={() => setShowChats(false)}
        />
      ) : (
        <div className="flex-1 flex flex-col">
          {users.length === 0 ? (
            // Empty state
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
              <h2 className="text-xl font-bold text-foreground mb-2">You&apos;re the first one here!</h2>
              <p className="text-muted-foreground max-w-xs">
                Share the event code with others so they can join and connect with you.
              </p>
              {/* Event code removed entirely */}
            </div>
          ) : (
            // User cards
            <div className="flex-1 relative">
              {/* Navigation buttons */}
              {users.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/50 backdrop-blur-sm"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/50 backdrop-blur-sm"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Current user card */}
              {currentViewUser && (
                <UserCard 
                  user={currentViewUser} 
                  onChat={() => handleStartChat(currentViewUser)}
                  canChat={chats.length < 6 || currentUser.is_upgraded}
                />
              )}

              {/* Pagination dots */}
              {users.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {users.slice(0, 10).map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentIndex ? 'bg-primary' : 'bg-muted'
                      }`}
                      onClick={() => setCurrentIndex(idx)}
                    />
                  ))}
                  {users.length > 10 && (
                    <span className="text-xs text-muted-foreground ml-1">+{users.length - 10}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
