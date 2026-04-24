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
import { ArrowLeft, Sparkles, MapPin, Clock, Check, Plus, Edit3, Trash2, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function CreateEventPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
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
    // Optional: prefill if needed
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    
    // Generate unique event code
    const eventCode = generateEventCode(locations[0] || 'EVENT')

    const scheduledStartIso = scheduledStartAt ? scheduledStartAt.toISOString() : null
    const now = new Date()

    // Determine if event should start immediately or be upcoming
    const isUpcoming = scheduledStartAt && scheduledStartAt.getTime() > now.getTime()
    const status = isUpcoming ? 'upcoming' : 'live'
    const startedAt = isUpcoming ? null : now.toISOString()
    const endsAt = isUpcoming ? null : new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
      .from('events')
      .insert({
        event_code: eventCode,
        show_name: showName.trim(),
        host_name: showName.trim(),
        locations: locations,
        duration_hours: 6,
        scheduled_start_at: scheduledStartIso,
        status,
        starts_at: startedAt,
        ends_at: endsAt,
        host_id: user.id,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    // Redirect to the event details page
    router.push(`/admin/event/${data.id}`)
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    )
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
            <h1 className="text-2xl font-bold text-foreground">Create PEEP or PASS</h1>
            <p className="text-sm text-muted-foreground">Set up your LinkedUp event</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Locations
                </Label>
                <div className="space-y-2">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No locations added</p>
                  ) : (
                    locations.map((loc, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                        {editingIndex === index ? (
                          <Input
                            value={loc}
                            onChange={(e) => updateLocation(index, e.target.value)}
                            onBlur={() => setEditingIndex(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingIndex(null)
                              }
                            }}
                            autoFocus
                            className="flex-1"
                          />
                        ) : (
                          <span className="flex-1">{loc}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(index)}
                          className="h-6 w-6"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLocation(index)}
                          className="h-6 w-6"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                  <div className="flex gap-1">
                    <Input
                      placeholder="e.g., San Francisco, CA"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addLocation()
                      }}
                      className="flex-1 bg-input"
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={addLocation}
                      disabled={!newLocation.trim()}
                      className="h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional. Helps users filter who they see.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Scheduled start time
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledStartAt ? scheduledStartAt.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setScheduledStartAt(e.target.value ? new Date(e.target.value) : null)}
                  className="bg-input"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. When the event is scheduled to start.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duration
                </Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm font-medium">6 hours</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Every event lasts exactly 6 hours.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !showName.trim()}>
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Event
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What happens next?</strong>
              <br />
              After creating, you&apos;ll get a unique event code and QR code to share with attendees. They can join and start connecting!
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
