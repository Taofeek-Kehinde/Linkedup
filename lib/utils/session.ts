import type { UserSession } from '@/lib/types'

const SESSION_KEY = 'linkedup_session'

export function getLocalSession(): UserSession | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    return JSON.parse(stored) as UserSession
  } catch {
    return null
  }
}

export function setLocalSession(session: UserSession): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}

export function hasLocalSession(): boolean {
  return getLocalSession() !== null
}
