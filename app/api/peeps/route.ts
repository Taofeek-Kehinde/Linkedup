import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_VIDEO_BYTES = 2 * 1024 * 1024
const PEEP_LIFETIME_MS = 3 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'Video is too large. Maximum size is 2 MB.' }, { status: 413 })
  }

  try {
    const authorization = request.headers.get('authorization')
    const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    const adminClient = createAdminClient()
    let ownerId: string | null = null
    if (accessToken) {
      const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken)
      if (authError) {
        console.warn('Peep created without an account association because the session could not be verified.')
      } else {
        ownerId = user?.id ?? null
      }
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A recorded video is required.' }, { status: 400 })
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video is too large. Maximum size is 2 MB.' }, { status: 413 })
    }

    const contentType = file.type.toLowerCase()
    const normalizedContentType = contentType.startsWith('video/webm')
      ? 'video/webm'
      : contentType.startsWith('video/mp4')
        ? 'video/mp4'
        : null
    if (!normalizedContentType) {
      return NextResponse.json({ error: 'Use a WebM or MP4 video.' }, { status: 415 })
    }

    const id = randomUUID()
    const storagePath = `${ownerId ?? 'anonymous'}/${id}.${normalizedContentType === 'video/mp4' ? 'mp4' : 'webm'}`
    const expiresAt = new Date(Date.now() + PEEP_LIFETIME_MS).toISOString()
    const { error: uploadError } = await adminClient.storage
      .from('peeps')
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: normalizedContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Peep video upload failed:', uploadError)
      return NextResponse.json({ error: 'Could not save your video.' }, { status: 500 })
    }

    const { error: insertError } = await adminClient.from('peeps').insert({
      id,
      owner_id: ownerId,
      storage_path: storagePath,
      expires_at: expiresAt,
    })

    if (insertError) {
      const { error: cleanupError } = await adminClient.storage.from('peeps').remove([storagePath])
      if (cleanupError) console.error('Failed to clean up an unlisted Peep upload:', cleanupError)
      console.error('Peep record creation failed:', insertError)
      return NextResponse.json({ error: 'Could not publish your Peep.' }, { status: 500 })
    }

    return NextResponse.json({ id, expiresAt }, { status: 201 })
  } catch (error) {
    console.error('Peep creation failed:', error)
    return NextResponse.json({ error: 'Could not publish your Peep.' }, { status: 500 })
  }
}
