import { getHighestOpenUnlockedPhase } from '../phase-utils'
import type { PhaseKey } from '../game-store'

function phase(phaseKey: PhaseKey, isOpen: boolean, isLocked: boolean) {
  return { phaseKey, isOpen, isLocked }
}

describe('getHighestOpenUnlockedPhase', () => {
  it('returns null when no phases are open and unlocked', () => {
    const result = getHighestOpenUnlockedPhase([
      phase('LEAGUE', false, true),
      phase('R16', false, false),
      phase('R8', false, false),
      phase('R4', false, false),
      phase('R2', false, false),
      phase('FINAL', false, false),
    ])

    expect(result).toBeNull()
  })

  it('returns R16 after league is locked and R16 is open', () => {
    const result = getHighestOpenUnlockedPhase([
      phase('LEAGUE', true, true),
      phase('R16', true, false),
      phase('R8', false, false),
      phase('R4', false, false),
      phase('R2', false, false),
      phase('FINAL', false, false),
    ])

    expect(result).toBe('R16')
  })

  it('prefers the highest open unlocked phase when multiple are open', () => {
    const result = getHighestOpenUnlockedPhase([
      phase('LEAGUE', true, false),
      phase('R16', true, false),
      phase('R8', true, false),
      phase('R4', false, false),
      phase('R2', false, false),
      phase('FINAL', false, false),
    ])

    expect(result).toBe('R8')
  })

  it('supports deep progression through R4, R2, and FINAL', () => {
    const r4 = getHighestOpenUnlockedPhase([
      phase('LEAGUE', true, true),
      phase('R16', true, true),
      phase('R8', true, true),
      phase('R4', true, false),
      phase('R2', false, false),
      phase('FINAL', false, false),
    ])

    const r2 = getHighestOpenUnlockedPhase([
      phase('LEAGUE', true, true),
      phase('R16', true, true),
      phase('R8', true, true),
      phase('R4', true, true),
      phase('R2', true, false),
      phase('FINAL', false, false),
    ])

    const final = getHighestOpenUnlockedPhase([
      phase('LEAGUE', true, true),
      phase('R16', true, true),
      phase('R8', true, true),
      phase('R4', true, true),
      phase('R2', true, true),
      phase('FINAL', true, false),
    ])

    expect(r4).toBe('R4')
    expect(r2).toBe('R2')
    expect(final).toBe('FINAL')
  })
})
