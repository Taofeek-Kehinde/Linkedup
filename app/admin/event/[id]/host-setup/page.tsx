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
  const [imageError, setImageError] = useState(false)

  // Function to get optimized background image URL
  const getOptimizedBgUrl = (url: string) => {
    if (!url) return ''
    // Add parameters for better quality
    if (url.includes('supabase.co')) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}width=1920&height=1080&quality=100&resize=cover`
    }
    return url
  }

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

  const handleSendMessage = async () => {
    if (!userMessage.trim() || isSending) return
    
    setIsSending(true)
    
    try {
      const supabase = createClient()
      
      // Here you can send the message to a chat or broadcast
      console.log('Sending message:', userMessage)
      
      // Show success feedback
      setUserMessage('')
      
      // Optional: Add toast notification
      // toast({ title: 'Message sent!', description: 'Your message has been broadcast.' })
      
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
    <main className="fixed inset-0 w-full h-full overflow-hidden">
      {/* Background with host selfie - Enhanced for sharpness and clarity */}
      <div className="absolute inset-0 w-full h-full">
        {event?.host_selfie_url && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={getOptimizedBgUrl(event.host_selfie_url)}
              alt="Event Background"
              fill
              priority
              quality={100}
              className="object-cover object-center"
              onError={() => setImageError(true)}
              sizes="100vw"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
            {/* Dynamic overlay based on image brightness - lighter overlay for better visibility */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900" />
        )}
      </div>
      
      {/* Gradient overlays for better text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      
      {/* Content - Fixed height, no scrolling */}
      <div className="relative z-10 h-full flex flex-col px-6">
        {/* Header Section - At the very top */}
        <div className="text-center pt-6 flex-shrink-0">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-xl">
            {event.show_name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-base text-white/90 font-semibold mt-2 drop-shadow-lg">
            <MapPin className="w-5 h-5" />
            <span>{eventLocation}</span>
          </div>
          {event.status === 'live' && (
            <Badge variant="default" className="mt-3 bg-green-500/30 text-green-400 border-green-500/50 text-sm font-bold px-4 py-1">
              LIVE NOW
            </Badge>
          )}
        </div>

        {/* VIP, Timer, Host - Right after location at the top */}
        <div className="flex justify-center items-center mt-6 flex-shrink-0">
          <div className="bg-white/15 backdrop-blur-md rounded-[60px] p-2 flex gap-4 items-center shadow-2xl">
            {/* VIP - Left */}
            <Button 
              onClick={handleVipClick}
              className={`w-24 h-24 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-0 ${isVipMode ? 'ring-4 ring-yellow-400 scale-105 shadow-2xl' : 'shadow-xl'}`}
            >
              <Crown className={`w-7 h-7 ${isVipMode ? 'text-yellow-400' : 'text-white'}`} />
              <span className="text-sm font-bold mt-1">VIP</span>
            </Button>

            {/* Timer - Center - Removed clock icon, increased font */}
            <div className="w-32 h-24 rounded-full bg-black/60 backdrop-blur-md flex flex-col items-center justify-center border-2 border-white/30 shadow-2xl">
              <span className="font-mono font-black text-white text-2xl tracking-wider drop-shadow-lg">
                {timeRemaining}
              </span>
            </div>

            {/* HOST - Right */}
            <Button 
              onClick={handleHostClick}
              className="w-24 h-24 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center p-0"
            >
              <span className="text-xl font-black tracking-wide">HOST</span>
            </Button>
          </div>
        </div>

        {/* VIP Users List - Shows when VIP button is active */}
        {isVipMode && (
          <div className="flex-1 overflow-y-auto mt-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-lg">VIP ({vipUsers.length})</span>
            </div>
            {vipUsers.length > 0 ? (
              <div className="flex flex-wrap gap-3 justify-center">
                {vipUsers.map((vip) => (
                  <div 
                    key={vip.id} 
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full pr-4 pl-1 py-1 shadow-lg border border-white/20"
                  >
                    {vip.selfie_url ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image 
                          src={vip.selfie_url} 
                          alt={vip.username}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-yellow-500/50 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <span className="text-white font-semibold">{vip.username}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center text-base">No VIPs yet</p>
            )}
          </div>
        )}

        {/* Spacer to push input to bottom */}
        <div className="flex-1"></div>

        {/* Input Section - Replaced PASS and PEEP buttons */}
        <div className="max-w-md mx-auto w-full pb-6 flex-shrink-0">
          <div className="bg-white/10 backdrop-blur-md rounded-full p-1 flex gap-2 shadow-2xl border border-white/20">
            <input
              type="text"
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message here..."
              className="flex-1 bg-transparent text-white placeholder-white/60 px-4 py-3 outline-none text-base font-medium"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!userMessage.trim() || isSending}
              className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 h-auto shadow-xl font-bold"
            >
              {isSending ? (
                <Spinner className="w-5 h-5" />
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
          <p className="text-white/50 text-xs text-center mt-2">
            Share your thoughts with everyone
          </p>
        </div>
      </div>
    </main>
  )
}