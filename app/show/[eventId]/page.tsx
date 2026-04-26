'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalSession, clearLocalSession } from '@/lib/utils/session'
import { Spinner } from '@/components/ui/spinner'
import { ShowFeed } from '@/components/show/show-feed'
import type { Event, EventUser, UserSession } from '@/lib/types'

export default function ShowPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<UserSession | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [currentUser, setCurrentUser] = useState<EventUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Get local session
      const localSession = getLocalSession()
      if (!localSession || localSession.eventId !== eventId) {
        router.push(`/join?code=`)
        return
      }
      setSession(localSession)

      const supabase = createClient()

      // Load event
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!eventData) {
        clearLocalSession()
        router.push('/')
        return
      }

      // Check if live event has expired and auto-end it
      let event = eventData
      if (eventData.status === 'live') {
        const nowTime = Date.now()
        let expired = false
        if (eventData.ends_at) {
          expired = new Date(eventData.ends_at).getTime() < nowTime
        } else if (eventData.starts_at) {
          expired = new Date(eventData.starts_at).getTime() + (eventData.duration_hours * 60 * 60 * 1000) < nowTime
        } else {
          expired = new Date(eventData.created_at).getTime() + (6 * 60 * 60 * 1000) < nowTime
        }

        if (expired) {
          const { data: updatedEvent } = await supabase
            .from('events')
            .update({ status: 'ended' })
            .eq('id', eventData.id)
            .select()
            .single()
          if (updatedEvent) {
            event = updatedEvent
          }
        }
      }

      if (event.status === 'ended') {
        clearLocalSession()
        router.push('/')
        return
      }

      setEvent(event)

      // Verify user still exists
      const { data: user } = await supabase
        .from('event_users')
        .select('*')
        .eq('id', localSession.eventUserId)
        .single()

      if (!user) {
        clearLocalSession()
        router.push(`/join?code=${event.event_code}`)
        return
      }

      setCurrentUser(user)
      setIsLoading(false)
    }

    loadData()
  }, [eventId, router])

  if (isLoading || !event || !currentUser || !session) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  return (
    <ShowFeed 
      event={event} 
      currentUser={currentUser} 
      session={session}
    />
  )
}
