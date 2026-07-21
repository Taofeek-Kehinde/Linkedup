'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Camera, ArrowLeft, RotateCcw, Check, Video, VideoOff } from 'lucide-react'

const RECORD_DURATION = 3 // seconds

interface SelfieCaptureProps {
  username: string
  onCapture: (blob: Blob | null) => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function SelfieCapture({ username, onCapture, onBack, isLoading, error }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState(RECORD_DURATION)
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const startCamera = useCallback(async () => {
    if (streamRef.current) return

    try {
      setCameraError(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: true,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
        setCameraActive(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setCameraError('Could not access camera. Please allow camera access and try again.')
      setCameraActive(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  function startRecording() {
    if (!streamRef.current || !videoRef.current) return

    chunksRef.current = []
    setCountdown(RECORD_DURATION)
    setIsRecording(true)

    // Use webm for broad browser support
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm'

    const recorder = new MediaRecorder(streamRef.current, { mimeType })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setCapturedVideoUrl(url)
      setIsRecording(false)
      stopCamera()
    }

    recorder.start(100) // collect data every 100ms

    // Countdown timer
    let remaining = RECORD_DURATION
    timerRef.current = setInterval(() => {
      remaining--
      setCountdown(remaining)
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }
    }, 1000)
  }

  function retakeVideo() {
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl)
    }
    setCapturedVideoUrl(null)
    setCountdown(RECORD_DURATION)
    startCamera()
  }

  function confirmVideo() {
    if (!capturedVideoUrl) return

    // Get the blob from the video element or recreate from chunks
    // We stored chunks in chunksRef - use those to create the final blob
    if (chunksRef.current.length === 0) return

    const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm'
    const finalBlob = new Blob(chunksRef.current, { type: mimeType })
    onCapture(finalBlob)
  }

  function toggleCamera() {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (!capturedVideoUrl) {
      startCamera()
    }
  }, [facingMode, capturedVideoUrl, startCamera])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (capturedVideoUrl) URL.revokeObjectURL(capturedVideoUrl)
    }
  }, [capturedVideoUrl])

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Record a 3s Clip</h1>
          <p className="text-sm text-muted-foreground">
            Introduce yourself, <span className="text-primary">{username}</span>
          </p>
        </div>

        {/* Camera Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black">
              {/* Live camera preview */}
              {!capturedVideoUrl && !isRecording && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
              
              {/* Live camera preview DURING recording */}
              {!capturedVideoUrl && isRecording && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
              )}
              
              {/* Captured video preview */}
              {capturedVideoUrl && (
                <video
                  ref={previewVideoRef}
                  src={capturedVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Recording countdown overlay */}
              {isRecording && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="bg-red-600 text-white text-lg font-bold px-5 py-2 rounded-full animate-pulse">
                    Recording... {countdown}s
                  </div>
                </div>
              )}

              {/* Recording red dot */}
              {isRecording && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                </div>
              )}

              {/* Camera error */}
              {cameraError && !capturedVideoUrl && !isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <Button variant="outline" className="mt-4" onClick={startCamera}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Camera loading */}
              {!cameraActive && !cameraError && !capturedVideoUrl && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="w-8 h-8" />
                </div>
              )}

              {/* Face guide overlay */}
              {cameraActive && !capturedVideoUrl && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                </div>
              )}

              {/* Camera controls - only when not recording and no captured video */}
              {cameraActive && !capturedVideoUrl && !isRecording && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={toggleCamera}
                  >
                    <RotateCcw className="w-5 h-5 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    onClick={startRecording}
                  >
                    <Video className="w-7 h-7 text-white" />
                  </Button>
                  <div className="w-12 h-12" /> {/* Spacer */}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {capturedVideoUrl ? (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={retakeVideo} disabled={isLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={confirmVideo} disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="mr-2" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Use Video
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            {!isRecording && (
              <p className="text-sm text-muted-foreground text-center">
                Record a 3-second video to continue
              </p>
            )}
          </div>
        )}

        {/* Back button */}
        <div className="text-center">
          <Button variant="ghost" className="text-muted-foreground" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    </main>
  )
}
