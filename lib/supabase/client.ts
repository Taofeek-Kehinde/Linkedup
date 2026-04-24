import { createBrowserClient } from '@supabase/ssr'

function sanitizeSupabaseUrl(url: string): string {
  // Strip trailing slashes and the incorrect /rest/v1 suffix that causes auth 404s
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function createClient() {
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!)
  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
