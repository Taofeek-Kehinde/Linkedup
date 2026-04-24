'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Plus, Calendar, Users, LogOut, QrCode, MapPin, Clock } from 'lucide-react'
import type { Event } from '@/lib/types'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin')
        return
      }
      setUser(user)

      // Auto-start any upcoming events whose scheduled time has passed
      const now = new Date().toISOString()
      await supabase
        .from('events')
        .update({ 
          status: 'live', 
          starts_at: now,
          ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
        })
        .eq('host_id', user.id)
        .eq('status', 'upcoming')
        .lte('scheduled_start_at', now)

      // Load events for this host
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })

      setEvents(events || [])
      setIsLoading(false)
    }

    loadData()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin')
  }

  if (isLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  const liveEvents = events.filter(e => e.status === 'live')
  const upcomingEvents = events.filter(e => e.status === 'upcoming')
  const archivedEvents = events.filter(e => e.status === 'archived' || e.status === 'ended')

  return (
    <main className="min-h-dvh p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{liveEvents.length}</p>
                  <p className="text-xs text-muted-foreground">Active Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{events.length}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Event Button */}
        <Link href="/admin/create">
          <Card className="border-dashed border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center justify-center gap-3">
              <Plus className="h-6 w-6 text-primary" />
              <span className="font-semibold text-primary">Create New Event</span>
            </CardContent>
          </Card>
        </Link>

        {/* Active Events */}
        {liveEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Events
            </h2>
            {liveEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </section>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Upcoming Events
            </h2>
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </section>
        )}

        {/* Archived Events */}
        {archivedEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Archived Events</h2>
            {archivedEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </section>
        )}

        {/* Empty state */}
        {events.length === 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No events yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first event to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function EventCard({ event }: { event: Event }) {
  const statusColors = {
    live: 'bg-green-500/20 text-green-400',
    upcoming: 'bg-yellow-500/20 text-yellow-400',
    ended: 'bg-orange-500/20 text-orange-400',
    archived: 'bg-muted text-muted-foreground',
  } as const

  return (
    <Link href={`/admin/event/${event.id}`}>
      <Card className="border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-foreground text-lg">{event.show_name}</CardTitle>
              <CardDescription className="font-mono text-primary">
                {event.event_code}
              </CardDescription>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[event.status]}`}>
              {event.status}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
{(event.locations && event.locations.length > 0) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.locations.join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.duration_hours}h
            </span>
            <span className="flex items-center gap-1">
              <QrCode className="h-3 w-3" />
              QR Ready
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
