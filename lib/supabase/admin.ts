import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, '')

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL and service role key are required for Peep storage.')
  }

  return createSupabaseClient(normalizeSupabaseUrl(url), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
