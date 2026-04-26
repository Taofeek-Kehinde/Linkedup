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

  // Auto-end any live events whose end time has passed
  const { data: endedData, error: endError } = await supabase
    .from('events')
    .update({ status: 'ended' })
    .eq('status', 'live')
    .lt('ends_at', now)
    .select('id')

  if (endError) {
    return NextResponse.json({ error: endError.message }, { status: 500 })
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

  return NextResponse.json({ started: startedData?.length || 0, ended: endedData?.length || 0 })
}

