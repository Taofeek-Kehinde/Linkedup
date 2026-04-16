'use client'

import { Suspense } from 'react'
import { JoinFlow } from '@/components/join/join-flow'
import { Spinner } from '@/components/ui/spinner'

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </main>
    }>
      <JoinFlow />
    </Suspense>
  )
}
