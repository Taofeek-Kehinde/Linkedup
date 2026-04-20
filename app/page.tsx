'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QrCode, Users, CameraIcon, ArrowRight, Scan, X } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import type { Event } from '@/lib/types'
import { getLocalSession } from '@/lib/utils/session'
import Link from 'next/link'
import { Dancing_Script } from 'next/font/google';

const dancing = Dancing_Script({
  subsets: ['latin'],
  weight: ['700'],
});

export default function HomePage() {
  const router = useRouter()
  const [eventCode, setEventCode] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const [liveEvent, setLiveEvent] = useState<Event | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)
  const [isLoadingEvent, setIsLoadingEvent] = useState(false)

  useEffect(() => {
    // Check if user has existing session
    const session = getLocalSession()
    if (session) {
      setHasSession(true)
    }
  }, [])

  useEffect(() => {
    async function loadLiveEvent() {
      setIsLoadingEvent(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoadingEvent(false)
        return
      }

      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'live')
        .single()

      setLiveEvent(event || null)
      setIsLoadingEvent(false)
    }

    loadLiveEvent()
  }, [])

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (eventCode.trim()) {
      router.push(`/join?code=${eventCode.trim().toUpperCase()}`)
    }
  }

  function handleResume() {
    const session = getLocalSession()
    if (session) {
      router.push(`/show/${session.eventId}`)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="hero-bg-1 absolute inset-0 bg-cover bg-center bg-no-repeat" />
        <div className="hero-bg-2 absolute inset-0 bg-cover bg-center bg-no-repeat" />
        <div className="hero-bg-3 absolute inset-0 bg-cover bg-center bg-no-repeat" />
        <div className="absolute inset-0 bg-black/70 z-10" />
      </div>
      <div className="relative z-20 flex flex-col min-h-dvh">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="space-y-6 max-w-4xl mx-auto bg-card/90 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-black/50 p-8">

            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
                <div className="relative w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 overflow-hidden drop-shadow-lg">
                  <Image
                    src="/logo.png"
                    alt="LinkedUp"
                    fill
                    loading="eager"
                    className="object-contain p-2 animate-pulse hover:animate-spin transition-all duration-300 hover:scale-110"
                  />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                PEEP <br />
                <span className={`${dancing.className} font-normal`}>
                  or PASS
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">see who is in</p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="ghost"
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50 h-auto hover:bg-card hover:border-primary data-[state=open]:bg-transparent"
                onClick={() => setShowQrModal(true)}
                size="sm"
              >
                <Scan className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">Scan QR</span>
              </Button>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50">
                <CameraIcon className="w-6 h-6 text-accent" />
                <span className="text-xs text-muted-foreground">Take Selfie</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50">
                {/* <MessageCircle className="w-6 h-6 text-primary" /> */}
                <Users className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">Meet People</span>
              </div>
            </div>

            {/* QR Modal */}
            {showQrModal && liveEvent && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-sm border-primary/30 bg-card/90 backdrop-blur-xl">
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="flex items-center justify-center gap-2 text-foreground">
                      <QrCode className="h-5 w-5 text-primary" />
                      {liveEvent.show_name}
                    </CardTitle>
                    <CardDescription className="font-mono text-primary">{liveEvent.event_code}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 p-6">
                    <div className="bg-white p-6 rounded-xl shadow-2xl">
                      <QRCodeCanvas
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${liveEvent.event_code}`}
                        size={220}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowQrModal(false)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Resume Session */}
            {hasSession && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    You have an active session
                  </p>
                  <Button onClick={handleResume} className="w-full">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Resume Session
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Join Form */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 space-y-4">
                <form onSubmit={handleJoin} className="space-y-3">
                  <div className="relative">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Enter event code (e.g., LNK-ABC-123)"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                      className="pl-10 bg-input font-mono uppercase"
                      maxLength={11}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!eventCode.trim()}>
                    Join Event
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or scan QR code at event</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        {/* Footer */}
        <footer className="p-6 text-center space-y-3 relative z-20">
          <Link href="/admin">
            <Button variant="ghost" className="text-muted-foreground">
              Host an event
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground/60">
            Built for real connections at real events
          </p>
        </footer>
      </div>
    </main>
  )
}

