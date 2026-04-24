import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function sanitizeSupabaseUrl(url: string): string {
  // Strip trailing slashes and the incorrect /rest/v1 suffix that causes auth 404s
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export async function createClient() {
  const cookieStore = await cookies()
  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!)

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing user sessions.
          }
        },
      },
    },
  )
}
