'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/utils/session'
import { Button } from '@/components/ui/button'
import { Users, MessageCircle, Clock, LogOut, MapPin, Crown, X, Eye } from 'lucide-react'
import Image from 'next/image'

import { UserCard, SelfieImage } from '@/components/show/user-card'
import { ChatList } from '@/components/chat/chat-list'

import type { Event, EventUser, UserSession, Chat } from '@/lib/types'

interface BroadcastMessage {
  id: string
  content: string
  sender_name: string
  created_at: string
}

interface BlockedUserRelation {
  blocker_id: string
  blocked_id: string
}

interface ShowFeedProps {
  event: Event
  currentUser: EventUser
  session: UserSession
}

export function ShowFeed({ event, currentUser }: ShowFeedProps) {
  const router = useRouter()

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
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())

  const [unreadCount, setUnreadCount] = useState(0)

  const [notificationPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const notificationPermissionRef = useRef(notificationPermission)

  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([])

  useEffect(() => {
    notificationPermissionRef.current = notificationPermission
  }, [notificationPermission])

  const handleLeave = () => {
    clearLocalSession()
    router.push('/')
  }

  async function handleStartChat(targetUser: EventUser) {
    const supabase = createClient()

    const { data: blockedRelation } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('event_id', event.id)
      .or(
        `and(blocker_id.eq.${currentUser.id},blocked_id.eq.${targetUser.id}),and(blocker_id.eq.${targetUser.id},blocked_id.eq.${currentUser.id})`
      )
      .limit(1)
      .single()

    if (blockedRelation) {
      return
    }

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

    const { data: blockedRelations } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .eq('event_id', event.id)
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)

    const hiddenIds = new Set<string>()
    ;(blockedRelations || []).forEach((relation: BlockedUserRelation) => {
      hiddenIds.add(relation.blocker_id)
      hiddenIds.add(relation.blocked_id)
    })

    const visibleUsers = (data || []).filter((user) => !hiddenIds.has(user.id))

    setBlockedIds(hiddenIds)
    setUsers(visibleUsers)
    setUserCount(visibleUsers.length + 1)
  }, [event.id, currentUser.id])

  const loadVipUsers = useCallback(async () => {
    const supabase = createClient()

    const vipQuery = supabase
      .from('event_users')
      .select('*')
      .eq('event_id', event.id)
      .eq('is_vip', true)

    if (currentUser.location) {
      vipQuery.eq('location', currentUser.location)
    }

    const { data } = await vipQuery

    const { data: blockedRelations } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .eq('event_id', event.id)
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)

    const hiddenIds = new Set<string>()
    ;(blockedRelations || []).forEach((relation: BlockedUserRelation) => {
      hiddenIds.add(relation.blocker_id)
      hiddenIds.add(relation.blocked_id)
    })

    setVipUsers((data || []).filter((vip) => !hiddenIds.has(vip.id)))
  }, [event.id, currentUser.id, currentUser.location])

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

    const { data: blockedRelations } = await supabase
      .from('blocked_users')
      .select('blocker_id, blocked_id')
      .eq('event_id', event.id)
      .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`)

    const blockedPartnerIds = new Set<string>()
    const hiddenIds = new Set<string>()

    ;(blockedRelations || []).forEach((relation: BlockedUserRelation) => {
      hiddenIds.add(relation.blocker_id)
      hiddenIds.add(relation.blocked_id)

      if (relation.blocker_id === currentUser.id) {
        blockedPartnerIds.add(relation.blocked_id)
      }
      if (relation.blocked_id === currentUser.id) {
        blockedPartnerIds.add(relation.blocker_id)
      }
    })

    setBlockedIds(hiddenIds)

    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('event_id', event.id)
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .eq('is_active', true)

    setChats(
      (data || []).filter((chat) => {
        const partnerId = chat.user1_id === currentUser.id ? chat.user2_id : chat.user1_id
        return !blockedPartnerIds.has(partnerId)
      })
    )
  }, [event.id, currentUser.id])

  useEffect(() => {
    loadUsers()
    loadChats()
  }, [loadUsers, loadChats])

  useEffect(() => {
    if (users.length > 0 && currentIndex >= users.length) {
      setCurrentIndex(0)
    }
  }, [users.length, currentIndex])

  useEffect(() => {
    if (!showVip) return
    loadVipUsers()
  }, [showVip, loadVipUsers])

  const broadcastMsgIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    async function fetchLatestBroadcast() {
      try {
        const { data: latest } = await supabase
          .from('broadcast_messages')
          .select('id, content, sender_id, created_at')
          .eq('event_id', event.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const msg = latest?.[0] as any
        if (!msg) {
          setBroadcastMessages([])
          return
        }

        // reset so the UI always shows only one
        broadcastMsgIdsRef.current = new Set([msg.id])

        let senderName = 'ADMIN'
        if (msg.sender_id) {
          const { data: sender } = await supabase
            .from('event_users')
            .select('username')
            .eq('event_id', event.id)
            .eq('id', msg.sender_id)
            .single()
          if (sender?.username) senderName = sender.username
        }

        setBroadcastMessages([
          {
            id: msg.id,
            content: msg.content,
            sender_name: senderName,
            created_at: msg.created_at,
          },
        ])
      } catch {
        // ignore
      }
    }

    // Always fetch on mount (reliable across locations)
    fetchLatestBroadcast()


    const channel = supabase
      .channel(`event-${event.id}-broadcast`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'broadcast_messages',
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          const msg = payload.new as any
          if (!msg?.id) return
          if (broadcastMsgIdsRef.current.has(msg.id)) return
          broadcastMsgIdsRef.current.add(msg.id)

          let senderName = 'ADMIN'
          try {
            if (msg.sender_id) {
              const { data: sender } = await supabase
                .from('event_users')
                .select('username')
                .eq('event_id', event.id)
                .eq('id', msg.sender_id)
                .single()
              if (sender?.username) senderName = sender.username
            }
          } catch {
            // ignore
          }

          const nextMsg: BroadcastMessage = {
            id: msg.id,
            content: msg.content,
            sender_name: senderName,
            created_at: msg.created_at,
          }

          // Force everyone to converge to the latest message by re-fetching the latest row.
          // This avoids timing issues caused by host deleting + inserting broadcast_messages.
          await fetchLatestBroadcast()

        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event.id])

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
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center">
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
        <div className="flex flex-col items-center p-4">
          <h1 className="font-bold text-foreground text-center truncate max-w-full">{event.show_name}</h1>
          <div className="flex items-center justify-center mt-2 relative">
            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full border-2 border-primary/50 bg-primary/5 z-10">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-mono font-bold text-primary">{timeRemaining}</span>
            </div>
          </div>

          <div className="flex w-full justify-end">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-0">
              {event.locations && event.locations.length > 1 && (
                <Button
                  variant="secondary"
                  className="mt-2 sm:mt-0 ml-0 sm:ml-3 rounded-full cursor-pointer border border-primary/30"
                  onClick={() => setShowLocations(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Peep
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <div className="flex items-center gap-2">
            <SelfieImage
              src={currentUser.selfie_url}
              alt={currentUser.username}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-primary"
              fallbackClassName="w-8 h-8 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center ring-2 ring-primary overflow-hidden"
            />
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
            <div className="space-y-2">
              {vipUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No VIPs yet</p>
              ) : (
                vipUsers.map((vip) => (
                  <div
                    key={vip.id}
                    className="flex items-center justify-between gap-3 bg-card/50 border border-border/50 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <SelfieImage
                        src={vip.selfie_url}
                        alt={vip.username}
                        className="w-10 h-10 rounded-full object-cover"
                        fallbackClassName="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center"
                      />
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
                ))
              )}
            </div>
          </div>
        </div>
      ) : showLocations ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border/50 bg-background/80 backdrop-blur sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <h2 className="font-bold">Locations</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setShowLocations(false)
                setSelectedLocation(null)
              }}
            >
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
                          <SelfieImage
                            src={u.selfie_url}
                            alt={u.username}
                            className="w-10 h-10 rounded-full object-cover"
                            fallbackClassName="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center"
                          />
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
          blockedIds={blockedIds}
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

          <div className="flex items-center gap-4 justify-end">
            <Button
              variant="outline"
              className="ml-1 rounded-full border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 px-3"
              onClick={async () => {
                if (event.status !== 'live') return

                const supabase = createClient()

                // Load host user row for this event
                if (!event.host_id) return
                const { data: hostRow, error: hostErr } = await supabase
                  .from('event_users')
                  .select('*')
                  .eq('event_id', event.id)
                  .eq('auth_user_id', event.host_id)
                  .single()

                if (hostErr || !hostRow?.id) return

                // Ensure an active chat exists between current user and host
                const { data: existingChat } = await supabase
                  .from('chats')
                  .select('id')
                  .eq('event_id', event.id)
                  .eq('is_active', true)
                  .or(
                    `and(user1_id.eq.${currentUser.id},user2_id.eq.${hostRow.id}),and(user1_id.eq.${hostRow.id},user2_id.eq.${currentUser.id})`
                  )
                  .single()

                let chatId = existingChat?.id

                if (!chatId) {
                  const { data: newChat } = await supabase
                    .from('chats')
                    .insert({
                      event_id: event.id,
                      user1_id: currentUser.id,
                      user2_id: hostRow.id,
                      is_active: true,
                    })
                    .select('id')
                    .single()

                  chatId = newChat?.id
                }

                if (chatId) {
                  router.push(`/show/${event.id}/chat/${chatId}`)
                }
              }}
              disabled={event.status !== 'live'}
              title={event.status !== 'live' ? 'Host setup available when event is live' : 'Chat with host'}
            >
              <Crown className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={handleLeave}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </main>
  )
}