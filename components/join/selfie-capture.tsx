'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Camera, ArrowLeft, RotateCcw, Check, Video, Clock3, Link2 } from 'lucide-react'

const RECORD_DURATION = 3 // seconds

interface SelfieCaptureProps {
  variant?: 'default' | 'peep'
  username?: string
  onCapture: (blob: Blob | null) => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function SelfieCapture({ variant = 'default', username, onCapture, onBack, isLoading, error }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [countdown, setCountdown] = useState(RECORD_DURATION)
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const startCamera = useCallback(async () => {
    if (streamRef.current) return

    try {
      setCameraError(null)
      const videoConstraints: MediaTrackConstraints = variant === 'peep'
        ? {
            facingMode,
            width: { ideal: 480, max: 480 },
            height: { ideal: 480, max: 480 },
            frameRate: { ideal: 20, max: 24 },
          }
        : {
            facingMode,
            width: { ideal: 640 },
            height: { ideal: 640 },
          }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
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
  }, [facingMode, variant])

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
    setRecordingError(null)

    const supportedTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4',
    ]
    const recorderOptions: MediaRecorderOptions = {}
    if (variant === 'peep') {
      recorderOptions.videoBitsPerSecond = 250_000
      recorderOptions.audioBitsPerSecond = 32_000
    }

    let recorder: MediaRecorder | null = null
    let recorderError: unknown
    for (const type of supportedTypes) {
      if (!MediaRecorder.isTypeSupported(type)) continue
      try {
        recorder = new MediaRecorder(streamRef.current, { ...recorderOptions, mimeType: type })
        break
      } catch (error) {
        recorderError = error
      }
    }
    if (!recorder) {
      try {
        recorder = new MediaRecorder(streamRef.current, recorderOptions)
      } catch (error) {
        console.error('Could not create a media recorder:', recorderError ?? error)
        setRecordingError('This browser cannot record video with audio. Try another browser or device.')
        return
      }
    }

    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || chunksRef.current[0]?.type || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      setCapturedVideoUrl(url)
      setIsRecording(false)
      stopCamera()
    }

    try {
      recorder.start(100)
    } catch (error) {
      console.error('Could not start media recording:', error)
      setRecordingError('Could not start recording. Please try again or use another browser.')
      return
    }
    setIsRecording(true)

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

