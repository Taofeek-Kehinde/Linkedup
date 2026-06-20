'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge' 
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Crown, MapPin, User, Send } from 'lucide-react'
import type { Event, EventUser } from '@/lib/types'

export default function HostSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: eventId } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [hostUser, setHostUser] = useState<EventUser | null>(null)
  const [vipUsers, setVipUsers] = useState<EventUser[]>([])
  const [timeRemaining, setTimeRemaining] = useState('00:00:00')
  const [isLoading, setIsLoading] = useState(true)
  const [isVipMode, setIsVipMode] = useState(false)
  const [userMessage, setUserMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    async function loadEvent() {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin')
        return
      }

      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('host_id', user.id)
        .single()

      if (!eventData) {
        router.push('/admin/dashboard')
        return
      }

      setEvent(eventData)

      const { data: hostData } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', eventId)
        .eq('auth_user_id', user.id)
        .single()

      if (hostData) {
        setHostUser(hostData)
      }

      const { data: vipData } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_vip', true)

      setVipUsers(vipData ?? [])

      setIsLoading(false)
    }

    loadEvent()

    const supabase = createClient()
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        (payload) => {
          setEvent(payload.new as Event)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, router])

  const eventLocation = event?.locations?.[0] || event?.location || 'Venue'
  const backgroundImageUrl = hostUser?.selfie_url || event?.host_selfie_url

  useEffect(() => {
    if (!event) return

    const updateTimer = () => {
      const now = Date.now()
      let endTime = 0
      
      if (event.ends_at) {
        endTime = new Date(event.ends_at).getTime()
      } else if (event.starts_at) {
        endTime = new Date(event.starts_at).getTime() + (event.duration_hours * 60 * 60 * 1000)
      } else {
        endTime = new Date(event.created_at).getTime() + (event.duration_hours * 60 * 60 * 1000)
      }
      
      const remaining = endTime - now
      
      if (remaining <= 0) {
        setTimeRemaining('00:00:00')
        return
      }
      
      const hours = Math.floor(remaining / 3600000).toString().padStart(2, '0')
      const minutes = Math.floor((remaining % 3600000) / 60000).toString().padStart(2, '0')
      const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0')
      setTimeRemaining(`${hours}:${minutes}:${seconds}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [event])

  const handleHostClick = () => {
    // Host chat expects `linkedup_session` in localStorage.
    // We create a minimal session pointing to the HOST event_user row.
    try {
      const stored = localStorage.getItem('linkedup_session')
      const session = stored ? JSON.parse(stored) : null

      // We need the host's event_user id. If we already have `hostUser`, use it.
      if (hostUser?.id) {
        localStorage.setItem(
          'linkedup_session',
          JSON.stringify({
            eventUserId: hostUser.id,
            eventId: eventId,
            username: hostUser.username || 'HOST',
            vibeKey: hostUser.vibe_key || 'host',
            sessionToken: hostUser.session_token,
            selfieUrl: hostUser.selfie_url,
            isUpgraded: Boolean(hostUser.is_upgraded),
            isVip: Boolean(hostUser.is_vip),
            isActive: hostUser.is_active ?? true,
          })
        )
      }
    } catch {
      // ignore; navigation below will still happen.
    }

    router.push(`/show/${eventId}/host-chat`)
  }


  const handleVipClick = () => {
    setIsVipMode(!isVipMode)
  }

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending || !event) return
    
    setIsSending(true)
    
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let { data: hostEventUser } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', event.id)
        .eq('auth_user_id', user.id)
        .single()

      if (!hostEventUser) {
        const { data: created } = await supabase
          .from('event_users')
          .insert({
            event_id: event.id,
            auth_user_id: user.id,
            username: 'HOST',
            vibe_key: 'host',
            session_token: `host-${event.id}-${user.id}`,
          })
          .select()
          .single()
        hostEventUser = created
      }

      if (!hostEventUser) throw new Error('Could not create host user')

      // Keep only ONE latest broadcast message per event
      const { error: deleteError } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('event_id', event.id)

      if (deleteError) {
        console.error('Error deleting old broadcast messages:', deleteError)
        // do not block sending
      }

      const { error: insertError } = await supabase
        .from('broadcast_messages')
        .insert({
          event_id: event.id,
          sender_id: hostEventUser.id,
          content: userMessage.trim()
        })

      if (insertError) {
        console.error('Error inserting broadcast message:', insertError)
        throw insertError
      }

      setUserMessage('')

    } catch (error) {
      console.error('Error sending broadcast message:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading || !event) {
    return (
      <main className="h-dvh flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white animate-pulse" />
          </div>
          <Spinner className="w-8 h-8 mx-auto" />
        </div>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        {backgroundImageUrl ? (
          <>
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-no-repeat"
              style={{ 
                backgroundImage: `url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900" />
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-4 sm:px-6">
        {/* Header Section */}
        <div className="text-center pt-6 sm:pt-8 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-xl">
            {event.show_name}
          </h1>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base text-white/90 font-semibold mt-1.5 sm:mt-2 drop-shadow-lg">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{eventLocation}</span>
          </div>
          {event.status === 'live' && (
            <Badge variant="default" className="mt-2 sm:mt-3 bg-green-500/30 text-green-400 border-green-500/50 text-xs sm:text-sm font-bold px-3 sm:px-4 py-0.5 sm:py-1">
              LIVE NOW
            </Badge>
          )}
        </div>

        {/* Host Profile Image */}
        {hostUser?.selfie_url && (
          <div className="flex justify-center mt-4">
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 shadow-2xl overflow-hidden bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${hostUser.selfie_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />
          </div>
        )}

        {/* VIP, Timer, Host */}
        <div className="flex justify-center items-center mt-4 sm:mt-6 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md rounded-full p-1.5 sm:p-2 flex gap-2 sm:gap-3 items-center shadow-xl">
            <Button 
              onClick={handleVipClick}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 flex flex-col items-center justify-center p-0 ${isVipMode ? 'ring-2 ring-yellow-400 scale-105' : ''}`}
            >
              <Crown className={`w-5 h-5 sm:w-6 sm:h-6 ${isVipMode ? 'text-yellow-400' : 'text-white'}`} />
              <span className="text-[10px] sm:text-xs font-bold mt-0.5">VIP</span>
            </Button>

            <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
              <span className="font-mono font-black text-white text-sm sm:text-base md:text-lg tracking-wider drop-shadow-lg">
                {timeRemaining}
              </span>
            </div>

            <Button 
              onClick={handleHostClick}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg transition-all duration-300 flex flex-col items-center justify-center p-0"
            >
              <span className="text-xs sm:text-sm font-black tracking-wide">HOST</span>
            </Button>
          </div>
        </div>

        {/* VIP Users List */}
        {isVipMode && (
          <div className="flex-1 overflow-y-auto mt-4 sm:mt-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm sm:text-base">VIP ({vipUsers.length})</span>
            </div>
            {vipUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                {vipUsers.map((vip) => (
                  <div 
                    key={vip.id} 
                    className="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-md rounded-full pr-3 sm:pr-4 pl-1 py-1 shadow-lg border border-white/20"
                  >
                    {vip.selfie_url ? (
                      <div 
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-cover bg-center"
                        style={{ backgroundImage: `url(${vip.selfie_url})`, backgroundSize: 'cover' }}
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-500/50 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                      </div>
                    )}
                    <span className="text-white text-xs sm:text-sm font-semibold">{vip.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center text-xs sm:text-sm">No VIPs yet</p>
            )}
          </div>
        )}

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Input Section */}
        <div className="max-w-md mx-auto w-full pb-4 sm:pb-6 flex-shrink-0">
          <div className="bg-black/40 backdrop-blur-lg rounded-full p-1.5 flex gap-2 shadow-xl border border-white/20">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Broadcast message to all users..."
              className="flex-1 bg-transparent text-white placeholder-white/50 px-3 sm:px-4 py-2.5 sm:py-3 outline-none text-sm sm:text-base font-medium"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || isSending}
              className="rounded-full w-10 h-10 sm:w-11 sm:h-11 p-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg"
            >
              {isSending ? (
                <Spinner className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}