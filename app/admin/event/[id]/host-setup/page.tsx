'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Camera, RotateCcw, Check, ArrowLeft } from 'lucide-react'
import type { Event } from '@/lib/types'

export default function HostSetupPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hostName, setHostName] = useState('')
  const [hostLocation, setHostLocation] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

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
      setHostName(eventData.show_name || '')
      setHostLocation(eventData.host_location || '')
      setIsLoading(false)
    }

    loadEvent()
  }, [id, router])

  async function startCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    try {
      setCameraError(null)
      setCameraReady(false)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        // Wait for video dimensions
        await new Promise<void>((resolve) => {
          const check = () => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              resolve()
            } else {
              setTimeout(check, 100)
            }
          }
          check()
        })
        setCameraReady(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Could not access camera. Please allow camera access and try again.')
      setCameraReady(false)
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }

  useEffect(() => {
    if (!isLoading && !capturedImage) {
      startCamera()
    }
    return () => stopCamera()
  }, [isLoading])

  useEffect(() => {
    if (!isLoading && !capturedImage) {
      startCamera()
    }
  }, [facingMode])

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return

    const size = Math.min(w, h)
    canvas.width = size
    canvas.height = size

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const offsetX = (w - size) / 2
    const offsetY = (h - size) / 2

    if (facingMode === 'user') {
      ctx.translate(size, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size)
    } else {
      ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size)
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)

    canvas.toBlob((blob) => {
      if (blob) setSelfieBlob(blob)
    }, 'image/jpeg', 0.8)

    stopCamera()
  }

  function retakePhoto() {
    setCapturedImage(null)
    setSelfieBlob(null)
    startCamera()
  }

  function toggleCamera() {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  async function uploadSelfie(blob: Blob): Promise<string | null> {
    if (!event) return null
    const formData = new FormData()
    formData.append('file', blob, 'host-selfie.jpg')
    formData.append('eventId', event.id)
    formData.append('username', 'host')

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) return null
      const data = await res.json()
      return data.pathname || null
    } catch {
      return null
    }
  }

  async function handleStartPeeping() {
    if (!event) return
    setIsSaving(true)
    setError(null)

    let selfiePath = event.host_selfie_url
    if (selfieBlob) {
      const uploaded = await uploadSelfie(selfieBlob)
      if (uploaded) selfiePath = uploaded
    }

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('events')
      .update({
        host_name: hostName.trim() || null,
        host_location: hostLocation || null,
        host_selfie_url: selfiePath,
      })
      .eq('id', event.id)

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    if (event.status !== 'live') {
      const endTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('events')
        .update({
          status: 'live',
          starts_at: new Date().toISOString(),
          ends_at: endTime,
        })
        .eq('id', event.id)
    }

    router.push(`/show/${event.id}`)
  }

  if (isLoading || !event) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  const showCamera = !capturedImage && !cameraError

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            PEEP <span className="font-normal">or PASS</span>
          </h1>
          <p className="text-sm text-muted-foreground">see who is in</p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black">
              {showCamera && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
              {capturedImage && (
                <img src={capturedImage} alt="Captured selfie" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <Button variant="outline" className="mt-4" onClick={startCamera}>Try Again</Button>
                </div>
              )}
              {showCamera && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Spinner className="w-8 h-8" />
                </div>
              )}
              {showCamera && cameraReady && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <Button size="icon" variant="secondary" className="rounded-full w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20" onClick={toggleCamera}>
                      <RotateCcw className="w-5 h-5 text-white" />
                    </Button>
                    <Button size="icon" className="rounded-full w-16 h-16 bg-white hover:bg-white/90" onClick={capturePhoto}>
                      <Camera className="w-7 h-7 text-black" />
                    </Button>
                    <div className="w-12 h-12" />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <canvas ref={canvasRef} className="hidden" />

        {capturedImage && (
          <Button variant="outline" className="w-full" onClick={retakePhoto}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake Selfie
          </Button>
        )}

        <div className="space-y-4">
          {event.locations && event.locations.length > 0 && (
            <div className="space-y-2">
              <Label>Your Location</Label>
              <Select value={hostLocation} onValueChange={setHostLocation}>
              <SelectTrigger className="bg-input w-full">
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent>
                  {event.locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <Button className="w-full" size="lg" onClick={handleStartPeeping} disabled={isSaving}>
          {isSaving ? (
            <Spinner className="mr-2" />
          ) : (
            <Check className="mr-2 h-5 w-5" />
          )}
          START PEEPING
        </Button>

        <div className="text-center">
          <Button variant="ghost" className="text-muted-foreground" onClick={() => router.push(`/admin/event/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Button>
        </div>
      </div>
    </main>
  )
}

