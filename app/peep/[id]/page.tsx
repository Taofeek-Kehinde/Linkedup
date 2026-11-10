'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Copy, Video } from 'lucide-react'

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

  return (
    <main className="min-h-dvh flex items-center justify-center bg-black p-4 text-white">
      <Card className="w-full max-w-md overflow-hidden border-white/10 bg-zinc-950 text-white">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Video className="h-5 w-5 text-red-500" />
            PEEP
          </CardTitle>
          <CardDescription className="text-zinc-400">
            A 3-second looping video that disappears after 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {peep ? (
            <>
              <video
                key={peep.videoUrl}
                src={peep.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="aspect-square w-full rounded-xl bg-black object-cover"
              />
              <div className="space-y-2 text-center">
                <p className="text-sm text-zinc-400">
                  Recorded {new Date(peep.createdAt).toLocaleString()}
                </p>
                <p className="font-mono text-lg text-red-400" aria-live="polite">
                  Expires in {formatTimeRemaining(timeRemaining ?? 0)}
                </p>
              </div>
              <Button className="w-full" variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? 'Link Copied' : 'Copy Peep Link'}
              </Button>
              {error && <p className="text-center text-sm text-red-400" role="status">{error}</p>}
            </>
          ) : error ? (
            <p className="py-8 text-center text-sm text-zinc-300" role="status">{error}</p>
          ) : (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
