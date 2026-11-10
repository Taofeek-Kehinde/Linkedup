import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function isValidRedirectUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function verifyAdminPassword(password: unknown): boolean {
  const expectedPassword = process.env.ADMIN_PAGE_PASSWORD
  return Boolean(expectedPassword && typeof password === 'string' && password === expectedPassword)
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'pullup_url')
      .maybeSingle()

    if (error) {
      console.error('Could not load the redirect URL:', error)
      return NextResponse.json({ error: 'Could not load the redirect URL.' }, { status: 500 })
    }

    return NextResponse.json(
      { url: data?.setting_value ?? '' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Could not load the redirect URL:', error)
    return NextResponse.json({ error: 'Could not load the redirect URL.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const { action, password, url } = body as {
      action?: unknown
      password?: unknown
      url?: unknown
    }

    if (!process.env.ADMIN_PAGE_PASSWORD) {
      return NextResponse.json({ error: 'Admin page password is not configured on the server.' }, { status: 503 })
    }
    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
    }
    if (action === 'verify') {
      return NextResponse.json({ verified: true })
    }

    const supabase = createAdminClient()
    if (action === 'save') {
      if (!isValidRedirectUrl(url)) {
        return NextResponse.json({ error: 'Enter a valid HTTP or HTTPS URL.' }, { status: 400 })
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'pullup_url',
          setting_value: url,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (error) {
        console.error('Could not save the redirect URL:', error)
        return NextResponse.json({ error: 'Could not save the redirect URL.' }, { status: 500 })
      }

      return NextResponse.json({ url })
    }

    if (action === 'delete') {
      const { error } = await supabase.from('app_settings').delete().eq('setting_key', 'pullup_url')
      if (error) {
        console.error('Could not remove the redirect URL:', error)
        return NextResponse.json({ error: 'Could not remove the redirect URL.' }, { status: 500 })
      }

      return NextResponse.json({ url: '' })
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
  } catch (error) {
    console.error('Redirect URL settings request failed:', error)
    return NextResponse.json({ error: 'Could not update redirect URL settings.' }, { status: 500 })
  }
}
