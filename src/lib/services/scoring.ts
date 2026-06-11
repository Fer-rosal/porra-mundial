import { SupabaseClient } from '@supabase/supabase-js'
import { PhaseScore } from '../types'

// Legacy inline type — the Leaderboard type was removed from types.ts when the
// DB-backed scoring tables were dropped. Keeping it here for backward compat.
interface Leaderboard {
  game_player_id: string
  player_name: string
  phase_1_score: number
  phase_2_score: number
  phase_3_score: number
  phase_4_score: number
  phase_5_score: number
  phase_6_score: number
  total_score: number
}

interface CalculationResult {
  phase_scores: PhaseScore[]
  leaderboard: Leaderboard[]
}

const PHASE_KEYS = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']
const PHASE_KEY_TO_INDEX: Record<string, number> = {
  LEAGUE: 1,
  R16: 2,
  R8: 3,
  R4: 4,
  R2: 5,
  FINAL: 6,
}

// Scoring rules
const EXACT_MATCH_POINTS_REGULAR = 3
const EXACT_MATCH_POINTS_FINAL = 8
const ONE_X_TWO_POINTS_REGULAR = 1
const ONE_X_TWO_POINTS_FINAL = 3
const SCORER_POINTS_REGULAR = 1
const SCORER_POINTS_FINAL = 2

function isFinalPhase(phaseKey: string): boolean {
  return phaseKey === 'FINAL'
}

function getPredictionScore(
  homePredicted: number,
  awayPredicted: number,
  homeActual: number,
  awayActual: number,
  phaseKey: string
): number {
  const isFinal = isFinalPhase(phaseKey)
  const exactMatchPoints = isFinal ? EXACT_MATCH_POINTS_FINAL : EXACT_MATCH_POINTS_REGULAR
  const oneX2Points = isFinal ? ONE_X_TWO_POINTS_FINAL : ONE_X_TWO_POINTS_REGULAR

  // Exact match
  if (homePredicted === homeActual && awayPredicted === awayActual) {
    return exactMatchPoints
  }

  // 1X2 match (home win, draw, away win)
  const predictedResult =
    homePredicted > awayPredicted ? 'H' : homePredicted < awayPredicted ? 'A' : 'D'
  const actualResult = homeActual > awayActual ? 'H' : homeActual < awayActual ? 'A' : 'D'

  if (predictedResult === actualResult) {
    return oneX2Points
  }

  return 0
}

// NOTE: This file is legacy — scorer_points and phase_scores tables were dropped in
// migration 002_supabase_sync.sql. Scoring is now computed client-side via local-scoring.ts.
export async function calculatePhaseScores(
  supabaseClient: SupabaseClient,
  gameId: string,
  phaseKey: string
): Promise<CalculationResult> {
  void supabaseClient, gameId, phaseKey, PHASE_KEYS
  throw new Error('calculatePhaseScores is no longer supported. Use local-scoring.ts instead.')
}
