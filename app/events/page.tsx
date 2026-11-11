'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock3, MapPin, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

type LiveEvent = {
  id: string
  event_code: string
  show_name: string
  location: string | null
  locations: string[] | null
  duration_hours: number | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

function getEventExpiry(event: LiveEvent): number {
  if (event.ends_at) return new Date(event.ends_at).getTime()
  const start = event.starts_at ? new Date(event.starts_at).getTime() : new Date(event.created_at).getTime()
  return start + (event.duration_hours || 15) * 60 * 60 * 1000
}

function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m left`
}

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      try {
        const supabase = createClient()
        const { data, error: queryError } = await supabase
          .from('events')
          .select('id, event_code, show_name, location, locations, duration_hours, starts_at, ends_at, created_at')
          .eq('status', 'live')
          .order('created_at', { ascending: false })

        if (queryError) throw queryError
        if (!cancelled) {
          setEvents(data || [])
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Could not load live events. Please try again.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadEvents()
    const refreshInterval = window.setInterval(loadEvents, 60_000)
    const clockInterval = window.setInterval(() => setCurrentTime(Date.now()), 15_000)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
      window.clearInterval(clockInterval)
    }
  }, [])

  const liveEvents = events.filter((event) => getEventExpiry(event) > currentTime)

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to home" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Live events</h1>
            <p className="text-sm text-muted-foreground">
              Join an event happening now. Blue ticks are for persons physically present at the event by checking in via QR code.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : error ? (
          <Card className="border-destructive/30 bg-card/50">
            <CardContent className="p-6 text-center text-sm text-destructive" role="alert">{error}</CardContent>
          </Card>
        ) : liveEvents.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="space-y-2 p-8 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No live events right now</p>
              <p className="text-sm text-muted-foreground">Check back later to find an event to join.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {liveEvents.map((event) => {
              const eventLocations = event.locations?.length
                ? event.locations.join(', ')
                : event.location || 'Location coming soon'

              return (
                <Card key={event.id} className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">LIVE</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatTimeRemaining(getEventExpiry(event) - currentTime)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="line-clamp-2 text-xl">{event.show_name}</CardTitle>
                      <CardDescription className="mt-1 font-mono">{event.event_code}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="line-clamp-2">{eventLocations}</span>
                    </p>
                    <Button
                      className="w-full"
                      onClick={() => router.push(`/join?code=${encodeURIComponent(event.event_code)}`)}
                    >
                      Join event
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
