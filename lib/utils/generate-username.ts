// Fun adjectives for usernames
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

// Fun nouns for usernames
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
 */
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  return `${adjective}${noun}`
}

/**
 * Generates a unique username with a number suffix if needed
 */
export function generateUniqueUsername(existingUsernames: string[]): string {
  let username = generateUsername()
  let attempts = 0
  const maxAttempts = 100
  
  while (existingUsernames.includes(username) && attempts < maxAttempts) {
    // Add random 2-digit number
    const suffix = Math.floor(Math.random() * 99) + 1
    username = `${generateUsername()}${suffix}`
    attempts++
  }
  
  return username
}
