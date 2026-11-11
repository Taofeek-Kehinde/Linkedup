'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SelfieCapture } from '@/components/join/selfie-capture'
import { createClient } from '@/lib/supabase/client'

export default function CreatePeepPage() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function getAvailableSession() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!cancelled) setAccessToken(session?.access_token ?? null)
    }

    getAvailableSession().catch(() => {
      if (!cancelled) setAccessToken(null)
    })

    return () => { cancelled = true }
  }, [])

  async function publishPeep(blob: Blob | null) {
    if (!blob) return

    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', blob, blob.type.includes('mp4') ? 'peep.mp4' : 'peep.webm')

      const headers = new Headers()
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

      const response = await fetch('/api/peeps', {
        method: 'POST',
        headers,
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not publish your Peep.')
      }

      router.replace(`/peep/${result.id}`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not publish your Peep.')
      setIsUploading(false)
    }
  }

  return (
    <SelfieCapture
      variant="peep"
      onCapture={publishPeep}
      onBack={() => router.push('/')}
      isLoading={isUploading}
      error={error}
    />
  )
}
