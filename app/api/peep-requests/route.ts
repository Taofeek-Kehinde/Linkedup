import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const REQUEST_LIFETIME_MS = 3 * 60 * 60 * 1000

export async function POST() {
  try {
    const id = randomUUID()
    const expiresAt = new Date(Date.now() + REQUEST_LIFETIME_MS).toISOString()
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('peep_requests').insert({
      id,
      expires_at: expiresAt,
    })

    if (error) {
      console.error('Peep request creation failed:', error)
      return NextResponse.json({ error: 'Could not create a Peep request link.' }, { status: 500 })
    }

    return NextResponse.json({ id, expiresAt }, { status: 201 })
  } catch (error) {
    console.error('Peep request creation failed:', error)
    return NextResponse.json({ error: 'Could not create a Peep request link.' }, { status: 500 })
  }
}
