import { MATCH_DATA, getMatchesByPhase } from '../match-data'

describe('Match Data Utilities', () => {
  describe('MATCH_DATA constant', () => {
    it('should have all tournament matches populated', () => {
      expect(MATCH_DATA.length).toBeGreaterThan(0)
      expect(MATCH_DATA.length).toBeLessThanOrEqual(64)
    })

    it('should have LEAGUE phase matches', () => {
      const leagueMatches = MATCH_DATA.filter((m) => m.phase_key === 'LEAGUE')
      expect(leagueMatches.length).toBe(8)
    })

    it('should have R16 phase matches', () => {
      const r16Matches = MATCH_DATA.filter((m) => m.phase_key === 'R16')
      expect(r16Matches.length).toBe(8)
    })

    it('should have R8 phase matches', () => {
      const r8Matches = MATCH_DATA.filter((m) => m.phase_key === 'R8')
      expect(r8Matches.length).toBe(4)
    })

    it('should have R4 phase matches', () => {
      const r4Matches = MATCH_DATA.filter((m) => m.phase_key === 'R4')
      expect(r4Matches.length).toBe(2)
    })

    it('should have R2 phase matches', () => {
      const r2Matches = MATCH_DATA.filter((m) => m.phase_key === 'R2')
      expect(r2Matches.length).toBe(2)
    })

    it('should have FINAL phase match', () => {
      const finalMatches = MATCH_DATA.filter((m) => m.phase_key === 'FINAL')
      expect(finalMatches.length).toBe(1)
    })

    it('should have all required fields in each match', () => {
      MATCH_DATA.forEach((match) => {
        expect(match).toHaveProperty('match_number')
        expect(match).toHaveProperty('home_team')
        expect(match).toHaveProperty('away_team')
        expect(match).toHaveProperty('scheduled_at')
        expect(match).toHaveProperty('phase_key')
      })
    })

    it('should have valid date strings', () => {
      MATCH_DATA.forEach((match) => {
        const date = new Date(match.scheduled_at)
        expect(date.getTime()).not.toBeNaN()
      })
    })

    it('should have valid phase keys', () => {
      const validPhases = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']
      MATCH_DATA.forEach((match) => {
        expect(validPhases).toContain(match.phase_key)
      })
    })
  })

  describe('getMatchesByPhase', () => {
    it('should return all matches for a given phase', () => {
      const leagueMatches = getMatchesByPhase('LEAGUE')
      expect(leagueMatches.length).toBe(8)
      leagueMatches.forEach((match) => {
        expect(match.phase_key).toBe('LEAGUE')
      })
    })

    it('should return empty array for invalid phase', () => {
      const matches = getMatchesByPhase('INVALID')
      expect(matches).toEqual([])
    })

    it('should be case-sensitive', () => {
      const matches = getMatchesByPhase('league')
      expect(matches).toEqual([])
    })

    it('should return correct count for R16 phase', () => {
      const r16Matches = getMatchesByPhase('R16')
      expect(r16Matches.length).toBe(8)
    })

    it('should return correct count for R8 phase', () => {
      const r8Matches = getMatchesByPhase('R8')
      expect(r8Matches.length).toBe(4)
    })

    it('should return correct count for FINAL phase', () => {
      const finalMatches = getMatchesByPhase('FINAL')
      expect(finalMatches.length).toBe(1)
    })
  })
})
