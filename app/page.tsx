'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { QrCode, Users, CameraIcon, ArrowRight, X, Scan, Clock, MapPin } from 'lucide-react'
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
  const [liveEvents, setLiveEvents] = useState<Event[]>([])
  const [showQrModal, setShowQrModal] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  useEffect(() => {
    // Check if user has existing session
    const session = getLocalSession()
    if (session) {
      setHasSession(true)
    }

    // Load all live events
    async function loadLiveEvents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'live')
        .gte('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      setLiveEvents(data || [])
      setIsLoadingEvents(false)
    }

    loadLiveEvents()
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

  const joinEvent = (eventCode: string) => {
    router.push(`/join?code=${eventCode}`)
    setShowQrModal(false)
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
                disabled={liveEvents.length === 0 || isLoadingEvents}
              >
                <Scan className="w-6 h-6 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  {isLoadingEvents ? 'Loading...' : `${liveEvents.length} Live`}
                </span>
              </Button>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50">
                <CameraIcon className="w-6 h-6 text-accent" />
                <span className="text-xs text-muted-foreground">Take Selfie</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card/50 border border-border/50">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-xs text-muted-foreground">Meet People</span>
              </div>
            </div>

            {/* QR Modal - All Live Events */}
            {showQrModal && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                  <Card className="border-primary/50 bg-card/95 backdrop-blur-2xl border-2 shadow-2xl w-full">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <QrCode className="h-6 w-6" />
                          Live Events ({liveEvents.length})
                        </CardTitle>
                        <CardDescription>Scan any QR to join</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowQrModal(false)}
                        className="hover:bg-card"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                        {liveEvents.map((event) => (
                          <Card 
                            key={event.id} 
                            className="border-border/50 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group hover:scale-[1.02]"
                            onClick={() => joinEvent(event.event_code)}
                          >
                            <CardHeader className="pb-3 px-4 pt-4">
                              <CardTitle className="text-base font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                {event.show_name}
                              </CardTitle>
                              <CardDescription className="font-mono text-xs uppercase tracking-wider text-primary truncate">
                                {event.event_code}
                              </CardDescription>
                              {event.locations && event.locations.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 px-1">
                                  <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {event.locations.join(', ')}
                                  </span>
                                </div>
                              )}
                            </CardHeader>
                            <CardContent className="p-4 flex items-center justify-center">
                              <div className="bg-white/90 p-3 rounded-xl shadow-md group-hover:shadow-primary/25 transition-all">
                                <QRCodeCanvas
                                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${event.event_code}`}
                                  size={120}
                                  level="H"
                                  includeMargin={false}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
