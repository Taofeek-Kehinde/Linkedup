import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupEventStorage } from '@/lib/utils/cleanup-event-storage'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()



  // Auth (must be host)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure this event belongs to the user
  const { data: eventRow, error: eventErr } = await supabase
    .from('events')
    .select('id,status,host_id')
    .eq('id', id)
    .single()

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (eventRow.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Clean up all selfie/avatar videos from storage first (frees up space)
  const { deletedFiles } = await cleanupEventStorage(id)

  // "End" immediately before deletion
  const now = new Date().toISOString()

  const { error: endErr } = await supabase
    .from('events')
    .update({
      status: 'ended',
      ends_at: now,
      // Prevent auto-start / scheduled transitions from bringing the event back.
      scheduled_start_at: null,
      starts_at: eventRow.status === 'upcoming' ? now : undefined,
    })
    .eq('id', id)


  // Attempt to delete the event; rely on FK/cascade if configured.
  // Even if the delete fails, we still want it ended.
  const { error: deleteErr } = await supabase.from('events').delete().eq('id', id)

  if (endErr) {
    return NextResponse.json({ error: 'Failed to end event', details: endErr.message }, { status: 500 })
  }

  if (deleteErr) {
    // Event is already ended; allow UI to proceed.
    return NextResponse.json({ ok: true, ended: true, deleteFailed: true, cleanedFiles: deletedFiles }, { status: 200 })
  }

  return NextResponse.json({ ok: true, cleanedFiles: deletedFiles })
}
