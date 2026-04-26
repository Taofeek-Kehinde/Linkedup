'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Play, 
  Copy, 
  Check, 
  Users, 
  Clock, 
  MapPin,
  QrCode as QrCodeIcon,
  Share2,
  RefreshCw,
  Plus, 
  Edit3, 
  Trash2,
  CalendarDays,
  Save
} from 'lucide-react'
import Link from 'next/link'
import type { Event, EventUser } from '@/lib/types'
import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download } from 'lucide-react'

export default function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [users, setUsers] = useState<EventUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [upcomingCountdown, setUpcomingCountdown] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editShowName, setEditShowName] = useState('')
  const [editLocations, setEditLocations] = useState<string[]>([])
  const [editNewLocation, setEditNewLocation] = useState('')
  const [editScheduledStartAt, setEditScheduledStartAt] = useState<Date | null>(null)
  const [editDurationHours, setEditDurationHours] = useState('6')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)

  const downloadQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `LinkedUp-${event?.event_code || 'QR'}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    }
  }

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
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (!eventData) {
        router.push('/admin/dashboard')
        return
      }

      // Check if live event has expired and auto-end it
      let eventToUse = eventData
      if (eventData.status === 'live') {
        const nowTime = Date.now()
        let expired = false
        if (eventData.ends_at) {
          expired = new Date(eventData.ends_at).getTime() < nowTime
        } else if (eventData.starts_at) {
          expired = new Date(eventData.starts_at).getTime() + (eventData.duration_hours * 60 * 60 * 1000) < nowTime
        } else {
          expired = new Date(eventData.created_at).getTime() + (6 * 60 * 60 * 1000) < nowTime
        }

        if (expired) {
          const { data: updatedEvent } = await supabase
            .from('events')
            .update({ status: 'ended' })
            .eq('id', eventData.id)
            .select()
            .single()
          if (updatedEvent) {
            eventToUse = updatedEvent
          }
        }
      }

      setEvent(eventToUse)
      setEditShowName(eventToUse.show_name)
      setEditLocations(eventToUse.locations || [])
      setEditScheduledStartAt(eventToUse.scheduled_start_at ? new Date(eventToUse.scheduled_start_at) : null)
      setEditDurationHours(eventToUse.duration_hours.toString())

      // Load users
      const { data: usersData } = await supabase
        .from('event_users')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })

      setUsers(usersData || [])
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

  // Countdown timer for live events
  useEffect(() => {
    if (!event || event.status !== 'live') return

    async function updateTimer() {
      if (!event) return
      const now = Date.now()
      let endTime: number

      if (event.ends_at) {
        endTime = new Date(event.ends_at).getTime()
      } else if (event.starts_at) {
        endTime = new Date(event.starts_at).getTime() + (event.duration_hours * 60 * 60 * 1000)
      } else {
        endTime = new Date(event.created_at).getTime() + (6 * 60 * 60 * 1000)
      }

      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeRemaining('Event ended')
        // Update event status to ended in DB and local state
        const supabase = createClient()
        const { data: updatedEvent } = await supabase
          .from('events')
          .update({ status: 'ended' })
          .eq('id', event.id)
          .select()
          .single()
        if (updatedEvent) {
          setEvent(updatedEvent)
        }
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

  // Upcoming event countdown + auto-refresh when start time arrives
  useEffect(() => {
    if (!event || event.status !== 'upcoming' || !event.scheduled_start_at) return

    function updateCountdown() {
      const startTime = new Date(event!.scheduled_start_at!).getTime()
      const now = Date.now()
      const remaining = startTime - now

      if (remaining <= 0) {
        setUpcomingCountdown('Starting now...')
        // Auto-refresh to pick up status change
        window.location.reload()
        return
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)

      if (days > 0) {
        setUpcomingCountdown(`${days}d ${hours}h ${minutes}m`)
      } else {
        setUpcomingCountdown(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        )
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [event])

  const addEditLocation = () => {
    if (editNewLocation.trim()) {
      setEditLocations([...editLocations, editNewLocation.trim()])
      setEditNewLocation('')
    }
  }

  const updateEditLocation = (index: number, value: string) => {
    const newLocs = [...editLocations]
    newLocs[index] = value
    setEditLocations(newLocs)
  }

  const deleteEditLocation = (index: number) => {
    setEditLocations(editLocations.filter((_, i) => i !== index))
    if (editingIndex === index) setEditingIndex(null)
  }

  const startEditEditing = (index: number) => {
    setEditingIndex(index)
  }

  async function saveEdit() {
    if (!event) return
    setIsUpdating(true)

    const supabase = createClient()
    const scheduledStartIso = editScheduledStartAt ? editScheduledStartAt.toISOString() : null

    const { error } = await supabase
      .from('events')
      .update({ 
        show_name: editShowName.trim(),
        locations: editLocations,
        scheduled_start_at: scheduledStartIso,
        duration_hours: parseInt(editDurationHours)
      })
      .eq('id', event.id)

    if (!error) {
      setEvent({ 
        ...event, 
        show_name: editShowName,
        locations: editLocations,
        scheduled_start_at: scheduledStartIso,
        duration_hours: parseInt(editDurationHours)
      })
      setIsEditing(false)
    }
    setIsUpdating(false)
  }

async function startEvent() {
    if (!event) return
    setIsUpdating(true)

    const supabase = createClient()
    const endTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours from now
    const { data, error } = await supabase
      .from('events')
      .update({ 
        status: 'live', 
        starts_at: new Date().toISOString(),
        ends_at: endTime 
      })
      .eq('id', event.id)
      .select()
      .single()

    if (!error && data) {
      setEvent(data)
    }
    setIsUpdating(false)
  }

  async function toggleVip(user: EventUser) {
    const supabase = createClient()
    const { error } = await supabase
      .from('event_users')
      .update({ is_vip: !user.is_vip })
      .eq('id', user.id)

    if (!error) {
      setUsers(users.map(u => u.id === user.id ? { ...u, is_vip: !u.is_vip } : u))
    }
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
      } catch {}
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
          <div className="flex-1 space-y-1">
            {isEditing ? (
              <Input
                value={editShowName}
                onChange={(e) => setEditShowName(e.target.value)}
                className="text-xl font-bold h-10"
              />
            ) : (
              <h1 className="text-xl font-bold text-foreground truncate">{event.show_name}</h1>
            )}
            <div className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{event.event_code}</span>
              <Badge variant={event.status === 'live' ? 'default' : 'secondary'}>
                {event.status}
              </Badge>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setIsEditing(!isEditing)
              if (!isEditing) {
                // Load current values for edit
                setEditShowName(event.show_name)
                setEditLocations(event.locations || [])
                setEditScheduledStartAt(event.scheduled_start_at ? new Date(event.scheduled_start_at) : null)
                setEditDurationHours(event.duration_hours.toString())
              }
            }}
          >
            {isEditing ? <Save className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
          </Button>
        </div>

        {/* QR Code Card - only for live events */}
        {event.status === 'live' && (
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
                  ref={qrRef}
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
                  onClick={downloadQR}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} disabled={isUpdating} className="flex-1">
                    {isUpdating ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status & Timer */}
        {event.status === 'live' && timeRemaining && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
              <p className="text-3xl font-mono font-bold text-primary">{timeRemaining}</p>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Countdown */}
        {event.status === 'upcoming' && upcomingCountdown && (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Starts In</p>
              <p className="text-3xl font-mono font-bold text-yellow-400">{upcomingCountdown}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Event will start automatically
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Form / Info Card */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <div className="space-y-2">
                    {editLocations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No locations</p>
                    ) : (
                      editLocations.map((loc, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          {editingIndex === index ? (
                            <Input
                              value={loc}
                              onChange={(e) => updateEditLocation(index, e.target.value)}
                              onBlur={() => setEditingIndex(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingIndex(null)}
                              autoFocus
                              className="flex-1"
                            />
                          ) : (
                            <span className="flex-1">{loc}</span>
                          )}
                          <Button type="button" variant="ghost" size="icon" onClick={() => startEditEditing(index)} className="h-6 w-6">
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => deleteEditLocation(index)} className="h-6 w-6">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                    <div className="flex gap-1">
                      <Input
                        placeholder="Add location"
                        value={editNewLocation}
                        onChange={(e) => setEditNewLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addEditLocation()}
                        className="flex-1 bg-input"
                      />
                      <Button type="button" size="icon" onClick={addEditLocation} disabled={!editNewLocation.trim()} className="h-10 w-10">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Optional. Helps users filter who they see.</p>
                </div>

                <div className="space-y-2">
                  <Label>Scheduled start time</Label>
                  <Input
                    type="datetime-local"
                    value={editScheduledStartAt ? editScheduledStartAt.toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditScheduledStartAt(e.target.value ? new Date(e.target.value) : null)}
                    className="bg-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    type="number"
                    value={editDurationHours}
                    onChange={(e) => setEditDurationHours(e.target.value)}
                    min="1"
                    className="bg-input"
                  />
                  <p className="text-xs text-muted-foreground">Hours</p>
                </div>

                <Button onClick={saveEdit} className="w-full" disabled={isUpdating}>
                  {isUpdating ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Participants
                    </span>
                    <span className="font-semibold text-foreground">{users.length}</span>
                  </div>
                  {(event.locations && event.locations.length > 0) ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        Locations
                      </span>
                      <span className="font-semibold text-foreground max-w-[200px] truncate">{event.locations.join(', ')}</span>
                    </div>
                  ) : event.location && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-foreground">{event.location}</span>
                    </div>
                  )}
                  {event.scheduled_start_at && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Starts
                      </span>
                      <span className="font-semibold text-foreground">
                        {new Date(event.scheduled_start_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Duration
                    </span>
                    <span className="font-semibold text-foreground">{event.duration_hours} hours</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {event.status === 'live' && (
            <Button 
              variant="outline"
              className="w-full" 
              size="lg"
              onClick={() => router.push(`/admin/event/${event.id}/host-setup`)}
            >
              <Users className="mr-2 h-5 w-5" />
              SET UP HOST EVENT
            </Button>
          )}
          {event.status === 'ended' && (
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
              Restart Event
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
                    {user.is_vip && (
                      <img src="/tick.png" alt="VIP" className="w-5 h-5" />
                    )}
                    {user.is_upgraded && (
                      <Badge variant="secondary" className="text-xs">Upgraded</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVip(user)}
                      className={user.is_vip ? 'text-primary' : 'text-muted-foreground'}
                    >
                      {user.is_vip ? 'Remove VIP' : 'Make VIP'}
                    </Button>
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

