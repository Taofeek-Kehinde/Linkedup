// Fun adjectives for usernames (kept for backward compat)
const adjectives = [
  'Cosmic', 'Neon', 'Electric', 'Mystic', 'Vibrant',
  'Radiant', 'Stellar', 'Lunar', 'Solar', 'Astral',
  'Blazing', 'Glowing', 'Shining', 'Sparkling', 'Dazzling',
  'Swift', 'Bold', 'Fierce', 'Wild', 'Free',
  'Chill', 'Cool', 'Smooth', 'Fresh', 'Crisp',
  'Golden', 'Silver', 'Crystal', 'Diamond', 'Ruby',
  'Thunder', 'Storm', 'Wave', 'Flame', 'Frost',
  'Dream', 'Vision', 'Spirit', 'Soul', 'Aura'
]

// Fun nouns for usernames (kept for backward compat)
const nouns = [
  'Phoenix', 'Dragon', 'Tiger', 'Panther', 'Wolf',
  'Eagle', 'Falcon', 'Hawk', 'Raven', 'Owl',
  'Star', 'Moon', 'Sun', 'Comet', 'Nova',
  'Ninja', 'Samurai', 'Knight', 'Wizard', 'Sage',
  'Vibe', 'Energy', 'Force', 'Power', 'Flow',
  'Wave', 'Pulse', 'Beat', 'Rhythm', 'Melody',
  'Shadow', 'Light', 'Flash', 'Spark', 'Blaze',
  'Ghost', 'Spirit', 'Phantom', 'Specter', 'Echo'
]

/**
 * Generates a fun, memorable username like "CosmicPhoenix" or "NeonDragon"
 * (backward compatibility)
 */
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adjective}${noun}`
}

/**
 * Generates unique event-based username like "takincandy001", "takincandyXTY"
 * @param eventName - Event show_name (e.g. "takin-candy")
 * @param existingUsernames - Current usernames in event for uniqueness
 * @returns Unique username
 */
export async function generateEventUsername(
  eventName: string, 
  existingUsernames: string[] = []
): Promise<string> {
  const cleanName = eventName.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove non-alphanumeric
    .replace(/(.{3}).*/, '$1') // first 3 letters
  
  if (cleanName.length < 3) {
    throw new Error('Event name too short')
  }

  const baseName = cleanName.substring(0, 3)

  // Try 001-999
  for (let i = 1; i <= 999; i++) {
    const suffix = i.toString().padStart(3, '0')
    const candidate = `${baseName}${suffix}`
    
    if (!existingUsernames.includes(candidate)) {
      return candidate
    }
  }

  // Fallback to random letters if all numbers taken
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  for (let i = 0; i < 100; i++) {
    const randomLetters = Array.from({length: 3}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const candidate = `${baseName}${randomLetters.toUpperCase()}`
    if (!existingUsernames.includes(candidate)) {
      return candidate
    }
  }

  throw new Error('Could not generate unique username')
}

/**
 * Client-safe version (no async uniqueness check)
 */
export function generateEventUsernameClient(eventName: string): string {
  const cleanName = eventName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.{3}).*/, '$1')
  
  const randomNum = (Math.floor(Math.random() * 999) + 1).toString().padStart(3, '0')
  return `${cleanName}${randomNum}`
}

/**
 * Legacy unique with number suffix
 */
export function generateUniqueUsername(existingUsernames: string[]): string {
  let username = generateUsername()
  let attempts = 0
  const maxAttempts = 100
  
  while (existingUsernames.includes(username) && attempts < maxAttempts) {
    const suffix = Math.floor(Math.random() * 99) + 1
    username = `${generateUsername()}${suffix}`
    attempts++
  }
  
  return username
}
