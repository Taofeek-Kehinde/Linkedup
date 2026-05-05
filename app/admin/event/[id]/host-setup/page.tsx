'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge' 
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Crown, MapPin, Clock, User } from 'lucide-react'
import type { Event, EventUser } from '@/lib/types'

export default function HosterPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: eventId } = use(params)
const [event, setEvent] = useState<Event | null>(null)
  const [hostUser, setHostUser] = useState<EventUser | null>(null)
  const [vipUsers, setVipUsers] = useState<EventUser[]>([])
  const [timeRemaining, setTimeRemaining] = useState('00:00:00')
  const [isLoading, setIsLoading] = useState(true)
  const [isVipMode, setIsVipMode] = useState(false)

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

      // Load VIP users for this event
      const { data: vipData } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_vip', true)

      if (vipData) {
        setVipUsers(vipData)
      }

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

  const hostSelfieUrl = hostUser?.selfie_url || null
  const eventLocation = event?.locations?.[0] || event?.location || 'Venue'

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
    console.log('Host button clicked')
  }

  const handleVipClick = () => {
    setIsVipMode(!isVipMode)
  }

  const handlePass = () => {
    console.log('Pass clicked')
  }

  const handlePeep = () => {
    console.log('Peep clicked')
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
    <main className="fixed inset-0 w-full overflow-hidden">
      {/* Background with host selfie */}
        {event?.host_selfie_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${event.host_selfie_url})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900" />
        )}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      
      {/* Content - Fixed height, no scrolling */}
      <div className="relative z-10 h-full flex flex-col px-6">
        {/* Header Section - At the very top */}
        <div className="text-center pt-6 flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            CANDY &amp; CLASSY
          </h1>
          <div className="flex items-center justify-center gap-1 text-sm text-white/80 mt-1">
            <MapPin className="w-4 h-4" />
            <span>{eventLocation}</span>
          </div>
          {event.status === 'live' && (
            <Badge variant="default" className="mt-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              LIVE NOW
            </Badge>
          )}
        </div>

{/* VIP, Timer, Host - Right after location at the top */}
        <div className="flex justify-center items-center mt-6 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md rounded-[60px] p-2 flex gap-3 items-center">
            {/* VIP - Left */}
            <Button 
              onClick={handleVipClick}
              className={`w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-0 ${isVipMode ? 'ring-2 ring-yellow-400 scale-105' : ''}`}
            >
              <Crown className={`w-6 h-6 ${isVipMode ? 'text-yellow-400' : 'text-white'}`} />
              <span className="text-xs mt-1">VIP</span>
            </Button>

            {/* Timer - Center */}
            <div className="w-28 h-20 rounded-full bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center border border-white/20">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="font-mono font-bold text-white text-base mt-1">
                {timeRemaining}
              </span>
            </div>

            {/* HOST - Right */}
            <Button 
              onClick={handleHostClick}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-2xl flex flex-col items-center justify-center p-0"
            >
              <span className="text-sm font-bold">HOST</span>
            </Button>
          </div>
        </div>

        {/* VIP Users List - Shows when VIP button is active */}
        {isVipMode && (
          <div className="flex-1 overflow-y-auto mt-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold">VIP ({vipUsers.length})</span>
            </div>
            {vipUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {vipUsers.map((vip) => (
                  <div 
                    key={vip.id} 
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full pr-3 pl-1 py-1"
                  >
                    {vip.selfie_url ? (
                      <img 
                        src={vip.selfie_url} 
                        alt={vip.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-yellow-500/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-white text-sm font-medium">{vip.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center text-sm">No VIPs yet</p>
            )}
          </div>
        )}

        {/* Spacer to push PASS and PEEP to bottom */}
        <div className="flex-1"></div>

{/* Bottom Buttons - PASS and PEEP - moved up slightly */}
        <div className="flex gap-4 max-w-md mx-auto w-full pb-6 flex-shrink-0">
          <Button 
            onClick={handlePass}
            className="flex-1 h-16 rounded-[50px] bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-2xl transition-all duration-300"
          >
            PASS
          </Button>
          <Button 
            onClick={handlePeep}
            className="flex-1 h-16 rounded-[50px] bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-2xl transition-all duration-300 hover:scale-105"
          >
            PEEP
          </Button>
        </div>
      </div>
    </main>
  )
}