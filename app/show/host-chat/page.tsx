'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

/**
 * Redirect shim.f
 * The real host chat UI is at: /show/[eventId]/host-chat
 *
 * This prevents the generic /show/host-chat route from exposing other chat screens.
 */
export default function HostChatRedirectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)


  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        // session/event selection comes from localStorage
        const sessionStr = localStorage.getItem('linkedup_session')
        if (!sessionStr) {
          if (mounted) router.push('/join')
          return
        }

        const session = JSON.parse(sessionStr)
        const eventId = session?.eventId

        if (!eventId) {
          if (mounted) router.push('/')
          return
        }

        if (mounted) router.replace(`/show/${eventId}/host-chat`)
      } catch {
        if (mounted) router.push('/')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [router])


  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return null
}

