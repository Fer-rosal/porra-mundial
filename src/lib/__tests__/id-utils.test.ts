import { generateUUID, generateInviteCode } from '../id-utils'

describe('id-utils', () => {
  describe('generateUUID', () => {
    it('should return a string', () => {
      expect(typeof generateUUID()).toBe('string')
    })

    it('should return a UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)', () => {
      const uuid = generateUUID()
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    })

    it('should return unique values on each call', () => {
      const uuids = Array.from({ length: 100 }, () => generateUUID())
      const uniqueUUIDs = new Set(uuids)
      expect(uniqueUUIDs.size).toBe(100)
    })

    it('should use fallback if crypto.randomUUID is not available', () => {
      // Temporarily remove crypto.randomUUID to test the fallback
      const originalRandomUUID = (global.crypto as { randomUUID?: () => string }).randomUUID
      delete (global.crypto as { randomUUID?: () => string }).randomUUID
      const uuid = generateUUID()
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      // Restore
      if (originalRandomUUID) {
        (global.crypto as { randomUUID?: () => string }).randomUUID = originalRandomUUID
      }
    })
  })

  describe('generateInviteCode', () => {
    it('should return a 7-character string', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(7)
    })

    it('should only contain uppercase letters and digits', () => {
      const code = generateInviteCode()
      expect(code).toMatch(/^[A-Z0-9]{7}$/)
    })

    it('should return unique codes on repeated calls', () => {
      const codes = Array.from({ length: 100 }, () => generateInviteCode())
      const uniqueCodes = new Set(codes)
      // With 36^7 = ~78 billion combinations, collisions are essentially impossible
      expect(uniqueCodes.size).toBe(100)
    })

    it('should generate multiple different codes across many calls', () => {
      const codes = new Set(Array.from({ length: 50 }, () => generateInviteCode()))
      expect(codes.size).toBeGreaterThan(1)
    })
  })
})
