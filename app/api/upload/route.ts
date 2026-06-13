import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const eventId = (formData.get('eventId') as string) || 'unknown'
    const username = (formData.get('username') as string) || 'user'

    const sanitizedUsername = username
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 40) || 'user'

    const timestamp = Date.now()
    const filename = `selfies/${eventId}/${sanitizedUsername}-${timestamp}.jpg`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for uploads' }, { status: 500 })
    }

    // Logs to debug 500 "Invalid API key"
    // Debug env values actually present at runtime
    console.log('[upload] supabaseUrl host', new URL(supabaseUrl).host)
    console.log('[upload] has SUPABASE_SERVICE_ROLE_KEY', Boolean(supabaseServiceKey))
    console.log('[upload] has NEXT_PUBLIC_SUPABASE_ANON_KEY', Boolean(supabaseAnonKey))
    console.log(
      '[upload] key prefix service',
      supabaseServiceKey ? supabaseServiceKey.slice(0, 18) : 'none'
    )
    console.log(
      '[upload] key prefix anon',
      supabaseAnonKey ? supabaseAnonKey.slice(0, 18) : 'none'
    )
    console.log('[upload] using key:', supabaseServiceKey ? 'service_role' : 'anon')

    // Storage upload should use the service role key so Vercel uploads are not blocked by RLS.
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('selfies')
      .getPublicUrl(filename)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to generate public URL for selfie' }, { status: 500 })
    }

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

