'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Copy, Share2, Video } from 'lucide-react'
import { PeepVideoPlayer } from '@/components/peep/peep-video-player'

type PeepData = {
  videoUrl: string
  createdAt: string
  expiresAt: string
}

type PeepPageProps = {
  params: Promise<{ id: string }>
}

function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export default function PeepPage({ params }: PeepPageProps) {
  const { id } = use(params)
  const [peep, setPeep] = useState<PeepData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPeep() {
      try {
        const response = await fetch(`/api/peeps/${id}`, { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'This Peep is unavailable.')
        if (!cancelled) {
          setPeep(result)
          setTimeRemaining(new Date(result.expiresAt).getTime() - Date.now())
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'This Peep is unavailable.')
        }
      }
    }

    loadPeep()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!peep) return

    const intervalId = window.setInterval(() => {
      const remaining = new Date(peep.expiresAt).getTime() - Date.now()
      setTimeRemaining(remaining)
      if (remaining <= 0) {
        setPeep(null)
        setError('This Peep has expired.')
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [peep])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy the link. Please copy it from your browser address bar.')
    }
  }, [])

  const sharePeep = useCallback(async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({
        title: 'My Peep',
        text: 'Watch my Peep before it expires.',
        url: window.location.href,
      })
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return
      setError('Could not share the link. You can copy it instead.')
    }
  }, [copyLink])

  return (
    <main className="h-dvh min-h-dvh overflow-y-auto bg-zinc-950 text-white">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="text-center">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
            <Video className="h-5 w-5 text-red-500" />
            PEEP
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            A 3-second looping video that disappears after 3 hours.
          </p>
        </header>
        <section className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-4">
          {peep ? (
            <>
              <PeepVideoPlayer videoUrl={peep.videoUrl} />
              <div className="space-y-1 text-center">
                <p className="text-sm text-zinc-400">
                  Recorded {new Date(peep.createdAt).toLocaleString()}
                </p>
                <p className="font-mono text-lg text-red-400" aria-live="polite">
                  Expires in {formatTimeRemaining(timeRemaining ?? 0)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="w-full" onClick={sharePeep}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Peep
                </Button>
                <Button className="w-full" variant="outline" onClick={copyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Link Copied' : 'Copy Peep Link'}
                </Button>
              </div>
              {error && <p className="text-center text-sm text-red-400" role="status">{error}</p>}
            </>
          ) : error ? (
            <p className="text-center text-sm text-zinc-300" role="status">{error}</p>
          ) : (
            <div className="flex justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
