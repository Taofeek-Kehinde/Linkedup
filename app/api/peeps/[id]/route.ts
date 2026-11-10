import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type PeepRouteProps = {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: PeepRouteProps) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Peep not found.' }, { status: 404 })
  }

  try {
    const adminClient = createAdminClient()
    const { data: peep, error } = await adminClient
      .from('peeps')
      .select('id, storage_path, created_at, expires_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Peep lookup failed:', error)
      return NextResponse.json({ error: 'Could not load this Peep.' }, { status: 500 })
    }
    if (!peep) {
      return NextResponse.json({ error: 'This Peep is unavailable or has expired.' }, { status: 404 })
    }

    const remainingSeconds = Math.floor((new Date(peep.expires_at).getTime() - Date.now()) / 1000)
    if (remainingSeconds <= 0) {
      const { error: storageError } = await adminClient.storage.from('peeps').remove([peep.storage_path])
      if (storageError) console.error('Expired Peep video cleanup failed:', storageError)

      if (!storageError) {
        const { error: deleteError } = await adminClient.from('peeps').delete().eq('id', peep.id)
        if (deleteError) console.error('Expired Peep record cleanup failed:', deleteError)
      }

      return NextResponse.json({ error: 'This Peep has expired.' }, { status: 410 })
    }

    const { data: signedVideo, error: signedUrlError } = await adminClient.storage
      .from('peeps')
      .createSignedUrl(peep.storage_path, remainingSeconds)

    if (signedUrlError || !signedVideo?.signedUrl) {
      console.error('Peep video link creation failed:', signedUrlError)
      return NextResponse.json({ error: 'Could not load this Peep.' }, { status: 500 })
    }

    return NextResponse.json({
      videoUrl: signedVideo.signedUrl,
      createdAt: peep.created_at,
      expiresAt: peep.expires_at,
    }, {
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Peep retrieval failed:', error)
    return NextResponse.json({ error: 'Could not load this Peep.' }, { status: 500 })
  }
}
