import type { PhaseKey } from './game-store'

export const PHASE_ORDER: PhaseKey[] = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']

export function normalizePhaseKey(raw: string): PhaseKey | null {
  const normalized = raw.trim().toUpperCase()
  if (normalized === 'LEAGUE') return 'LEAGUE'
  if (normalized === 'R16' || normalized === '1/16') return 'R16'
  if (normalized === 'R8' || normalized === '1/8') return 'R8'
  if (normalized === 'R4' || normalized === '1/4') return 'R4'
  if (normalized === 'R2' || normalized === '1/2') return 'R2'
  if (normalized === 'FINAL') return 'FINAL'
  return null
}

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
