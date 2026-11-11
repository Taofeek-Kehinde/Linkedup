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
import { ArrowLeft, Sparkles, MapPin, Check, Plus, Trash2, CalendarDays, Clock } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function CreateEventPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showName, setShowName] = useState('')
  const [locations, setLocations] = useState<string[]>([''])
  const [scheduledStartAt, setScheduledStartAt] = useState<Date | null>(null)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    const eventLocations = locations.map((location) => location.trim()).filter(Boolean)
    if (eventLocations.length === 0) {
      setError('Add at least one event location.')
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const eventCode = generateEventCode(eventLocations[0])
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
        location: eventLocations[0],
        locations: eventLocations,
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
            <p className="text-sm text-muted-foreground">Create an event with both a QR code and a shareable join link.</p>
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
              Enter the details for your event. A unique QR code and shareable link will be generated automatically.
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

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Event locations
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLocations((current) => [...current, ''])}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add location
                  </Button>
                </div>
                <div className="space-y-2">
                  {locations.map((location, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <Input
                        aria-label={`Event location ${index + 1}`}
                        placeholder={index === 0 ? 'e.g., 12 Example Street, Lagos' : 'Add another event location'}
                        value={location}
                        onChange={(e) => setLocations((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                        required
                        className="bg-input"
                      />
                      {locations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove location ${index + 1}`}
                          onClick={() => setLocations((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Add every area or venue where attendees can join this event. Attendees will choose one when they join.
                </p>
              </div>

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
              After creating your event, you can share its link or let attendees scan its QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
