/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID when available (all modern browsers), with a manual fallback.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const INVITE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/**
 * Generates a 7-character uppercase alphanumeric invite code.
 */
export function generateInviteCode(): string {
  let code = ''
  const array = new Uint8Array(7)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    for (const byte of array) {
      code += INVITE_CODE_CHARS[byte % INVITE_CODE_CHARS.length]
    }
  } else {
    for (let i = 0; i < 7; i++) {
      code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)]
    }
  }
  return code
}
