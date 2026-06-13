import { createBrowserClient } from '@supabase/ssr'

function sanitizeSupabaseUrl(url?: string): string {
  if (!url) return ''
  // Strip trailing slashes and the incorrect /rest/v1 suffix that causes auth 404s
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function createClient() {
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Prevent `undefined.replace(...)` crashes on Vercel when env vars are missing.
  if (!url || !anonKey) {
    // eslint-disable-next-line no-console
    console.warn('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return createBrowserClient('', '')
  }

  return createBrowserClient(url, anonKey)
}

