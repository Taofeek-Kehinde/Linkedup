import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupEventStorage } from '@/lib/utils/cleanup-event-storage'

/**
 * API endpoint to clean up storage for all expired/ended events.
 * This can be called manually or set up as a cron job.
 * 
 * POST /api/admin/events/cleanup-storage
 * 
 * Requires admin authentication.
 */
export async function POST() {
  const supabase = await createClient()

  // Auth (must be logged in)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all events that belong to this user and have ended
  const { data: endedEvents, error: eventsErr } = await supabase
    .from('events')
    .select('id, show_name, status')
    .eq('host_id', user.id)
    .eq('status', 'ended')

  if (eventsErr) {
    return NextResponse.json({ error: 'Failed to fetch events', details: eventsErr.message }, { status: 500 })
  }

  if (!endedEvents || endedEvents.length === 0) {
    return NextResponse.json({ ok: true, cleaned: 0, message: 'No ended events to clean up' })
  }

  let totalCleaned = 0
  const results: { eventId: string; showName: string; filesDeleted: number }[] = []

  for (const event of endedEvents) {
    const result = await cleanupEventStorage(event.id)
    totalCleaned += result.deletedFiles
    results.push({
      eventId: event.id,
      showName: event.show_name,
      filesDeleted: result.deletedFiles,
    })
    console.log(`Cleaned ${result.deletedFiles} files for ended event "${event.show_name}" (${event.id})`)
  }

  return NextResponse.json({
    ok: true,
    totalCleaned,
    events: results,
  })
}
