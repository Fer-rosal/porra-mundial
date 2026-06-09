import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { successResponse, errorResponse, internalErrorResponse, unauthorizedResponse } from '@/lib/api-utils'
import { MATCH_DATA } from '@/lib/match-data'

// Generate a random 6-8 character alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  const length = Math.floor(Math.random() * 3) + 6 // 6-8 chars
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Retry logic for generating unique invite code
async function generateUniqueInviteCode(maxRetries: number = 5): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateInviteCode()
    const { data } = await supabase
      .from('games')
      .select('id')
      .eq('invite_code', code)
      .single()

    if (!data) {
      return code
    }
  }
  throw new Error('Failed to generate unique invite code')
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const body = await request.json()

    // Validate input
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      return errorResponse('Game name is required and must be non-empty', 400)
    }

    // Generate unique invite code
    const inviteCode = await generateUniqueInviteCode()

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        admin_id: user.sub,
        name: body.name.trim(),
        invite_code: inviteCode,
        tournament_phase: 'LEAGUE',
        status: 'OPEN',
      })
      .select()
      .single()

    if (gameError || !game) {
      return internalErrorResponse(gameError, 'POST /api/games - create game')
    }

    // Create 6 tournament phases
    const phases = ['LEAGUE', 'R16', 'R8', 'R4', 'R2', 'FINAL']
    const { data: createdPhases, error: phasesError } = await supabase
      .from('tournament_phases')
      .insert(
        phases.map((phase_key) => ({
          game_id: game.id,
          phase_key,
          is_open: false,
          is_locked: false,
        }))
      )
      .select()

    if (phasesError) {
      return internalErrorResponse(phasesError, 'POST /api/games - create phases')
    }

    // Populate 64 matches into respective phases
    const phaseMap = new Map(createdPhases?.map((p: any) => [p.phase_key, p.id]))
    const matchesToInsert = MATCH_DATA.map((m) => ({
      tournament_phase_id: phaseMap.get(m.phase_key),
      match_number: m.match_number,
      home_team: m.home_team,
      away_team: m.away_team,
      scheduled_at: m.scheduled_at,
      result_entered: false,
    }))

    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .insert(matchesToInsert)
      .select()

    if (matchesError) {
      return internalErrorResponse(matchesError, 'POST /api/games - seed matches')
    }

    // Return created game with phases and matches
    return successResponse(
      {
        id: game.id,
        admin_id: game.admin_id,
        name: game.name,
        invite_code: game.invite_code,
        status: game.status,
        tournament_phases: createdPhases,
        matches,
      },
      201
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'POST /api/games')
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    // Get games where user is admin
    const { data: adminGames, error: adminGamesError } = await supabase
      .from('games')
      .select('*')
      .eq('admin_id', user.sub)

    if (adminGamesError) {
      return internalErrorResponse(adminGamesError, 'GET /api/games - fetch admin games')
    }

    // Get games where user is a player
    const { data: playerGames, error: playerGamesError } = await supabase
      .from('game_players')
      .select('games!inner(*)')
      .eq('auth0_user_id', user.sub)

    if (playerGamesError) {
      return internalErrorResponse(playerGamesError, 'GET /api/games - fetch player games')
    }

    // Combine and deduplicate games
    const gameIds = new Set<string>()
    const games: any[] = []

    for (const game of adminGames || []) {
      if (!gameIds.has(game.id)) {
        gameIds.add(game.id)
        games.push(game)
      }
    }

    for (const pg of playerGames || []) {
      const game = (pg as any).games
      if (!gameIds.has(game.id)) {
        gameIds.add(game.id)
        games.push(game)
      }
    }

    // Add player count to each game
    const gamesWithPlayerCount = await Promise.all(
      games.map(async (game: any) => {
        const { count } = await supabase
          .from('game_players')
          .select('*', { count: 'exact' })
          .eq('game_id', game.id)

        return {
          id: game.id,
          name: game.name,
          status: game.status,
          admin_id: game.admin_id,
          player_count: count || 0,
          created_at: game.created_at,
        }
      })
    )

    return successResponse({ games: gamesWithPlayerCount })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse()
    }
    return internalErrorResponse(error, 'GET /api/games')
  }
}
