/**
 * Generates a 6-character alphanumeric vibe key
 * Used for account recovery across devices
 * Case-insensitive friendly characters (no 0/O, 1/I/L confusion)
 */
const CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateVibeKey(): string {
  let key = ''
  for (let i = 0; i < 6; i++) {
    key += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  return key
}

/**
 * Normalizes a vibe key for comparison (uppercase, trim)
 */
export function normalizeVibeKey(key: string): string {
  return key.toUpperCase().trim()
}
