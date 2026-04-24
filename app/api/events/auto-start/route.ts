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

  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'live',
      starts_at: now,
      ends_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    })
    .eq('status', 'upcoming')
    .lte('scheduled_start_at', now)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ started: data?.length || 0 })
}

