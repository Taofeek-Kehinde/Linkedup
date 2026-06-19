import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return ''
  // Render/Vercel sometimes differ; ensure we don't include a /rest/v1 suffix.
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

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

    // Safety guards: selfies can crash/timeout servers if we buffer too much.
    // User uploads are expected to be <= 10MB.
    const maxBytes = 10 * 1024 * 1024 // 10MB
    const contentType = file.type?.toLowerCase() || ''
    const isAllowedType = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ].includes(contentType)

    if (!isAllowedType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use JPG, PNG, or WEBP.' },
        { status: 415 }
      )
    }

    // `File.size` is bytes.
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return NextResponse.json(
        { error: 'File too large. Max size is 10MB.' },
        { status: 413 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabaseUrl = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL is missing' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for uploads' }, { status: 500 })
    }

    // If this fails with "Invalid Compact JWS", it usually means the provided key
    // is not actually a Supabase service role JWT (wrong env var / truncated / quoting issues).
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: uploadError } = await supabase.storage
      .from('selfies')
      .upload(filename, buffer, {
        contentType: file.type || 'image/jpeg',
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


