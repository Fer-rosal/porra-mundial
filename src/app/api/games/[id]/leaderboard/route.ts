import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { auth0 } from '@/lib/auth'
import { successResponse, internalErrorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-utils'

const PHASE_KEY_TO_INDEX: Record<string, number> = {
  LEAGUE: 1,
  R16: 2,
  R8: 3,
  R4: 4,
  R2: 5,
  FINAL: 6,
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth0.getSession(request)
    if (!session) {
      return unauthorizedResponse()
    }
    const user = { sub: session.user.sub }
    const { id } = await params
    const gameId = id

    // Verify user is in game or admin
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', gameId)
      .eq('auth0_user_id', user.sub)
      .single()

    const { data: game } = await supabase
      .from('games')
      .select('admin_id')
      .eq('id', gameId)
      .single()

    if (!gamePlayer && game?.admin_id !== user.sub) {
      return forbiddenResponse()
    }

    // Fetch all game players
    const { data: gamePlayers, error: gpError } = await supabase
      .from('game_players')
      .select('id, auth0_user_id, total_score')
      .eq('game_id', gameId)

    if (gpError) {
      return internalErrorResponse(gpError, 'GET /api/games/:id/leaderboard - fetch players')
    }

    // Build leaderboard
    const leaderboard = await Promise.all(
      (gamePlayers || []).map(async (gp: any) => {
        // Fetch phase scores for this player
        const { data: phaseScores } = await supabase
          .from('phase_scores')
          .select('phase_total, tournament_phases!inner(phase_key)')
          .eq('game_player_id', gp.id)

        const leaderboardEntry: any = {
          game_player_id: gp.id,
          player_name: gp.auth0_user_id, // TODO: fetch actual name from Auth0 profile
          phase_1_score: 0,
          phase_2_score: 0,
          phase_3_score: 0,
          phase_4_score: 0,
          phase_5_score: 0,
          phase_6_score: 0,
          total_score: gp.total_score,
        }

        // Populate phase scores
        if (phaseScores) {
          for (const ps of phaseScores) {
            if (ps.tournament_phases) {
              const phaseIndex = PHASE_KEY_TO_INDEX[(ps.tournament_phases as any).phase_key]
              if (phaseIndex) {
                leaderboardEntry[`phase_${phaseIndex}_score`] = ps.phase_total || 0
              }
            }
          }
        }

        return leaderboardEntry
      })
    )

    // Sort by total_score DESC
    leaderboard.sort((a, b) => b.total_score - a.total_score)

    return successResponse(leaderboard)
  } catch (error) {
    
    return internalErrorResponse(error, 'GET /api/games/:id/leaderboard')
  }
}
