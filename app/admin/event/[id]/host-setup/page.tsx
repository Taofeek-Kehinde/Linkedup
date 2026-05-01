'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge' 
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Crown, MapPin, Clock, Eye, EyeOff } from 'lucide-react'
import type { Event, EventUser } from '@/lib/types'

export default function HosterPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id: eventId } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [hostUser, setHostUser] = useState<EventUser | null>(null)
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
  const hostLocation = event?.location || (event?.locations && event.locations[0]) || ''

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
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
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
    <main className="min-h-dvh relative overflow-hidden">
      {hostSelfieUrl ? (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${hostSelfieUrl})` }}
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900" />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      
      <div className="relative z-10 flex flex-col h-dvh pt-8 pb-16 px-6">
        <div className="text-center mb-12 animate-fade-in-down">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            CANDY &amp; CLASSY
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm md:text-base font-semibold text-white/90 mb-4">
            <MapPin className="w-5 h-5" />
            <span>{hostLocation}</span>
          </div>
          {event.status === 'live' && (
            <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
              LIVE NOW
            </Badge>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center mb-12">
          <div className="flex gap-4 max-w-md w-full">
            <Button 
              size="lg" 
              onClick={handleVipClick}
              className={`flex-1 h-20 rounded-2xl bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-lg shadow-2xl backdrop-blur-sm border-white/20 transition-all duration-300 ${isVipMode ? 'ring-2 ring-yellow-400 scale-105' : ''}`}
            >
              <Crown className={`w-6 h-6 mr-2 ${isVipMode ? 'text-yellow-400' : ''}`} />
              VIP
            </Button>

            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="text-2xl md:text-3xl font-mono font-black text-white bg-black/40 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/20">
                <Clock className="w-5 h-5 inline-block mr-2" />
                {timeRemaining}
              </div>
              <Button 
                size="lg" 
                onClick={handleHostClick}
                className="h-14 w-full rounded-2xl bg-gradient-to-r from-indigo-600/90 to-blue-600/90 hover:from-indigo-500 hover:to-blue-500 text-white font-bold shadow-2xl backdrop-blur-sm border-white/20"
              >
                HOST
              </Button>
            </div>

            <Button 
              size="lg" 
              className="flex-1 h-20 rounded-2xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-2xl backdrop-blur-sm border-white/20"
              onClick={() => console.log('Info clicked')}
            >
              <span className="text-2xl">✨</span>
            </Button>
          </div>
        </div>

        <div className="flex gap-4 max-w-md mx-auto w-full">
          <Button 
            size="lg" 
            onClick={handlePass}
            className="flex-1 h-16 rounded-[20%] bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-2xl backdrop-blur-sm transition-all duration-300"
          >
            <EyeOff className="w-5 h-5 mr-2" />
            PASS
          </Button>
          <Button 
            size="lg" 
            onClick={handlePeep}
            className="flex-1 h-16 rounded-[20%] bg-green-600 hover:bg-green-500 text-white font-bold text-lg shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <Eye className="w-5 h-5 mr-2" />
            PEEP
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out;
        }
      `}</style>
    </main>
  )
}
