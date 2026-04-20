'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateEventCode } from '@/lib/utils/generate-event-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Sparkles, MapPin, Clock, Check } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function AdminHostEventPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [showName, setShowName] = useState('')
  const [locations, setLocations] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [scheduledStartAt, setScheduledStartAt] = useState('')
  const [durationHours, setDurationHours] = useState('6')

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

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    
    // Generate unique event code
    const eventCode = generateEventCode(locations[0] || showName.trim() || 'EVENT')

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_code: eventCode,
        show_name: showName.trim(),
        locations: locations.length > 0 ? locations : null,
        location: locations[0] || null,
        scheduled_start_at: scheduledStartAt || null,
        duration_hours: parseInt(durationHours),
        status: 'archived',
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
            <h1 className="text-2xl font-bold text-foreground">Host New Event</h1>
            <p className="text-sm text-muted-foreground">Quickly set up your LinkedUp event</p>
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
              Enter the details for your event. A unique code will be generated automatically.
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
                <div className="flex gap-2">
                  <Input
                    id="new-location"
                    placeholder="Add location (e.g., San Francisco)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLocation.trim()) {
                        e.preventDefault()
                        setLocations([...locations, newLocation.trim()])
                        setNewLocation('')
                      }
                    }}
                    className="flex-1 bg-input"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (newLocation.trim()) {
                        setLocations([...locations, newLocation.trim()])
                        setNewLocation('')
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {locations.map((loc, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {loc}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => setLocations(locations.filter((_, i) => i !== index))}
                        >
                          ×
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional. Helps users filter who they see. Click + to add, × to remove.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled-start" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Scheduled Start Time
                </Label>
                <Input
                  id="scheduled-start"
                  type="datetime-local"
                  value={scheduledStartAt}
                  onChange={(e) => setScheduledStartAt(e.target.value)}
                  className="bg-input"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Event will auto-start at this time.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duration
                </Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <SelectTrigger className="bg-input">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="6">6 hours (recommended)</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Users can connect during this time window.
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
                    Host Event
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

