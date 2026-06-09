import { PhaseScore, TournamentPhase } from './types';

const PHASE_MULTIPLIER: Record<TournamentPhase, number> = {
  LEAGUE: 1,
  '1/16': 1,
  '1/8': 1,
  '1/4': 1,
  '1/2': 1,
  FINAL: 3,
};

export function calculatePhaseTotal(phaseKey: TournamentPhase, predictionScore: number, scorerScore: number): number {
  const multiplier = PHASE_MULTIPLIER[phaseKey] || 1;
  return (predictionScore + scorerScore) * multiplier;
}

export function calculateTotalScore(phaseScores: PhaseScore[]): number {
  return phaseScores.reduce((sum, phase) => sum + phase.phase_total, 0);
}

export function getPhaseName(phase: TournamentPhase): string {
  const names: Record<TournamentPhase, string> = {
    LEAGUE: 'League',
    '1/16': 'Round of 16',
    '1/8': 'Quarterfinals',
    '1/4': 'Quarterfinals',
    '1/2': 'Semifinals',
    FINAL: 'Final',
  };
  return names[phase] || phase;
}

export function getPhaseOrder(phase: TournamentPhase): number {
  const order: Record<TournamentPhase, number> = {
    LEAGUE: 1,
    '1/16': 2,
    '1/8': 3,
    '1/4': 4,
    '1/2': 5,
    FINAL: 6,
  };
  return order[phase] || 999;
}
