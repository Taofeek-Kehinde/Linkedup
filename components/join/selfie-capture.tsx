'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Camera, ArrowLeft, RotateCcw, Check, X } from 'lucide-react'

interface SelfieCaptureProps {
  username: string
  onCapture: (blob: Blob | null) => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function SelfieCapture({ username, onCapture, onBack, isLoading, error }: SelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')

  const startCamera = useCallback(async () => {
  if (streamRef.current) return // ✅ prevent duplicate starts

  try {
    setCameraError(null)

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 640 },
        height: { ideal: 640 },
      },
      audio: false,
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

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to a square crop from center
    const size = Math.min(video.videoWidth, video.videoHeight)
    canvas.width = size
    canvas.height = size

    // Calculate crop position (center)
    const offsetX = (video.videoWidth - size) / 2
    const offsetY = (video.videoHeight - size) / 2

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.scale(-1, 1)
      ctx.drawImage(video, offsetX, offsetY, size, size, -size, 0, size, size)
    } else {
      ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size)
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageDataUrl)
    stopCamera()
  }

  function retakePhoto() {
    setCapturedImage(null)
    startCamera()
  }

  function confirmPhoto() {
    if (!canvasRef.current) return
    
    canvasRef.current.toBlob((blob) => {
      onCapture(blob)
    }, 'image/jpeg', 0.8)
  }

  function skipSelfie() {
    stopCamera()
    onCapture(null)
  }

  function toggleCamera() {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  // Effect to restart camera when facing mode changes
  useEffect(() => {
    if (!capturedImage) {
      startCamera()
    }
  }, [facingMode, capturedImage, startCamera])

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Take a Selfie</h1>
          <p className="text-sm text-muted-foreground">
            Help others recognize you, <span className="text-primary">{username}</span>
          </p>
        </div>

        {/* Camera Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black">
              {/* Video preview */}
              {!capturedImage && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
              )}
              
              {/* Captured image */}
              {capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured selfie"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Camera error */}
              {cameraError && !capturedImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">{cameraError}</p>
                  <Button variant="outline" className="mt-4" onClick={startCamera}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Camera loading */}
              {!cameraActive && !cameraError && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner className="w-8 h-8" />
                </div>
              )}

              {/* Face guide overlay */}
              {cameraActive && !capturedImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/30" />
                </div>
              )}

              {/* Camera controls */}
              {cameraActive && !capturedImage && (
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
                    className="rounded-full w-16 h-16 bg-white hover:bg-white/90"
                    onClick={capturePhoto}
                  >
                    <Camera className="w-7 h-7 text-black" />
                  </Button>
                  <div className="w-12 h-12" /> {/* Spacer */}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        {capturedImage ? (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={retakePhoto} disabled={isLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button onClick={confirmPhoto} disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="mr-2" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Use Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button variant="ghost" className="w-full" onClick={skipSelfie} disabled={isLoading}>
              {isLoading ? (
                <Spinner className="mr-2" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Skip for now
            </Button>
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
