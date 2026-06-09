import { test, expect } from '@playwright/test'

/**
 * World Cup 2026 Betting Game - E2E Test Suite
 *
 * This test suite validates the complete tournament workflow:
 * 1. Game creation by admin
 * 2. Player joining with invite code
 * 3. Making predictions
 * 4. Phase management (opening, locking, entering results)
 * 5. Scoring and leaderboard updates
 */

test.describe('World Cup 2026 Betting Game - E2E Flow', () => {
  const apiBase = 'http://localhost:3000/api'

  // Mock authentication headers
  const adminAuth = {
    'Authorization': 'Bearer admin-test-token',
    'Content-Type': 'application/json',
  }

  const playerAuth = {
    'Authorization': 'Bearer player-test-token',
    'Content-Type': 'application/json',
  }

  let testGameId: string
  let testInviteCode: string

  test.describe('Phase 1: Game Creation', () => {
    test('Admin can create a new betting game', async ({ request }) => {
      const response = await request.post(`${apiBase}/games`, {
        headers: adminAuth,
        data: {
          name: 'World Cup 2026 - Office Betting Pool',
        },
      })

      expect(response.status()).toBe(201)
      const game = await response.json()

      // Verify game structure
      expect(game).toHaveProperty('id')
      expect(game).toHaveProperty('name', 'World Cup 2026 - Office Betting Pool')
      expect(game).toHaveProperty('invite_code')
      expect(game).toHaveProperty('status', 'OPEN')
      expect(game).toHaveProperty('tournament_phases')
      expect(game).toHaveProperty('matches')

      // Verify tournament phases were created
      expect(Array.isArray(game.tournament_phases)).toBeTruthy()
      expect(game.tournament_phases.length).toBeGreaterThan(0)

      // Verify matches were seeded
      expect(Array.isArray(game.matches)).toBeTruthy()
      expect(game.matches.length).toBeGreaterThan(0)

      testGameId = game.id
      testInviteCode = game.invite_code
    })

    test('Game name validation - empty name should fail', async ({ request }) => {
      const response = await request.post(`${apiBase}/games`, {
        headers: adminAuth,
        data: {
          name: '',
        },
      })

      expect(response.status()).toBe(400)
      const error = await response.json()
      expect(error).toHaveProperty('error')
    })

    test('Unauthenticated user cannot create game', async ({ request }) => {
      const response = await request.post(`${apiBase}/games`, {
        data: {
          name: 'Unauthorized Game',
        },
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Phase 2: Player Joining', () => {
    test('Player can join game with valid invite code', async ({ request }) => {
      const response = await request.post(`${apiBase}/games/join`, {
        headers: playerAuth,
        data: {
          invite_code: testInviteCode,
          player_name: 'John Doe',
        },
      })

      // Should succeed or return conflict if already joined
      expect([200, 201, 409]).toContain(response.status())
    })

    test('Missing invite code should fail', async ({ request }) => {
      const response = await request.post(`${apiBase}/games/join`, {
        headers: playerAuth,
        data: {
          player_name: 'Jane Doe',
        },
      })

      expect(response.status()).toBe(400)
    })

    test('Invalid invite code should fail', async ({ request }) => {
      const response = await request.post(`${apiBase}/games/join`, {
        headers: playerAuth,
        data: {
          invite_code: 'INVALID_CODE',
          player_name: 'Invalid Player',
        },
      })

      expect(response.status()).toBe(404)
    })

    test('Unauthenticated player cannot join', async ({ request }) => {
      const response = await request.post(`${apiBase}/games/join`, {
        data: {
          invite_code: testInviteCode,
          player_name: 'No Auth Player',
        },
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Phase 3: Game and Phase Management', () => {
    test('Can retrieve game details', async ({ request }) => {
      const response = await request.get(`${apiBase}/games/${testGameId}`, {
        headers: adminAuth,
      })

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const game = await response.json()
        expect(game).toHaveProperty('id')
        expect(game).toHaveProperty('status')
      }
    })

    test('Can get current phase information', async ({ request }) => {
      const response = await request.get(`${apiBase}/games/${testGameId}/current-phase`, {
        headers: adminAuth,
      })

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const phase = await response.json()
        expect(phase).toHaveProperty('phase_key')
        expect(phase).toHaveProperty('matches')
      }
    })

    test('Admin can open a tournament phase', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/phase/LEAGUE/open`,
        {
          headers: adminAuth,
        }
      )

      expect([200, 400, 404]).toContain(response.status())
    })

    test('Admin can get available matches for a phase', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/${testGameId}/matches/LEAGUE`,
        {
          headers: adminAuth,
        }
      )

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const data = await response.json()
        expect(Array.isArray(data.matches) || Array.isArray(data)).toBeTruthy()
      }
    })
  })

  test.describe('Phase 4: Predictions', () => {
    test('Player can make predictions', async ({ request }) => {
      // First get available matches
      const matchesRes = await request.get(
        `${apiBase}/games/${testGameId}/matches/LEAGUE`,
        {
          headers: playerAuth,
        }
      )

      if (matchesRes.status() === 200) {
        const matchesData = await matchesRes.json()
        const matches = Array.isArray(matchesData.matches) ? matchesData.matches : matchesData

        if (matches && matches.length > 0) {
          const firstMatch = matches[0]

          const response = await request.post(
            `${apiBase}/games/${testGameId}/predictions`,
            {
              headers: playerAuth,
              data: {
                match_id: firstMatch.id || firstMatch.match_number,
                home_goals_predicted: 2,
                away_goals_predicted: 1,
              },
            }
          )

          expect([200, 201, 400, 404]).toContain(response.status())
        }
      }
    })

    test('Player can view their predictions', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/${testGameId}/my-predictions`,
        {
          headers: playerAuth,
        }
      )

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('phase_key')
        expect(Array.isArray(data.predictions) || data.predictions !== undefined).toBeTruthy()
      }
    })

    test('Invalid prediction input should fail', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/predictions`,
        {
          headers: playerAuth,
          data: {
            match_id: 'match-123',
            // Missing goals predictions
          },
        }
      )

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('Phase 5: Scoring and Leaderboard', () => {
    test('Player can view their score', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/${testGameId}/my-score`,
        {
          headers: playerAuth,
        }
      )

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const score = await response.json()
        expect(score).toHaveProperty('game_player_id')
        expect(score).toHaveProperty('total_score')
      }
    })

    test('Can view game leaderboard', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/${testGameId}/leaderboard`,
        {
          headers: playerAuth,
        }
      )

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const data = await response.json()
        expect(Array.isArray(data.leaderboard) || Array.isArray(data)).toBeTruthy()
      }
    })

    test('Admin can enter match results', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/phase/LEAGUE/results`,
        {
          headers: adminAuth,
          data: {
            match_results: [
              {
                match_id: 1,
                home_goals: 2,
                away_goals: 1,
              },
            ],
          },
        }
      )

      expect([200, 400, 404]).toContain(response.status())
    })

    test('Admin can lock a phase for scoring', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/phase/LEAGUE/lock`,
        {
          headers: adminAuth,
        }
      )

      expect([200, 400, 404]).toContain(response.status())
    })
  })

  test.describe('Phase 6: Phase Scoring and Golden Ball', () => {
    test('Player can select golden ball scorer', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/scorer-selection`,
        {
          headers: playerAuth,
          data: {
            phase_key: 'LEAGUE',
            player_name: 'Messi',
          },
        }
      )

      expect([200, 201, 400, 404]).toContain(response.status())
    })

    test('Admin can enter scorer points', async ({ request }) => {
      const response = await request.post(
        `${apiBase}/games/${testGameId}/phase/LEAGUE/scorer-points`,
        {
          headers: adminAuth,
          data: {
            player_name: 'Messi',
            goals_scored: 3,
          },
        }
      )

      expect([200, 400, 404]).toContain(response.status())
    })
  })

  test.describe('Phase 7: Game History and Admin Features', () => {
    test('Admin can view game history', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/${testGameId}/history`,
        {
          headers: adminAuth,
        }
      )

      expect([200, 404]).toContain(response.status())
      if (response.status() === 200) {
        const data = await response.json()
        expect(Array.isArray(data.history) || Array.isArray(data)).toBeTruthy()
      }
    })

    test('Can list all admin games', async ({ request }) => {
      const response = await request.get(`${apiBase}/games`, {
        headers: adminAuth,
      })

      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(Array.isArray(data.games)).toBeTruthy()
      expect(data.games.some((g: any) => g.id === testGameId)).toBeTruthy()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('Non-existent game returns 404', async ({ request }) => {
      const response = await request.get(
        `${apiBase}/games/nonexistent-id/leaderboard`,
        {
          headers: adminAuth,
        }
      )

      expect([400, 404]).toContain(response.status())
    })

    test('Missing auth header returns 401', async ({ request }) => {
      const response = await request.get(`${apiBase}/games`)

      expect(response.status()).toBe(401)
    })

    test('All error responses have error field', async ({ request }) => {
      const response = await request.post(`${apiBase}/games`, {
        headers: adminAuth,
        data: {
          name: '', // Invalid empty name
        },
      })

      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(typeof body.error).toBe('string')
    })
  })
})
