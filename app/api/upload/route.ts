import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return ''
  // Render/Vercel sometimes differ; ensure we don't include a /rest/v1 suffix.
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function normalizeServiceRoleKey(key?: string): string {
  return (key || '').trim().replace(/^["']|["']$/g, '')
}

function isServiceRoleJwt(key: string): boolean {
  return /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)
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

    // Determine file extension from content type
    const contentType = file.type?.toLowerCase() || ''
    let extension = '.jpg'
    if (contentType.startsWith('video/')) extension = '.webm'

    const filename = `selfies/${eventId}/${sanitizedUsername}-${timestamp}${extension}`

    // Safety guards: selfies can crash/timeout servers if we buffer too much.
    // User uploads are expected to be <= 20MB for videos.
    const maxBytes = 20 * 1024 * 1024 // 20MB

    // Check if content type is an allowed type (use startsWith to handle codecs like video/webm;codecs=vp9)
    const isAllowedType = (
      contentType.startsWith('image/jpeg') ||
      contentType.startsWith('image/png') ||
      contentType.startsWith('image/webp') ||
      contentType.startsWith('video/webm') ||
      contentType.startsWith('video/mp4')
    )

    if (!isAllowedType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}. Use JPG, PNG, WEBP, WebM video, or MP4 video.` },
        { status: 415 }
      )
    }

    // `File.size` is bytes.
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return NextResponse.json(
        { error: 'File too large. Max size is 20MB.' },
        { status: 413 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const supabaseUrl = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const supabaseServiceKey = normalizeServiceRoleKey(process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL is missing' },
        { status: 500 }
      )
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is required for uploads' }, { status: 500 })
    }

    if (!isServiceRoleJwt(supabaseServiceKey)) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is invalid. Set the full Supabase service role JWT in Render/Vercel env vars.' },
        { status: 500 }
      )
    }

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
