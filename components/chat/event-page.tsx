'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Save,
  Crown,
  Eye,
  Ticket,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import type { Event, EventUser } from '@/lib/types'
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
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin')
        return
      }

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

  useEffect(() => {
    if (!event || event.status !== 'upcoming' || !event.scheduled_start_at) return

    function updateCountdown() {
      const startTime = new Date(event!.scheduled_start_at!).getTime()
      const now = Date.now()
      const remaining = startTime - now

      if (remaining <= 0) {
        setUpcomingCountdown('Starting now...')
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
    const endTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
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
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-stone-950 to-black">
        <Spinner className="w-8 h-8 text-amber-400" />
      </main>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${event.event_code}`

  return (
    <main className="min-h-dvh bg-gradient-to-br from-stone-950 via-black to-stone-950 p-4 pb-24">
      <div className="max-w-md mx-auto space-y-5">
        
        {/* CANDY&CLASSY Hero Card - exact style from image */}
        <div className="relative rounded-3xl overflow-hidden border border-amber-500/20 bg-black/60 backdrop-blur-md shadow-2xl">
          {/* Top ribbon */}
          <div className="relative pt-6 pb-2 px-5 text-center border-b border-amber-500/20 bg-gradient-to-b from-amber-900/20 to-transparent">
            <div className="flex justify-between items-start">
              <p className="text-[10px] tracking-[0.2em] text-amber-400/70 font-semibold uppercase">exclusive</p>
              <p className="text-[10px] tracking-wide text-white/40">AWKA · NG</p>
            </div>
            <h1 className="font-['Playfair_Display'] text-4xl font-bold tracking-tight mt-2 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-sm">
              CANDY&<br />CLASSY
            </h1>
            <div className="flex justify-center gap-2 mt-1">
              <span className="inline-block w-12 h-[2px] bg-amber-400/70 rounded-full"></span>
              <span className="inline-block w-6 h-[2px] bg-amber-600/50 rounded-full"></span>
            </div>
            <p className="text-[10px] text-white/30 mt-2 tracking-wider uppercase">New Orleans Hotel, Awka</p>
          </div>

          {/* VIP block with 11:58 time from image */}
          <div className="px-5 py-5 space-y-5">
            <div className="flex items-center justify-between bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
                  <Crown className="h-6 w-6 text-black" />
                </div>
                <div>
                  <p className="text-amber-300 text-xs font-semibold tracking-wider">ACCESS TIER</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white text-2xl font-black tracking-tight">VIP</span>
                    <span className="text-amber-400 text-[11px] font-bold ml-1">✦ PREMIUM</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[10px] uppercase">gate time</p>
                <p className="font-mono text-amber-300 text-2xl font-bold tracking-wider">11:58</p>
              </div>
            </div>

            {/* PASS + PEEP exactly as screenshot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-stone-800/80 to-stone-900/90 border border-amber-500/30 p-4 text-center">
                <div className="absolute top-0 right-0 w-12 h-12 -mt-3 -mr-3 opacity-20">
                  <Ticket className="h-10 w-10 text-amber-400" />
                </div>
                <Ticket className="h-6 w-6 text-amber-400/70 mx-auto mb-2" />
                <p className="text-amber-300 font-black text-lg tracking-widest">PASS</p>
                <p className="text-white/50 text-[10px] mt-1 uppercase tracking-wider">scan to enter</p>
                <div className="mt-2 inline-block bg-white/10 rounded-full px-3 py-0.5">
                  <span className="text-amber-200 text-[11px] font-mono">#{event.event_code?.slice(0,5) || 'C8V9K'}</span>
                </div>
              </div>
              <div className="rounded-xl bg-black/50 border border-amber-500/20 p-4 text-center backdrop-blur-sm relative">
                <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-amber-500/10 rounded-full blur-xl"></div>
                <Eye className="h-6 w-6 text-amber-400/80 mx-auto mb-2" />
                <p className="text-amber-300 font-black text-lg tracking-widest">PEEP</p>
                <p className="text-white/40 text-[10px] uppercase mt-1">sneak preview</p>
                <div className="flex justify-center gap-1 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/50"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/30"></span>
                </div>
              </div>
            </div>

            {/* happy birthdayPretty Cynthy greeting - pure screenshot style */}
            <div className="text-center py-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-amber-900/20 to-transparent border border-amber-500/10">
              <p className="text-amber-200/90 text-sm tracking-wide font-medium flex items-center justify-center gap-2 flex-wrap">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>happy birthday</span>
                <span className="font-bold text-amber-300 text-base">Pretty Cynthy</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              </p>
            </div>
          </div>
        </div>

        {/* rest of original UI (event code, participants, controls) but styled consistently */}
        <div className="space-y-4">
          {/* Header with event name */}
          <div className="flex items-center gap-3 px-1">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-amber-400">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              {isEditing ? (
                <Input value={editShowName} onChange={(e) => setEditShowName(e.target.value)} className="text-xl font-bold bg-stone-900/80 border-amber-500/30 text-white" />
              ) : (
                <h1 className="text-xl font-bold text-white/90 truncate">{event.show_name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-amber-400 text-xs">{event.event_code}</span>
                <Badge variant={event.status === 'live' ? 'default' : 'secondary'} className="bg-amber-600/80 text-white text-[10px]">{event.status}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setIsEditing(!isEditing); if (!isEditing) { setEditShowName(event.show_name); setEditLocations(event.locations || []); setEditScheduledStartAt(event.scheduled_start_at ? new Date(event.scheduled_start_at) : null); setEditDurationHours(event.duration_hours.toString()); } }} className="text-white/60 hover:text-amber-400">
              {isEditing ? <Save className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
            </Button>
          </div>

          {/* QR + status / edit sections exactly from original */}
          {event.status === 'live' && (
            <Card className="border-amber-500/30 bg-black/40 backdrop-blur-sm">
              <CardContent className="p-5 flex flex-col items-center gap-4">
                <div className="text-center">
                  <QrCodeIcon className="h-5 w-5 text-amber-400 inline mr-2" />
                  <span className="text-white/80 text-sm">Scan to Join</span>
                </div>
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeCanvas ref={qrRef} value={joinUrl} size={180} level="H" includeMargin={false} />
                </div>
                <Button variant="outline" onClick={downloadQR} className="border-amber-500/40 text-amber-300"><Download className="mr-2 h-4 w-4" /> Download QR</Button>
              </CardContent>
            </Card>
          )}

          {event.status === 'live' && timeRemaining && (
            <Card className="border-amber-500/30 bg-amber-950/20">
              <CardContent className="p-4 text-center"><p className="text-amber-300 text-2xl font-mono font-bold">{timeRemaining}</p><p className="text-white/40 text-xs">Time Remaining</p></CardContent>
            </Card>
          )}

          {event.status === 'upcoming' && upcomingCountdown && (
            <Card className="border-yellow-500/30 bg-yellow-950/20"><CardContent className="p-4 text-center"><p className="text-yellow-400 text-2xl font-mono">{upcomingCountdown}</p><p className="text-white/50 text-xs">Starts In</p></CardContent></Card>
          )}

          {/* info card */}
          <Card className="border-white/10 bg-black/40">
            <CardContent className="p-4 space-y-3">
              {isEditing ? (
                <>
                  <div><Label className="text-white/70">Locations</Label>{editLocations.map((loc,idx)=> <div key={idx} className="flex items-center gap-1 mt-1"><Input value={loc} onChange={e=>updateEditLocation(idx, e.target.value)} className="bg-stone-900"/><Button size="icon" variant="ghost" onClick={()=>deleteEditLocation(idx)}><Trash2 className="h-3 w-3"/></Button></div>)}<div className="flex gap-1 mt-2"><Input placeholder="Add location" value={editNewLocation} onChange={e=>setEditNewLocation(e.target.value)}/><Button onClick={addEditLocation}><Plus /></Button></div></div>
                  <div><Label>Scheduled start</Label><Input type="datetime-local" value={editScheduledStartAt?.toISOString().slice(0,16) || ''} onChange={e=>setEditScheduledStartAt(e.target.value ? new Date(e.target.value) : null)} /></div>
                  <div><Label>Duration (hours)</Label><Input type="number" value={editDurationHours} onChange={e=>setEditDurationHours(e.target.value)} /></div>
                  <Button onClick={saveEdit} disabled={isUpdating} className="w-full bg-amber-600 hover:bg-amber-500"><Save className="mr-2 h-4 w-4"/> Save</Button>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-white/50 flex gap-2"><Users className="h-4 w-4"/> Participants</span><span className="text-white font-semibold">{users.length}</span></div>
                  {event.locations && event.locations.length > 0 && <div className="flex justify-between"><span className="text-white/50 flex gap-2"><MapPin className="h-4 w-4"/> Locations</span><span className="text-white text-sm">{event.locations.join(', ')}</span></div>}
                  {event.scheduled_start_at && <div className="flex justify-between"><span className="text-white/50 flex gap-2"><CalendarDays className="h-4 w-4"/> Starts</span><span className="text-white text-sm">{new Date(event.scheduled_start_at).toLocaleString()}</span></div>}
                  <div className="flex justify-between"><span className="text-white/50 flex gap-2"><Clock className="h-4 w-4"/> Duration</span><span className="text-white">{event.duration_hours} hours</span></div>
                </>
              )}
            </CardContent>
          </Card>

          {event.status === 'live' && <Button variant="outline" className="w-full border-amber-500/50 text-amber-300" onClick={()=>router.push(`/admin/event/${event.id}/host-setup`)}><Users className="mr-2"/> SET UP HOST EVENT</Button>}
          {event.status === 'ended' && <Button className="w-full bg-amber-600" onClick={startEvent} disabled={isUpdating}><Play className="mr-2"/> Restart Event</Button>}

          {users.length > 0 && (
            <section><h2 className="text-white font-semibold mb-2">Participants</h2>
              {users.map(user => (
                <Card key={user.id} className="bg-black/40 border-white/10 mb-2"><CardContent className="p-3 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-amber-800/40 flex items-center justify-center">{user.selfie_url ? <img src={user.selfie_url} className="rounded-full object-cover w-full h-full"/> : <span className="text-white text-xs">{user.username?.slice(0,2)}</span>}</div><div className="flex-1"><p className="text-white text-sm">{user.username}</p><p className="text-amber-400/70 text-[10px]">{user.vibe_key}</p></div>{user.is_vip && <Crown className="h-4 w-4 text-amber-400"/>}<Button variant="ghost" size="sm" onClick={()=>toggleVip(user)} className="text-amber-400 text-xs">{user.is_vip ? 'Remove VIP' : 'Make VIP'}</Button></CardContent></Card>
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}