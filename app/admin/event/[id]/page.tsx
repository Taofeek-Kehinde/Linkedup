'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Copy, 
  Check, 
  Users, 
  Clock, 
  MapPin,
  QrCode as QrCodeIcon,
  Share2,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import type { Event, EventUser } from '@/lib/types'
import { QRCodeCanvas } from 'qrcode.react'

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [users, setUsers] = useState<EventUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

  useEffect(() => {
    async function loadEvent() {
      const supabase = createClient()
      
      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin')
        return
      }

      // Load event
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (!event) {
        router.push('/admin/dashboard')
        return
      }

      setEvent(event)

      // Load users
      const { data: users } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      setUsers(users || [])
      setIsLoading(false)
    }

    loadEvent()
  }, [id, router])

  // Real-time subscription for users
  useEffect(() => {
    if (!event) return

    const supabase = createClient()
    const channel = supabase
      .channel(`event-users-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_users', filter: `event_id=eq.${id}` },
        async () => {
          // Refresh users list
          const { data } = await supabase
            .from('event_users')
            .select('*')
            .eq('event_id', id)
            .order('created_at', { ascending: false })
          setUsers(data || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [event, id])

  // Countdown timer
  useEffect(() => {
    if (!event || event.status !== 'active' || !event.started_at) return

    function updateTimer() {
      if (!event?.started_at) return
      const startTime = new Date(event.started_at).getTime()
      const endTime = startTime + (event.duration_hours * 60 * 60 * 1000)
      const now = Date.now()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining('Event ended')
        return
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [event])

  async function startEvent() {
    if (!event) return
    setIsUpdating(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('events')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', event.id)

    if (!error) {
      setEvent({ ...event, status: 'active', started_at: new Date().toISOString() })
    }
    setIsUpdating(false)
  }

  async function endEvent() {
    if (!event) return
    setIsUpdating(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('events')
      .update({ status: 'ended' })
      .eq('id', event.id)

    if (!error) {
      setEvent({ ...event, status: 'ended' })
    }
    setIsUpdating(false)
  }

  function copyCode() {
    if (!event) return
    navigator.clipboard.writeText(event.event_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function shareEvent() {
    if (!event) return
    const url = `${window.location.origin}/join?code=${event.event_code}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.show_name,
          text: `Join ${event.show_name} on LinkedUp!`,
          url,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading || !event) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${event.event_code}`

  return (
    <main className="min-h-dvh p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground truncate">{event.show_name}</h1>
            <div className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{event.event_code}</span>
              <Badge variant={event.status === 'active' ? 'default' : 'secondary'}>
                {event.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* QR Code Card */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-foreground">
              <QrCodeIcon className="h-5 w-5 text-primary" />
              Scan to Join
            </CardTitle>
            <CardDescription>
              Share this QR code with attendees
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeCanvas
                value={joinUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={copyCode}
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={shareEvent}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status & Timer */}
        {event.status === 'active' && timeRemaining && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
              <p className="text-3xl font-mono font-bold text-primary">{timeRemaining}</p>
            </CardContent>
          </Card>
        )}

        {/* Event Info */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Participants
              </span>
              <span className="font-semibold text-foreground">{users.length}</span>
            </div>
            {event.location && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Location
                </span>
                <span className="font-semibold text-foreground">{event.location}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duration
              </span>
              <span className="font-semibold text-foreground">{event.duration_hours} hours</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {event.status === 'pending' && (
            <Button 
              className="w-full" 
              size="lg"
              onClick={startEvent}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Spinner className="mr-2" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              Start Event
            </Button>
          )}
          {event.status === 'active' && (
            <Button 
              variant="destructive" 
              className="w-full" 
              size="lg"
              onClick={endEvent}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Spinner className="mr-2" />
              ) : (
                <Square className="mr-2 h-5 w-5" />
              )}
              End Event
            </Button>
          )}
        </div>

        {/* Participants List */}
        {users.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Participants</h2>
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {users.map(user => (
                <Card key={user.id} className="border-border/50 bg-card/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    {user.selfie_url ? (
                      <img 
                        src={user.selfie_url} 
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{user.username}</p>
                      <p className="text-xs text-muted-foreground font-mono">{user.vibe_key}</p>
                    </div>
                    {user.is_upgraded && (
                      <Badge variant="secondary" className="text-xs">Upgraded</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
