'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { Zap, ArrowRight, ArrowLeft, RefreshCw, UserCheck } from 'lucide-react'
import { getLocalSession, setLocalSession } from '@/lib/utils/session'
import { generateUsername } from '@/lib/utils/generate-username'
import { generateVibeKey } from '@/lib/utils/generate-vibe-key'
import { generateSessionToken } from '@/lib/utils/generate-session-token'
import { SelfieCapture } from '@/components/join/selfie-capture'
import Link from 'next/link'
import type { Event, UserSession } from '@/lib/types'

type Step = 'code' | 'identity' | 'selfie'

export function JoinFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code') || ''
  
  const [step, setStep] = useState<Step>('code')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Event data
  const [eventCode, setEventCode] = useState(initialCode)
  const [event, setEvent] = useState<Event | null>(null)
  
  // User data
  const [username, setUsername] = useState('')
  const [vibeKey, setVibeKey] = useState('')
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null)
  
  // Rejoin form
  const [rejoinUsername, setRejoinUsername] = useState('')
  const [rejoinVibeKey, setRejoinVibeKey] = useState('')

  // Check for existing session
  useEffect(() => {
    const session = getLocalSession()
    if (session && initialCode) {
      // If they have a session for this event, go to show
      router.push(`/show/${session.eventId}`)
    }
  }, [initialCode, router])

  // Auto-validate code from URL
  useEffect(() => {
    if (initialCode && !event) {
      validateCode(initialCode)
    }
  }, [initialCode])

  async function validateCode(code: string) {
    setIsLoading(true)
    setError(null)
    
    const supabase = createClient()
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_code', code.toUpperCase())
      .single()

    if (error || !event) {
      setError('Event not found. Check the code and try again.')
      setIsLoading(false)
      return
    }

    if (event.status === 'ended') {
      setError('This event has ended.')
      setIsLoading(false)
      return
    }

    setEvent(event)
    
    // Generate new identity
    setUsername(generateUsername())
    setVibeKey(generateVibeKey())
    
    setStep('identity')
    setIsLoading(false)
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (eventCode.trim()) {
      validateCode(eventCode.trim())
    }
  }

  function regenerateIdentity() {
    setUsername(generateUsername())
    setVibeKey(generateVibeKey())
  }

  async function handleRejoin(e: React.FormEvent) {
    e.preventDefault()
    if (!event) return
    
    setIsLoading(true)
    setError(null)
    
    const supabase = createClient()
    const { data: existingUser, error } = await supabase
      .from('event_users')
      .select('*')
      .eq('event_id', event.id)
      .eq('username', rejoinUsername.trim())
      .eq('vibe_key', rejoinVibeKey.trim().toUpperCase())
      .single()

    if (error || !existingUser) {
      setError('No matching user found. Check your username and vibe key.')
      setIsLoading(false)
      return
    }

    // Restore session
    const session: UserSession = {
      eventUserId: existingUser.id,
      eventId: event.id,
      username: existingUser.username,
      vibeKey: existingUser.vibe_key,
      sessionToken: existingUser.session_token,
      selfieUrl: existingUser.selfie_url,
      isUpgraded: existingUser.is_upgraded,
    }
    setLocalSession(session)
    
    router.push(`/show/${event.id}`)
  }

  function proceedToSelfie() {
    setStep('selfie')
  }

  async function handleSelfieComplete(blob: Blob | null) {
    if (!event) return
    
    setIsLoading(true)
    setSelfieBlob(blob)

    try {
      let selfieUrl = null

      // Upload selfie if provided
      if (blob) {
        const formData = new FormData()
        formData.append('file', blob, 'selfie.jpg')
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const { pathname } = await uploadRes.json()
          selfieUrl = `/api/file?pathname=${encodeURIComponent(pathname)}`
        } else {
          console.warn(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
        }
      }

      // Create user
      const sessionToken = generateSessionToken()
      const supabase = createClient()
      
      const { data: newUser, error } = await supabase
        .from('event_users')
        .insert({
          event_id: event.id,
          username,
          vibe_key: vibeKey,
          selfie_url: selfieUrl,
          session_token: sessionToken,
          is_upgraded: false,
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Save session
      const session: UserSession = {
        eventUserId: newUser.id,
        eventId: event.id,
        username: newUser.username,
        vibeKey: newUser.vibe_key,
        sessionToken: newUser.session_token,
        selfieUrl: newUser.selfie_url,
        isUpgraded: false,
      }
      setLocalSession(session)

      // Navigate to show
      router.push(`/show/${event.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  // Render steps
  if (step === 'code') {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Join Event</h1>
          </div>

          {/* Code Entry */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-foreground">Enter Event Code</CardTitle>
              <CardDescription>
                Enter the code displayed at your event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <Input
                  placeholder="LNK-XXX-000"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="text-center font-mono text-lg uppercase bg-input tracking-wider"
                  maxLength={11}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !eventCode.trim()}>
                  {isLoading ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Continue
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <Link href="/">
              <Button variant="ghost" className="text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (step === 'identity') {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Event Info */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">Joining</p>
            <h1 className="text-2xl font-bold text-foreground">{event?.show_name}</h1>
            <p className="text-sm font-mono text-primary">{event?.event_code}</p>
          </div>

          {/* Identity Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Your Identity</CardTitle>
              <CardDescription>
                This is your temporary identity for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="new">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="new">New User</TabsTrigger>
                  <TabsTrigger value="rejoin">Rejoin</TabsTrigger>
                </TabsList>

                <TabsContent value="new" className="space-y-4">
                  {/* Generated Identity */}
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Username</Label>
                      <span className="font-semibold text-foreground">{username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Vibe Key</Label>
                      <span className="font-mono text-primary font-semibold">{vibeKey}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={regenerateIdentity}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Identity
                  </Button>

                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-accent">Save your vibe key!</strong>
                      <br />
                      You&apos;ll need it to rejoin on another device.
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive text-center">{error}</p>
                  )}

                  <Button onClick={proceedToSelfie} className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Continue to Selfie
                  </Button>
                </TabsContent>

                <TabsContent value="rejoin" className="space-y-4">
                  <form onSubmit={handleRejoin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rejoin-username">Username</Label>
                      <Input
                        id="rejoin-username"
                        placeholder="Your previous username"
                        value={rejoinUsername}
                        onChange={(e) => setRejoinUsername(e.target.value)}
                        className="bg-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rejoin-vibe">Vibe Key</Label>
                      <Input
                        id="rejoin-vibe"
                        placeholder="XXX-XXX"
                        value={rejoinVibeKey}
                        onChange={(e) => setRejoinVibeKey(e.target.value.toUpperCase())}
                        className="font-mono uppercase bg-input"
                        maxLength={7}
                      />
                    </div>

                    {error && (
                      <p className="text-sm text-destructive text-center">{error}</p>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <Spinner className="mr-2" />
                      ) : (
                        <UserCheck className="mr-2 h-4 w-4" />
                      )}
                      Rejoin Event
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep('code')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (step === 'selfie') {
    return (
      <SelfieCapture
        username={username}
        onCapture={handleSelfieComplete}
        onBack={() => setStep('identity')}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  return null
}
