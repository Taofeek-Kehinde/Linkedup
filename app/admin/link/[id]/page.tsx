'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { ArrowLeft, Link as LinkIcon, Copy, Check, Users, ExternalLink, Clock } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import type { Event } from '@/lib/types'
import { useToast } from '@/components/ui/use-toast'

export default function LinkDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

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

      setEvent(eventData)
      setIsLoading(false)
    }

    loadEvent()
  }, [id, router])

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
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const joinUrl = event
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${event.event_code}`
    : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
      toast({
        title: 'Copied!',
        description: 'Link copied to clipboard.'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy link.',
        variant: 'destructive'
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Event Created!</h1>
            <p className="text-sm text-muted-foreground">Share the link to let people join</p>
          </div>
        </div>

        {/* Link Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 text-foreground">
              <LinkIcon className="h-5 w-5 text-primary" />
              Share this link
            </CardTitle>
            <CardDescription>
              Anyone with this link can join your event instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Event Name */}
            <div className="w-full text-center">
              <h2 className="text-xl font-bold text-foreground">{event.show_name}</h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">{event.event_code}</p>
            </div>

            {/* Timer */}
            {timeRemaining && timeRemaining !== 'Event ended' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Time remaining: <strong className="text-foreground font-mono">{timeRemaining}</strong></span>
              </div>
            )}

            {/* Link Box */}
            <div className="w-full bg-muted/50 border rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Join Link</p>
              <p className="text-sm text-primary break-all font-mono">{joinUrl}</p>
            </div>

            {/* Copy Button */}
            <Button onClick={copyLink} className="w-full" size="lg">
              {copied ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <Button
              variant="default"
              className="w-full"
              size="lg"
              onClick={() => router.push(`/admin/event/${event.id}`)}
            >
              <Users className="mr-2 h-5 w-5" />
              Event Dashboard
            </Button>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => router.push(`/admin/event/${event.id}/host-setup`)}
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              Host Setup
            </Button>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">How it works:</strong>
              <br />
              Share the link above with anyone you want to join. They&apos;ll enter the event and can start connecting instantly — no QR code needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

