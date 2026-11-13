'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { SelfieCapture } from '@/components/join/selfie-capture'
import { PeepVideoPlayer } from '@/components/peep/peep-video-player'
import { ArrowLeft, Check, Copy, Link2, Share2, Video } from 'lucide-react'

type PeepRequestData =
  | { status: 'pending'; createdAt: string; expiresAt: string }
  | { status: 'completed'; videoUrl: string; createdAt: string; expiresAt: string }

type PeepRequestPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ respond?: string }>
}

function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function PeepRequestPage({ params, searchParams }: PeepRequestPageProps) {
  const { id } = use(params)
  const { respond } = use(searchParams)
  const router = useRouter()
  const isResponder = respond === '1'
  const [request, setRequest] = useState<PeepRequestData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/peep-requests/${id}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 410) setRequest(null)
        throw new Error(result.error || 'This Peep request is unavailable.')
      }

      const requestData = result as PeepRequestData
      setRequest(requestData)
      setTimeRemaining(new Date(requestData.expiresAt).getTime() - Date.now())
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'This Peep request is unavailable.')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadRequest()
  }, [loadRequest])

  useEffect(() => {
    if (request?.status !== 'pending') return

    const intervalId = window.setInterval(() => {
      void loadRequest()
    }, 4000)
    return () => window.clearInterval(intervalId)
  }, [loadRequest, request?.status])

  useEffect(() => {
    if (!request) return

    const intervalId = window.setInterval(() => {
      const remaining = new Date(request.expiresAt).getTime() - Date.now()
      setTimeRemaining(remaining)
      if (remaining <= 0) {
        setRequest(null)
        setError('This Peep request has expired.')
      }
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [request])

  const getResponseLink = useCallback(() => {
    return `${window.location.origin}/peep/request/${id}?respond=1`
  }, [id])

  const copyRequestLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getResponseLink())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      setError(null)
    } catch {
      setError('Could not copy the link. Please copy it from your browser address bar.')
    }
  }, [getResponseLink])

  const shareRequestLink = useCallback(async () => {
    if (!navigator.share) {
      await copyRequestLink()
      return
    }

    try {
      await navigator.share({
        title: 'Record a Peep for me',
        text: 'Record a 3-second Peep for me using this link.',
        url: getResponseLink(),
      })
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      setError('Could not share the link. You can copy it instead.')
    }
  }, [copyRequestLink, getResponseLink])

  const publishResponse = useCallback(async (blob: Blob | null) => {
    if (!blob) return

    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', blob, blob.type.includes('mp4') ? 'peep.mp4' : 'peep.webm')
      const response = await fetch(`/api/peep-requests/${id}`, { method: 'POST', body: formData })
      const result: { error?: string } = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not publish this Peep.')

      setIsCapturing(false)
      router.replace(`/peep/request/${id}`)
      await loadRequest()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not publish this Peep.')
    } finally {
      setIsUploading(false)
    }
  }, [id, loadRequest, router])

  if (isCapturing) {
    return (
      <SelfieCapture
        variant="peep"
        onCapture={publishResponse}
        onBack={() => setIsCapturing(false)}
        isLoading={isUploading}
        error={error}
      />
    )
  }

  return (
    <main className="h-dvh min-h-dvh overflow-y-auto bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
            <Video className="h-5 w-5 text-red-500" />
            PEEP REQUEST
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {request?.status === 'completed'
              ? 'Your requested Peep is ready.'
              : 'A 3-second video, recorded in the familiar Peep circle.'}
          </p>
        </header>

        <section className="flex w-full flex-1 flex-col items-center justify-center gap-5 py-5">
          {isLoading ? (
            <Spinner className="h-8 w-8" />
          ) : request?.status === 'completed' ? (
            <>
              <PeepVideoPlayer videoUrl={request.videoUrl} />
              <div className="space-y-1 text-center">
                <p className="text-sm text-zinc-400">Recorded {new Date(request.createdAt).toLocaleString()}</p>
                <p className="font-mono text-lg text-red-400" aria-live="polite">
                  Expires in {formatTimeRemaining(timeRemaining ?? 0)}
                </p>
              </div>
              <Button className="w-full max-w-xs" variant="outline" onClick={shareRequestLink}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Peep
              </Button>
            </>
          ) : request?.status === 'pending' && isResponder ? (
            <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-red-950/20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500/25 to-rose-500/10 text-red-300 ring-1 ring-red-400/20">
                <Video className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Someone requested a Peep</h2>
                <p className="text-sm leading-6 text-zinc-400">
                  Record a quick 3-second video. It will be shared through this link and available for 3 hours.
                </p>
              </div>
              <Button
                className="h-12 w-full rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white hover:from-red-500 hover:to-rose-400"
                onClick={() => setIsCapturing(true)}
              >
                <Video className="mr-2 h-4 w-4" />
                Record a Peep
              </Button>
              <p className="font-mono text-xs text-zinc-500">
                Link expires in {formatTimeRemaining(timeRemaining ?? 0)}
              </p>
            </div>
          ) : request?.status === 'pending' ? (
            <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-emerald-950/20">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/10 text-emerald-300 ring-1 ring-emerald-400/20">
                <Link2 className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Your request link is ready</h2>
                <p className="text-sm leading-6 text-zinc-400">
                  Share it with someone. They can record one 3-second Peep, and it will appear here when it is ready.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  className="h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400"
                  onClick={shareRequestLink}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share request
                </Button>
                <Button className="h-12 rounded-xl" variant="outline" onClick={copyRequestLink}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? 'Link copied' : 'Copy link'}
                </Button>
              </div>
              <p className="font-mono text-xs text-zinc-500">
                Waiting for a Peep · expires in {formatTimeRemaining(timeRemaining ?? 0)}
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-300" role="status">{error}</p>
              <Button variant="outline" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back home
              </Button>
            </div>
          ) : null}
          {error && request && <p className="max-w-md text-center text-sm text-red-300" role="alert">{error}</p>}
        </section>
      </div>
    </main>
  )
}
