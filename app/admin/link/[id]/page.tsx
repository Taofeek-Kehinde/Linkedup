'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  ExternalLink,
  Clock,
  Users,
  MapPin,
  Trash2,
  Crown,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import type { Event, EventUser } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

export default function LinkDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [users, setUsers] = useState<EventUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  const getOptimizedImageUrl = (url: string, size: number = 100) => {
    if (!url) return ''
    if (url.includes('supabase.co')) {
      const sep = url.includes('?') ? '&' : '?'
      return `${url}${sep}width=${size}&height=${size}&resize=cover&quality=90`
    }
    return url
  }

  const handleImageError = (userId: string) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }))
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
          expired = new Date(eventData.created_at).getTime() + (15 * 60 * 60 * 1000) < nowTime
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
      .channel(`link-event-users-${id}`)
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
    return () => { supabase.removeChannel(channel) }
  }, [event, id])

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
        setTimeRemaining('Event ended')
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

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const joinUrl = event
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${event.event_code}`
    : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Copied!', description: 'Link copied to clipboard.' })
    } catch {
      toast({ title: 'Error', description: 'Failed to copy link.', variant: 'destructive' })
    }
  }

  async function toggleVip(userItem: EventUser) {
    const supabase = createClient()
    const { error } = await supabase
      .from('event_users')
      .update({ is_vip: !userItem.is_vip })
      .eq('id', userItem.id)
    if (!error) {
      setUsers(users.map(u => u.id === userItem.id ? { ...u, is_vip: !u.is_vip } : u))
      toast({
        title: 'Success',
        description: `${userItem.username} ${!userItem.is_vip ? 'is now a VIP' : 'is no longer a VIP'}`
      })
    }
  }

  if (isLoading || !event) {
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
          <div className="flex-1 space-y-1">
            <h1 className="text-xl font-bold text-foreground truncate">{event.show_name}</h1>
            <div className="flex items-center gap-2">
              <span className="font-mono text-primary text-sm">{event.event_code}</span>
              <Badge variant={event.status === 'live' ? 'default' : 'secondary'}>
                {event.status}
              </Badge>
              <span className="text-xs text-muted-foreground">({users.length} joined)</span>
            </div>
</div>
        </div>

        {/* Link Card - Share the join link (NO QR code) */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-foreground text-base">
              <LinkIcon className="h-4 w-4 text-primary" />
              Share this link
            </CardTitle>
            <CardDescription className="text-xs">
              Send this link for people to join online — no QR scan needed
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {event.status === 'live' && timeRemaining && (
              <div className="w-full text-center">
                <p className="text-xs text-muted-foreground mb-1">Time Remaining</p>
                <p className="text-2xl font-mono font-bold text-primary">{timeRemaining}</p>
              </div>
            )}
            <div className="w-full bg-background/80 border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Join Link</p>
              <p className="text-sm text-primary break-all font-mono">{joinUrl}</p>
            </div>
            <Button onClick={copyLink} className="w-full" variant="secondary">
              {copied ? (
                <><Check className="mr-2 h-4 w-4" /> Copied!</>
              ) : (
                <><Copy className="mr-2 h-4 w-4" /> Copy Link</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Event Info */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> Participants
              </span>
              <span className="font-semibold text-foreground">{users.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> Location
              </span>
              <span className="font-semibold text-foreground">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> Duration
              </span>
              <span className="font-semibold text-foreground">{event.duration_hours} hours</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Peep & Pass button commented out */}
          {/*
          <Button variant="default" className="w-full" size="lg" onClick={async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push('/admin'); return }
            let { data: hostUser } = await supabase
              .from('event_users')
              .select('*')
              .eq('event_id', event.id)
              .eq('auth_user_id', user.id)
              .single()
            if (!hostUser) {
              const { generateVibeKey } = await import('@/lib/utils/generate-vibe-key')
              const { generateSessionToken } = await import('@/lib/utils/generate-session-token')
              const username = `host${event.show_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)}`
              const vibeKey = generateVibeKey()
              const sessionToken = generateSessionToken()
              const { data: newHost, error } = await supabase
                .from('event_users')
                .insert({
                  event_id: event.id, username, vibe_key: vibeKey, session_token: sessionToken,
                  auth_user_id: user.id, is_vip: true, is_active: true,
                })
                .select()
                .single()
              if (error || !newHost) { router.push('/admin/dashboard'); return }
              hostUser = newHost
            }
            const { setLocalSession } = await import('@/lib/utils/session')
            setLocalSession({
              eventUserId: hostUser.id, eventId: event.id, username: hostUser.username,
              vibeKey: hostUser.vibe_key, sessionToken: hostUser.session_token, selfieUrl: hostUser.selfie_url,
              isUpgraded: Boolean(hostUser.is_upgraded), isVip: Boolean(hostUser.is_vip), isActive: hostUser.is_active ?? true,
            })
            router.push(`/show/${event.id}`)
          }}>
            <Eye className="mr-2 h-5 w-5" />
            Peep &amp; Pass
          </Button>
          */}

          {/* Host Setup button commented out */}
          {/*
          <Button variant="outline" className="w-full" size="lg" onClick={() => router.push(`/admin/event/${event.id}/host-setup`)}>
            <ExternalLink className="mr-2 h-5 w-5" />
            Host Setup
          </Button>
          */}

          <Button variant="destructive" className="w-full" size="lg" disabled={isUpdating} onClick={async () => {
            const ok = window.confirm('Delete this event now? This will end the event and log everyone out.')
            if (!ok) return
            setIsUpdating(true)
            try {
              await fetch(`/api/admin/events/${event.id}/delete`, { method: 'POST' })
              router.push('/admin/dashboard')
            } finally { setIsUpdating(false) }
          }}>
            <Trash2 className="mr-2 h-5 w-5" />
            {isUpdating ? 'Deleting…' : 'Delete Event'}
          </Button>
        </div>

        {/* Participants List */}
        {users.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Participants</h2>
              <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {users.map(userItem => (
                <Card key={userItem.id} className="border-border/50 bg-card/30 hover:bg-card/50 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary/20 shadow-lg flex-shrink-0">
                      {userItem.selfie_url && !imageErrors[userItem.id] ? (
                        <Image
                          src={getOptimizedImageUrl(userItem.selfie_url, 96)}
                          alt={userItem.username}
                          fill
                          className="object-cover"
                          sizes="48px"
                          priority={false}
                          quality={90}
                          onError={() => handleImageError(userItem.id)}
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <span className="text-sm font-bold text-foreground">{userItem.username.slice(0, 2).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{userItem.username}</p>
                        {userItem.is_vip && (
                          <Badge variant="default" className="text-xs flex items-center gap-1" style={{ background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', borderColor: 'rgba(37, 99, 235, 0.3)' }}>
                            <Crown className="h-3 w-3" /> VIP
                          </Badge>
                        )}
                        {userItem.is_upgraded && !userItem.is_vip && (
                          <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">Upgraded</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{userItem.vibe_key}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => toggleVip(userItem)}
                      className={userItem.is_vip ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20' : ''}>
                      {userItem.is_vip ? 'Remove VIP' : 'Make VIP'}
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
