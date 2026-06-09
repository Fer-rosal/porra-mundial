import {
  calculatePhaseTotal,
  calculateTotalScore,
  getPhaseName,
  getPhaseOrder,
} from '../scoring'
import { PhaseScore, TournamentPhase } from '../types'

describe('Scoring Utilities', () => {
  describe('calculatePhaseTotal', () => {
    it('should multiply LEAGUE phase scores by 1', () => {
      const result = calculatePhaseTotal('LEAGUE', 10, 5)
      expect(result).toBe(15)
    })

    it('should multiply FINAL phase scores by 3', () => {
      const result = calculatePhaseTotal('FINAL', 10, 5)
      expect(result).toBe(45)
    })

    it('should multiply other phases by 1', () => {
      const phases: TournamentPhase[] = ['1/16', '1/8', '1/4', '1/2']
      phases.forEach((phase) => {
        const result = calculatePhaseTotal(phase, 10, 5)
        expect(result).toBe(15)
      })
    })

    it('should handle zero scores', () => {
      const result = calculatePhaseTotal('LEAGUE', 0, 0)
      expect(result).toBe(0)
    })

    it('should handle large scores', () => {
      const result = calculatePhaseTotal('FINAL', 100, 50)
      expect(result).toBe(450)
    })
  })

  describe('calculateTotalScore', () => {
    it('should sum all phase totals', () => {
      const phaseScores: PhaseScore[] = [
        { phase_key: 'LEAGUE', prediction_score: 10, scorer_score: 5, phase_total: 15 },
        { phase_key: '1/16', prediction_score: 8, scorer_score: 2, phase_total: 10 },
        { phase_key: 'FINAL', prediction_score: 20, scorer_score: 10, phase_total: 90 },
      ]
      const result = calculateTotalScore(phaseScores)
      expect(result).toBe(115)
    })

    it('should return 0 for empty phase scores', () => {
      const result = calculateTotalScore([])
      expect(result).toBe(0)
    })

    it('should handle single phase score', () => {
      const phaseScores: PhaseScore[] = [
        { phase_key: 'LEAGUE', prediction_score: 10, scorer_score: 5, phase_total: 15 },
      ]
      const result = calculateTotalScore(phaseScores)
      expect(result).toBe(15)
    })
  })

  describe('getPhaseName', () => {
    it('should return correct display name for LEAGUE', () => {
      expect(getPhaseName('LEAGUE')).toBe('League')
    })

    it('should return correct display name for 1/16', () => {
      expect(getPhaseName('1/16')).toBe('Round of 16')
    })

    it('should return correct display name for 1/8', () => {
      expect(getPhaseName('1/8')).toBe('Quarterfinals')
    })

    it('should return correct display name for 1/4', () => {
      expect(getPhaseName('1/4')).toBe('Quarterfinals')
    })

    it('should return correct display name for 1/2', () => {
      expect(getPhaseName('1/2')).toBe('Semifinals')
    })

    it('should return correct display name for FINAL', () => {
      expect(getPhaseName('FINAL')).toBe('Final')
    })

    it('should return original phase for unknown phase', () => {
      expect(getPhaseName('UNKNOWN' as TournamentPhase)).toBe('UNKNOWN')
    })
  })

  describe('getPhaseOrder', () => {
    it('should return phases in correct order', () => {
      expect(getPhaseOrder('LEAGUE')).toBe(1)
      expect(getPhaseOrder('1/16')).toBe(2)
      expect(getPhaseOrder('1/8')).toBe(3)
      expect(getPhaseOrder('1/4')).toBe(4)
      expect(getPhaseOrder('1/2')).toBe(5)
      expect(getPhaseOrder('FINAL')).toBe(6)
    })

    it('should return 999 for unknown phase', () => {
      expect(getPhaseOrder('UNKNOWN' as TournamentPhase)).toBe(999)
    })

    it('should allow sorting phases by order', () => {
      const phases: TournamentPhase[] = ['FINAL', 'LEAGUE', '1/2', '1/16']
      const sorted = phases.sort((a, b) => getPhaseOrder(a) - getPhaseOrder(b))
      expect(sorted).toEqual(['LEAGUE', '1/16', '1/2', 'FINAL'])
    })
  })
})