    const mimeType = mediaRecorderRef.current?.mimeType || chunksRef.current[0]?.type || 'video/webm'
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
    <main className={variant === 'peep'
      ? 'relative flex h-dvh min-h-dvh flex-col items-center overflow-hidden bg-zinc-950 text-white'
      : 'min-h-dvh flex flex-col items-center justify-center p-4'}
    >
      {variant === 'peep' && (
        <>
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
        </>
      )}
      <div className={`relative z-10 w-full ${variant === 'peep'
        ? 'flex h-full min-h-0 max-w-none flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-8'
        : 'max-w-md space-y-6'}`}
      >
        {variant === 'peep' && (
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="group flex min-h-11 w-fit items-center gap-2 rounded-full px-4 text-zinc-400 transition-all duration-200 hover:-translate-x-0.5 hover:bg-white/5 hover:text-white active:scale-95 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 motion-reduce:transition-none" />
            Back to home
          </Button>
        )}
        {/* Header */}
        <div className={`text-center ${variant === 'peep' ? 'space-y-1.5' : 'space-y-3'}`}>
          {variant === 'peep' && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10">
              <Video className="h-4 w-4 text-red-400" />
            </div>
          )}
          <h1 className={`font-semibold tracking-tight ${variant === 'peep' ? 'text-3xl sm:text-4xl' : 'text-2xl text-foreground'}`}>
            {variant === 'peep' ? 'Create a Peep' : 'Record a 3s Clip'}
          </h1>
          <p className={`text-sm ${variant === 'peep' ? 'text-zinc-400' : 'text-muted-foreground'}`}>
            {username
              ? <>Introduce yourself, <span className="text-primary">{username}</span></>
              : 'Record a quick selfie video, then share it with anyone.'}
          </p>
          {variant === 'peep' && (
            <div className="mx-auto flex max-w-sm items-center justify-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-red-400" />3 seconds</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Video className="h-3.5 w-3.5 text-red-400" />Loops on replay</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-red-400" />3 hours</span>
            </div>
          )}
        </div>

        {/* Camera Card */}
        <Card className={variant === 'peep'
          ? 'flex min-h-0 flex-1 flex-col border-0 bg-transparent text-white shadow-none'
          : 'border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden'}
        >
          <CardContent className={variant === 'peep'
            ? 'flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-0'
            : 'p-0'}
          >
            <div className={variant === 'peep'
              ? 'relative h-[min(92vw,58dvh,640px)] w-[min(92vw,58dvh,640px)] shrink-0 overflow-hidden rounded-full border border-emerald-500/50 bg-black shadow-[0_0_60px_rgba(0,168,132,0.12)]'
              : 'relative aspect-square bg-black'}
            >
{/* Live camera preview (before and during recording - single element to preserve stream) */}
              {!capturedVideoUrl && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`${variant === 'peep'
                    ? 'absolute inset-0 h-full w-full rounded-full object-cover'
                    : 'absolute inset-0 h-full w-full object-cover'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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
                  className={variant === 'peep'
                    ? 'absolute inset-0 h-full w-full rounded-full object-cover'
                    : 'absolute inset-0 h-full w-full object-cover'}
                />
              )}

              {variant === 'peep' && (
                <div className="pointer-events-none absolute inset-0">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(0, 168, 132, 0.35)" strokeWidth="1.5" />
                    <circle
                      cx="50"
                      cy="50"
                      r="48"
                      fill="none"
                      stroke="#00a884"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeDasharray="301.6"
                      strokeDashoffset={capturedVideoUrl ? 0 : 301.6}
                      className={isRecording ? 'peep-record-progress' : ''}
                    />
                  </svg>
                </div>
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
              {isRecording && variant !== 'peep' && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                </div>
              )}

              {/* Camera error */}
              {cameraError && !capturedVideoUrl && !isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <Button variant="outline" className={`mt-4 ${variant === 'peep' ? 'border-white/15 bg-white/5 text-white hover:bg-white/10' : ''}`} onClick={startCamera}>
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
              {variant !== 'peep' && cameraActive && !capturedVideoUrl && !isRecording && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                </div>
              )}

              {/* Camera controls - only when not recording and no captured video */}
              {variant !== 'peep' && cameraActive && !capturedVideoUrl && !isRecording && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20"
                    onClick={toggleCamera}
                  >
                    <RotateCcw className="w-5 h-5 text-white" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                    onClick={startRecording}
                  >
                    <Video className="w-7 h-7 text-white" />
                  </Button>
                  <div className="w-12 h-12" /> {/* Spacer */}
                </div>
              )}
            </div>
            {variant === 'peep' && cameraActive && !capturedVideoUrl && !isRecording && (
              <div className="flex items-center justify-center gap-5">
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Switch camera"
                  className="h-11 w-11 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={toggleCamera}
                >
                  <RotateCcw className="h-5 w-5 text-white" />
                </Button>
                <Button
                  size="icon"
                  aria-label="Start recording"
                  className="h-14 w-14 rounded-full bg-red-500 shadow-lg shadow-red-950/50 ring-4 ring-red-500/15 hover:bg-red-600"
                  onClick={startRecording}
                >
                  <Video className="h-6 w-6 text-white" />
                </Button>
                <div className="h-11 w-11" aria-hidden="true" />
              </div>
            )}
            {variant === 'peep' && recordingError && (
              <p className="max-w-sm text-center text-sm text-red-300" role="alert">{recordingError}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {capturedVideoUrl ? (
          <div className="space-y-3">
            {error && (
              <p className={`text-center text-sm ${variant === 'peep' ? 'text-red-300' : 'text-destructive'}`} role="alert">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={retakeVideo} disabled={isLoading} className={variant === 'peep' ? 'border-white/10 bg-white/5 text-white hover:bg-white/10' : ''}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={confirmVideo} disabled={isLoading} className={variant === 'peep' ? 'bg-red-600 text-white hover:bg-red-500' : ''}>
                {isLoading ? (
                  <Spinner className="mr-2" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                {variant === 'peep' ? 'Publish Peep' : 'Use Video'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <p className={`text-center text-sm ${variant === 'peep' ? 'text-red-300' : 'text-destructive'}`} role="alert">{error}</p>
            )}
            {!isRecording && (
              <p className={`text-center text-sm ${variant === 'peep' ? 'text-zinc-500' : 'text-muted-foreground'}`}>
                {variant === 'peep' ? 'Tap the red button when you are ready to record.' : 'Record a 3-second video to continue'}
              </p>
            )}
          </div>
        )}

        {/* Back button */}
        {variant !== 'peep' && <div className="text-center">
          <Button variant="ghost" className="text-muted-foreground" onClick={onBack} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>}
        {variant === 'peep' && (
          <div className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
            <Link2 className="h-3.5 w-3.5" />
            Publish to get a private link that expires after 3 hours.
          </div>
        )}
      </div>
    </main>
  )
}
