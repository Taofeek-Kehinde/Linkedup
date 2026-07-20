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
import { ArrowLeft, Link as LinkIcon, Clock } from 'lucide-react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

export default function LinkCreateEventPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showName, setShowName] = useState('')

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
    const eventCode = generateEventCode(showName || 'LINK')
    const now = new Date()
    const endsAt = new Date(now.getTime() + 15 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_code: eventCode,
        show_name: showName.trim(),
        location: 'Online',
        locations: ['Online'],
        duration_hours: 15,
        status: 'live',
        starts_at: now.toISOString(),
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

    // Redirect to the link details page
    router.push(`/admin/link/${data.id}`)
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
            <h1 className="text-2xl font-bold text-foreground">Create Online Event</h1>
            <p className="text-sm text-muted-foreground">Get a shareable link for your event</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <LinkIcon className="h-5 w-5 text-primary" />
              Event Details
            </CardTitle>
            <CardDescription>
              Just name your event and get a link to share. The event will start immediately and run for 15 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="showName">Event Name</Label>
                <Input
                  id="showName"
                  placeholder="e.g., Friday Night Vibes"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  required
                  className="bg-input"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Duration
                </Label>
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm font-medium">15 hours (fixed)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Events last exactly 15 hours. The timer starts as soon as you create the event.
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
                  <LinkIcon className="mr-2 h-4 w-4" />
                    Create Event & Get Link
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
              <strong className="text-foreground">What you get:</strong>
              <br />
              After creating, you&apos;ll get a shareable link to send to people. They can join online and start connecting instantly — no QR scan needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

