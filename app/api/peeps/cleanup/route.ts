import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Cleanup is not configured.' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    let deletedCount = 0

    while (true) {
      const { data: expiredPeeps, error: queryError } = await adminClient
        .from('peeps')
        .select('id, storage_path')
        .lte('expires_at', new Date().toISOString())
        .limit(100)

      if (queryError) {
        console.error('Expired Peep lookup failed:', queryError)
        return NextResponse.json({ error: 'Could not clean up expired Peeps.' }, { status: 500 })
      }
      if (!expiredPeeps?.length) break

      const { error: storageError } = await adminClient.storage
        .from('peeps')
        .remove(expiredPeeps.map((peep) => peep.storage_path))
      if (storageError) {
        console.error('Expired Peep video cleanup failed:', storageError)
        return NextResponse.json({ error: 'Could not clean up expired Peep videos.' }, { status: 500 })
      }

      const { error: deleteError } = await adminClient
        .from('peeps')
        .delete()
        .in('id', expiredPeeps.map((peep) => peep.id))
      if (deleteError) {
        console.error('Expired Peep record cleanup failed:', deleteError)
        return NextResponse.json({ error: 'Could not clean up expired Peep records.' }, { status: 500 })
      }

      deletedCount += expiredPeeps.length
    }

    const { data: expiredRequests, error: requestQueryError } = await adminClient
      .from('peep_requests')
      .delete()
      .lte('expires_at', new Date().toISOString())
      .select('id')

    if (requestQueryError) {
      console.error('Expired Peep request cleanup failed:', requestQueryError)
      return NextResponse.json({ error: 'Could not clean up expired Peep requests.' }, { status: 500 })
    }

    return NextResponse.json({ deletedCount, deletedRequestCount: expiredRequests?.length ?? 0 })
  } catch (error) {
    console.error('Expired Peep cleanup failed:', error)
    return NextResponse.json({ error: 'Could not clean up expired Peeps.' }, { status: 500 })
  }
}
