import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_VIDEO_BYTES = 2 * 1024 * 1024
const PEEP_LIFETIME_MS = 3 * 60 * 60 * 1000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type PeepRequestRouteProps = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: PeepRequestRouteProps) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Peep request not found.' }, { status: 404 })
  }

  try {
    const adminClient = createAdminClient()
    const { data: peepRequest, error } = await adminClient
      .from('peep_requests')
      .select('id, peep_id, created_at, expires_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Peep request lookup failed:', error)
      return NextResponse.json({ error: 'Could not load this Peep request.' }, { status: 500 })
    }
    if (!peepRequest) {
      return NextResponse.json({ error: 'This Peep request is unavailable.' }, { status: 404 })
    }

    const now = Date.now()
    if (new Date(peepRequest.expires_at).getTime() <= now) {
      return NextResponse.json({ error: 'This Peep request has expired.' }, { status: 410 })
    }

    if (!peepRequest.peep_id) {
      return NextResponse.json({
        status: 'pending',
        createdAt: peepRequest.created_at,
        expiresAt: peepRequest.expires_at,
      }, {
        headers: { 'Cache-Control': 'private, no-store, max-age=0' },
      })
    }

    const { data: peep, error: peepError } = await adminClient
      .from('peeps')
      .select('storage_path, created_at, expires_at')
      .eq('id', peepRequest.peep_id)
      .maybeSingle()

    if (peepError) {
      console.error('Requested Peep lookup failed:', peepError)
      return NextResponse.json({ error: 'Could not load this Peep.' }, { status: 500 })
    }
    if (!peep || new Date(peep.expires_at).getTime() <= now) {
      return NextResponse.json({ error: 'This Peep has expired.' }, { status: 410 })
    }

    const expiresIn = Math.max(1, Math.floor((new Date(peep.expires_at).getTime() - now) / 1000))
    const { data: signedVideo, error: signedUrlError } = await adminClient.storage
      .from('peeps')
      .createSignedUrl(peep.storage_path, expiresIn)

    if (signedUrlError || !signedVideo?.signedUrl) {
      console.error('Requested Peep video link creation failed:', signedUrlError)
      return NextResponse.json({ error: 'Could not load this Peep.' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'completed',
      videoUrl: signedVideo.signedUrl,
      createdAt: peep.created_at,
      expiresAt: peep.expires_at,
    }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Peep request retrieval failed:', error)
    return NextResponse.json({ error: 'Could not load this Peep request.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: PeepRequestRouteProps) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Peep request not found.' }, { status: 404 })
  }

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES + 1024 * 1024) {
    return NextResponse.json({ error: 'Video is too large. Maximum size is 2 MB.' }, { status: 413 })
  }

  try {
    const adminClient = createAdminClient()
    const now = new Date()
    const nowIso = now.toISOString()
    const { data: peepRequest, error: lookupError } = await adminClient
      .from('peep_requests')
      .select('id, peep_id, expires_at')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      console.error('Peep request lookup failed before upload:', lookupError)
      return NextResponse.json({ error: 'Could not save your Peep.' }, { status: 500 })
    }
    if (!peepRequest || new Date(peepRequest.expires_at).getTime() <= now.getTime()) {
      return NextResponse.json({ error: 'This Peep request has expired.' }, { status: 410 })
    }
    if (peepRequest.peep_id) {
      return NextResponse.json({ error: 'A Peep has already been recorded for this link.' }, { status: 409 })
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

    const peepId = randomUUID()
    const storagePath = `requests/${id}/${peepId}.${normalizedContentType === 'video/mp4' ? 'mp4' : 'webm'}`
    const expiresAt = new Date(now.getTime() + PEEP_LIFETIME_MS).toISOString()
    const { error: uploadError } = await adminClient.storage
      .from('peeps')
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: normalizedContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Requested Peep video upload failed:', uploadError)
      return NextResponse.json({ error: 'Could not save your video.' }, { status: 500 })
    }

    const { error: insertError } = await adminClient.from('peeps').insert({
      id: peepId,
      owner_id: null,
      storage_path: storagePath,
      expires_at: expiresAt,
    })
    if (insertError) {
      const { error: storageCleanupError } = await adminClient.storage.from('peeps').remove([storagePath])
      if (storageCleanupError) console.error('Failed to clean up an unlisted requested Peep upload:', storageCleanupError)
      console.error('Requested Peep record creation failed:', insertError)
      return NextResponse.json({ error: 'Could not save your video.' }, { status: 500 })
    }

    const { data: updatedRequest, error: updateError } = await adminClient
      .from('peep_requests')
      .update({ peep_id: peepId, expires_at: expiresAt })
      .eq('id', id)
      .is('peep_id', null)
      .gt('expires_at', nowIso)
      .select('id')
      .maybeSingle()

    if (updateError || !updatedRequest) {
      const { error: deleteError } = await adminClient.from('peeps').delete().eq('id', peepId)
      if (deleteError) console.error('Failed to clean up an unlinked requested Peep record:', deleteError)
      const { error: storageCleanupError } = await adminClient.storage.from('peeps').remove([storagePath])
      if (storageCleanupError) console.error('Failed to clean up an unlinked requested Peep video:', storageCleanupError)

      if (updateError) {
        console.error('Requested Peep link update failed:', updateError)
        return NextResponse.json({ error: 'Could not publish this Peep.' }, { status: 500 })
      }
      return NextResponse.json({ error: 'A Peep has already been recorded or this request has expired.' }, { status: 409 })
    }

    return NextResponse.json({ status: 'completed', expiresAt }, { status: 201 })
  } catch (error) {
    console.error('Requested Peep publishing failed:', error)
    return NextResponse.json({ error: 'Could not publish this Peep.' }, { status: 500 })
  }
}
