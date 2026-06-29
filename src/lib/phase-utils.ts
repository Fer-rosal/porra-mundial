import type { PhaseKey } from './game-store'

export const PHASE_ORDER: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

interface PhaseLike {
  phaseKey: PhaseKey
  isOpen: boolean
  isLocked: boolean
}

export function getHighestOpenUnlockedPhase(phases: PhaseLike[]): PhaseKey | null {
  const open = phases
    .filter((p) => p.isOpen && !p.isLocked)
    .sort((a, b) => PHASE_ORDER.indexOf(b.phaseKey) - PHASE_ORDER.indexOf(a.phaseKey))[0]

  return open?.phaseKey ?? null
}
