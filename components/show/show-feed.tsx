'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Users, MessageCircle, Clock, LogOut, MapPin, Crown, X, Eye, User as UserIcon } from 'lucide-react'
import Image from 'next/image'

import { UserCard } from '@/components/show/user-card'
import { ChatList } from '@/components/chat/chat-list'

import type { Event, EventUser, UserSession, Chat } from '@/lib/types'

interface BroadcastMessage {
  id: string
  content: string
  sender_name: string
  created_at: string
}

interface ShowFeedProps {
  event: Event
  currentUser: EventUser
  session: UserSession
}

export function ShowFeed({ event, currentUser }: ShowFeedProps) {
  const router = useRouter()

  const [failedSelfieUrls, setFailedSelfieUrls] = useState<Set<string>>(new Set())
  const markSelfieFailed = useCallback((url: string) => {
    setFailedSelfieUrls((prev) => {
      const next = new Set(prev)
      next.add(url)
      return next
    })
  }, [])

  const [users, setUsers] = useState<EventUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userCount, setUserCount] = useState(0)

  const [showLocations, setShowLocations] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const [showVip, setShowVip] = useState(false)
  const [vipUsers, setVipUsers] = useState<EventUser[]>([])

  const [hostUser, setHostUser] = useState<EventUser | null>(null)

  const [timeRemaining, setTimeRemaining] = useState<string>('')

  const [showChats, setShowChats] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])

  const [unreadCount, setUnreadCount] = useState(0)

  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const notificationPermissionRef = useState(notificationPermission)[0]

  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([])

  const handleLeave = () => {
    clearLocalSession()
    router.push('/')
  }

  async function handleStartChat(targetUser: EventUser) {
    const supabase = createClient()

    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('event_id', event.id)
      .or(
        `and(user1_id.eq.${currentUser.id},user2_id.eq.${targetUser.id}),and(user1_id.eq.${targetUser.id},user2_id.eq.${currentUser.id})`
      )
      .single()

    if (existingChat) {
      router.push(`/show/${event.id}/chat/${existingChat.id}`)
      return
    }

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

  const loadUsers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_users')
      .select('*')
      .eq('event_id', event.id)
      .neq('id', currentUser.id)
      .order('created_at', { ascending: false })

    setUsers(data || [])
    setUserCount((data?.length || 0) + 1)
  }, [event.id, currentUser.id])

  const loadVipUsers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_users')
      .select('*')
      .eq('event_id', event.id)
      .eq('is_vip', true)

    setVipUsers(data || [])
  }, [event.id])

  // Host user lookup
  useEffect(() => {
    async function loadHost() {
      if (!event.host_id) return
      const supabase = createClient()
      const { data } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', event.id)
        .eq('auth_user_id', event.host_id)
        .single()

      if (data) setHostUser(data)
    }

    loadHost()
  }, [event.id, event.host_id])

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

  useEffect(() => {
    if (!showVip) return
    loadVipUsers()
  }, [showVip, loadVipUsers])

  useEffect(() => {
    function updateTimer() {
      const now = Date.now()
      let endTime = 0

      if (event.status !== 'live') {
        setTimeRemaining(event.status === 'ended' ? 'Event ended' : 'Not live yet')
        return
      }

      if (event.ends_at) {
        endTime = new Date(event.ends_at).getTime()
      } else {
        const createdTime = new Date(event.created_at).getTime()
        endTime = createdTime + event.duration_hours * 60 * 60 * 1000
      }

      const remaining = endTime - now
      if (remaining <= 0) {
        setTimeRemaining('Event ended')
        return
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [event])

  function handleNext() {
    setCurrentIndex((prev) => (prev < users.length - 1 ? prev + 1 : 0))
  }

  const currentViewUser = users[currentIndex]

  return (
    <main className="min-h-dvh flex flex-col bg-background">
      {/* Broadcast Messages Popup Stack */}
      {broadcastMessages.length > 0 && (
        <div className="fixed top-20 right-4 left-4 md:right-auto md:left-auto md:max-w-sm z-50 space-y-2">
          {broadcastMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-black/95 backdrop-blur-lg border border-purple-500/50 rounded-2xl shadow-2xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-purple-400 font-bold text-sm">{msg.sender_name}</p>
                    <p className="text-white/40 text-xs">{new Date(msg.created_at).toLocaleTimeString()}</p>
                  </div>
                  <p className="text-white text-sm mt-1">{msg.content}</p>
                </div>
                <button className="text-white/50 hover:text-white/80" onClick={() => setBroadcastMessages([])}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            <h1 className="font-bold text-foreground truncate">{event.show_name}</h1>
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-primary/50 bg-primary/5">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono font-bold text-primary">{timeRemaining}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-0">
            <Button
              variant="outline"
className="ml-0 sm:ml-2 rounded-full border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
onClick={() => router.push(`/show/${event.id}/host-chat`)}
              disabled={event.status !== 'live'}
              title={event.status !== 'live' ? 'Host setup available when event is live' : 'Chat with host'}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              {hostUser ? `Host: ${hostUser.username}` : 'Host'}
            </Button>

            {event.locations && event.locations.length > 1 && (
              <Button
                variant="secondary"
                className="mt-2 sm:mt-0 ml-0 sm:ml-3 rounded-full"
                onClick={() => setShowLocations(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Peep
              </Button>
            )}
          </div>

        </div>


        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            {((currentUser.selfie_url || '').trim().length > 0) && !failedSelfieUrls.has((currentUser.selfie_url || '').trim()) ? (
              <img
                src={(currentUser.selfie_url || '').trim()}
                alt={currentUser.username}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary"
                onError={() => markSelfieFailed((currentUser.selfie_url || '').trim())}
                loading="lazy"
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
              {currentUser.is_vip && <img src="/tick.png" alt="VIP" className="w-5 h-5" />}
            </div>
          </div>

          {event.locations && event.locations.length > 1 && currentUser.location && (
            <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
              <MapPin className="h-3 w-3" />
              <span>{currentUser.location}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      {showVip ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-300" />
              <h2 className="font-bold text-amber-300">VIP</h2>
              <span className="text-xs text-muted-foreground">({vipUsers.length})</span>
            </div>
            <Button variant="ghost" onClick={() => setShowVip(false)}>
              Close
            </Button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto">
            {vipUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No VIPs yet</p>
            ) : (
              <div className="space-y-2">
                {vipUsers.map((vip) => (
                  <div
                    key={vip.id}
                    className="flex items-center justify-between gap-3 bg-card/50 border border-border/50 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      {(vip.selfie_url || '').trim().length > 0 && !failedSelfieUrls.has((vip.selfie_url || '').trim()) ? (
                        <img
                          src={(vip.selfie_url || '').trim()}
                          alt={vip.username}
                          className="w-10 h-10 rounded-full object-cover"
                          onError={() => markSelfieFailed((vip.selfie_url || '').trim())}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-amber-300" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{vip.username}</div>
                          {vip.is_vip && <img src="/tick.png" alt="VIP" className="w-4 h-4" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{vip.vibe_key}</div>
                      </div>
                    </div>

                    <Button variant="secondary" onClick={() => handleStartChat(vip)}>
                      Peep
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : showLocations ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h2 className="font-bold">Locations</h2>
            </div>
            <Button variant="ghost" onClick={() => {
              setShowLocations(false)
              setSelectedLocation(null)
            }}>
              Close
            </Button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto">
            {(event.locations || []).map((loc) => {
              const active = selectedLocation === loc
              return (
                <Button
                  key={loc}
                  variant={active ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedLocation(loc)}
                >
                  {loc}
                </Button>
              )
            })}

            {selectedLocation && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Users at {selectedLocation}</p>
                <div className="space-y-2">
                  {users
                    .filter((u) => (u as any).location === selectedLocation)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 bg-card/50 border border-border/50 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-3">
                          {(u.selfie_url || '').trim().length > 0 && !failedSelfieUrls.has((u.selfie_url || '').trim()) ? (
                            <img
                              src={(u.selfie_url || '').trim()}
                              alt={u.username}
                              className="w-10 h-10 rounded-full object-cover"
                              onError={() => markSelfieFailed((u.selfie_url || '').trim())}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{u.username}</div>
                            <div className="text-xs text-muted-foreground">{u.vibe_key}</div>
                          </div>
                        </div>
                        <Button variant="secondary" onClick={() => handleStartChat(u)}>
                          Peep
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : showChats ? (
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 p-3 flex items-center justify-center mb-4 overflow-hidden">
                <Image src="/logo.png" alt="LinkedUp" width={64} height={64} className="object-contain" priority />
              </div>
            </div>
          ) : (
            <div className="flex-1 relative">
              {currentViewUser && (
                <UserCard
                  user={currentViewUser}
                  onChat={() => handleStartChat(currentViewUser)}
                  onPass={() => handleNext()}
                  canChat={true}
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-0 z-40 bg-background/80 backdrop-blur-lg border-t border-border/50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{userCount} here</span>
          </div>

          <Button
            variant={showChats ? 'secondary' : 'ghost'}
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
    </main>
  )
}

