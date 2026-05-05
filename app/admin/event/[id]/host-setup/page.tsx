'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge' 
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Crown, MapPin, User, Send } from 'lucide-react'
import type { Event, EventUser } from '@/lib/types'
import Image from 'next/image'

export default function HosterPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [imageLoaded, setImageLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending) return
    
    setIsSending(true)
    
    try {
      console.log('Sending message:', userMessage)
      setUserMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
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
    <main className="fixed inset-0 w-full h-full overflow-hidden" ref={containerRef}>
      {/* Background Image - Enhanced for perfect clarity */}
      <div className="absolute inset-0 w-full h-full">
        {event?.host_selfie_url ? (
          <>
            {/* Preload image for better quality */}
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${event.host_selfie_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                backgroundRepeat: 'no-repeat',
                filter: 'brightness(0.85) contrast(1.05) saturate(1.1)',
              }}
            />
            {/* Subtle gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900" />
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col px-6">
        {/* Header Section */}
        <div className="text-center pt-8 flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-2xl">
            {event.show_name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg text-white/90 font-bold mt-2 drop-shadow-lg">
            <MapPin className="w-5 h-5" />
            <span>{eventLocation}</span>
          </div>
          {event.status === 'live' && (
            <Badge variant="default" className="mt-3 bg-green-500/40 text-green-300 border-green-500/50 text-sm font-bold px-4 py-1.5 backdrop-blur-sm">
              LIVE NOW
            </Badge>
          )}
        </div>

        {/* VIP, Timer, Host - Smaller circles, timer without background */}
        <div className="flex justify-center items-center mt-8 flex-shrink-0">
          <div className="flex gap-6 items-center">
            {/* VIP Button - Smaller */}
            <Button 
              onClick={handleVipClick}
              className={`w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-0 ${isVipMode ? 'ring-4 ring-yellow-400 scale-105' : ''}`}
            >
              <Crown className={`w-6 h-6 ${isVipMode ? 'text-yellow-400' : 'text-white'}`} />
              <span className="text-xs font-bold mt-0.5">VIP</span>
            </Button>

            {/* Timer - Large text, no background */}
            <div className="flex flex-col items-center">
              <span className="font-mono font-black text-white text-5xl md:text-6xl tracking-wider drop-shadow-2xl">
                {timeRemaining}
              </span>
            </div>

            {/* HOST Button - Smaller */}
            <Button 
              onClick={handleHostClick}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-0"
            >
              <span className="text-base font-black tracking-wide">HOST</span>
            </Button>
          </div>
        </div>

        {/* VIP Users List */}
        {isVipMode && (
          <div className="flex-1 overflow-y-auto mt-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-base">VIP ({vipUsers.length})</span>
            </div>
            {vipUsers.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {vipUsers.map((vip) => (
                  <div 
                    key={vip.id} 
                    className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full pr-3 pl-1 py-1 shadow-lg border border-white/20"
                  >
                    {vip.selfie_url ? (
                      <div className="relative w-8 h-8 rounded-full overflow-hidden">
                        <Image 
                          src={vip.selfie_url} 
                          alt={vip.username}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-yellow-500/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-white text-sm font-semibold">{vip.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center text-sm">No VIPs yet</p>
            )}
          </div>
        )}

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Input Section - Send icon only */}
        <div className="max-w-lg mx-auto w-full pb-8 flex-shrink-0">
          <div className="bg-black/40 backdrop-blur-lg rounded-full p-1.5 flex gap-2 shadow-2xl border border-white/20">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-transparent text-white placeholder-white/60 px-5 py-3 outline-none text-base font-medium"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || isSending}
              className="rounded-full w-12 h-12 p-0 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-xl"
            >
              {isSending ? (
                <Spinner className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}