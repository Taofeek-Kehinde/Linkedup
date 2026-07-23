 'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateEventCode } from '@/lib/utils/generate-event-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Sparkles, MapPin, Check, Plus, Edit3, Trash2, CalendarDays, Clock } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function CreateEventPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showName, setShowName] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [scheduledStartAt, setScheduledStartAt] = useState<Date | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin')
        return
      }
      setUser(user)
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  const addLocation = () => {
    if (newLocation.trim()) {
      setLocations([...locations, newLocation.trim()])
      setNewLocation('')
    }
  }

  const updateLocation = (index: number, value: string) => {
    const newLocs = [...locations]
    newLocs[index] = value
    setLocations(newLocs)
  }

  const deleteLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const startEditing = (index: number) => {
    setEditingIndex(index)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const eventCode = generateEventCode(locations[0] || 'EVENT')
    const scheduledStartIso = scheduledStartAt ? scheduledStartAt.toISOString() : null
    const now = new Date()
    const isUpcoming = scheduledStartAt && scheduledStartAt.getTime() > now.getTime()
    const status = isUpcoming ? 'upcoming' : 'live'
    const startedAt = isUpcoming ? null : now.toISOString()
    const endsAt = isUpcoming ? null : new Date(now.getTime() + 15 * 60 * 60 * 1000).toISOString()

    const { data, error: dbError } = await supabase
      .from('events')
      .insert({
        event_code: eventCode,
        show_name: showName.trim(),
        locations: locations,
        duration_hours: 15,
        scheduled_start_at: scheduledStartIso,
        status,
        starts_at: startedAt,
        ends_at: endsAt,
        host_id: user.id,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setIsLoading(false)
      return
    }
    router.push(`/admin/event/${data.id}`)
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  function toDateTimeLocal(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">CREATE PHYSICAL EVENT</h1>
            <p className="text-sm text-muted-foreground">Generate a QR for your event attendees to scan at event.</p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Event Details
            </CardTitle>
            <CardDescription>
              Enter the details for your event. A unique QR code will be generated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Event Name */}
              <div className="space-y-2">
                <Label htmlFor="showName">Event Name</Label>
                <Input
                  id="showName"
                  placeholder="e.g., Summer Tech Meetup"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  required
                  className="bg-input"
                />
              </div>

              {/* Locations Management - Commented out */}
              {/* Scheduled Start Time */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Scheduled start time
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledStartAt ? toDateTimeLocal(scheduledStartAt) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Fix native datetime-local string to Javascript Date object conversion
                      setScheduledStartAt(new Date(e.target.value))
                    } else {
                      setScheduledStartAt(null)
                    }
                  }}
                  className="bg-input"
                />
              </div>

              {/* Duration - Fixed at 15 hours */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duration
                </Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm font-medium">15 hours (fixed)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Events last exactly 15 hours. The timer starts when you start the event.
                </p>
              </div>

              {/* Error Warning Display */}
              {error && (
                <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* Submit Buttons */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" /> Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> Create Event
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What you get:</strong>
              <br />
              A QR code will be generated after creating, for your event attendees to scan at the event.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
