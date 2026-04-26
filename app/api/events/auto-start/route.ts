import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseServiceKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const now = new Date().toISOString()
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()

  // Auto-end any live events whose end time has passed (with ends_at set)
  const { data: endedData1, error: endError1 } = await supabase
    .from('events')
    .update({ status: 'ended' })
    .eq('status', 'live')
    .lt('ends_at', now)
    .select('id')

  if (endError1) {
    return NextResponse.json({ error: endError1.message }, { status: 500 })
  }

  // Auto-end live events with null ends_at that started more than 6 hours ago
  const { data: endedData2, error: endError2 } = await supabase
    .from('events')
    .update({ status: 'ended', ends_at: now })
    .eq('status', 'live')
    .is('ends_at', null)
    .not('starts_at', 'is', null)
    .lt('starts_at', sixHoursAgo)
    .select('id')

  if (endError2) {
    return NextResponse.json({ error: endError2.message }, { status: 500 })
  }

  // Auto-end live events with both ends_at and starts_at null that were created more than 6 hours ago
  const { data: endedData3, error: endError3 } = await supabase
    .from('events')
    .update({ status: 'ended', ends_at: now })
    .eq('status', 'live')
    .is('ends_at', null)
    .is('starts_at', null)
    .lt('created_at', sixHoursAgo)
    .select('id')

  if (endError3) {
    return NextResponse.json({ error: endError3.message }, { status: 500 })
  }

  // Auto-start any upcoming events whose scheduled time has passed
  const { data: startedData, error: startError } = await supabase
    .from('events')
    .update({
      status: 'live',
      starts_at: now,
      ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    })
    .eq('status', 'upcoming')
    .lte('scheduled_start_at', now)
    .select('id')

  if (startError) {
    return NextResponse.json({ error: startError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    started: startedData?.length || 0, 
    ended: (endedData1?.length || 0) + (endedData2?.length || 0) + (endedData3?.length || 0) 
  })
}

