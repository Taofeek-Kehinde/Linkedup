/**
 * Generates an event code in the format LNK-XXX-000
 * Where XXX is derived from the location and 000 is a random number
 */
export function generateEventCode(location: string): string {
  // Extract first 3 consonants or characters from location
  const cleanLocation = location.replace(/[^a-zA-Z]/g, '').toUpperCase()
  let locationCode = ''
  
  // Try to get consonants first
  const consonants = cleanLocation.replace(/[AEIOU]/g, '')
  if (consonants.length >= 3) {
    locationCode = consonants.substring(0, 3)
  } else {
    // Fall back to first 3 characters
    locationCode = cleanLocation.substring(0, 3).padEnd(3, 'X')
  }
  
  // Generate random 3-digit number
  const randomNum = Math.floor(Math.random() * 900) + 100 // 100-999
  
  return `LNK-${locationCode}-${randomNum}`
}

/**
 * Validates an event code format
 */
export function isValidEventCode(code: string): boolean {
  const pattern = /^LNK-[A-Z]{3}-\d{3}$/
  return pattern.test(code.toUpperCase())
}

/**
 * Normalizes an event code (uppercase, trim)
 */
export function normalizeEventCode(code: string): string {
  return code.toUpperCase().trim()
}
