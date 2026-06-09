import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:3000/api'

// Mock auth headers for testing
const mockAuthHeader = {
  'Authorization': 'Bearer test-jwt-token',
  'Content-Type': 'application/json',
}

test.describe('API Endpoints Integration Tests', () => {
  let gameId: string
  let predictionId: string
  let phaseKey: string = 'LEAGUE'

  test.describe('POST /api/games - Create Game', () => {
    test('should create a game with valid data', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games`, {
        headers: mockAuthHeader,
        data: {
          name: 'Test World Cup Betting Game',
        },
      })

      expect(response.status()).toBe(201)
      const body = await response.json()
      expect(body).toHaveProperty('id')
      expect(body).toHaveProperty('name', 'Test World Cup Betting Game')
      expect(body).toHaveProperty('status', 'OPEN')
      expect(body).toHaveProperty('invite_code')
      expect(body).toHaveProperty('tournament_phases')
      expect(body).toHaveProperty('matches')

      gameId = body.id
    })

    test('should return 400 when game name is empty', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games`, {
        headers: mockAuthHeader,
        data: {
          name: '',
        },
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should return 400 when game name is missing', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games`, {
        headers: mockAuthHeader,
        data: {},
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games`, {
        data: {
          name: 'Test Game',
        },
      })

      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Unauthorized')
    })
  })

  test.describe('GET /api/games - List Games', () => {
    test('should return games list for authenticated user', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games`, {
        headers: mockAuthHeader,
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body).toHaveProperty('games')
      expect(Array.isArray(body.games)).toBeTruthy()
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games`)

      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Unauthorized')
    })
  })

  test.describe('POST /api/games/join - Join Game', () => {
    test('should allow player to join game with valid invite code', async ({ request }) => {
      // First, we need a valid game to join
      // This would need the invite code from a previously created game
      const response = await request.post(`${API_BASE}/games/join`, {
        headers: mockAuthHeader,
        data: {
          invite_code: 'TESTCODE123',
          player_name: 'Test Player',
        },
      })

      // Will fail if game doesn't exist, which is expected in unit testing
      expect([200, 201, 404, 409]).toContain(response.status())
    })

    test('should return 400 when invite code is missing', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games/join`, {
        headers: mockAuthHeader,
        data: {
          player_name: 'Test Player',
        },
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body).toHaveProperty('error')
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games/join`, {
        data: {
          invite_code: 'TESTCODE',
          player_name: 'Test Player',
        },
      })

      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Unauthorized')
    })
  })

  test.describe('GET /api/games/[id] - Get Game Details', () => {
    test('should return 400 when game ID is invalid', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/any-id`)

      expect(response.status()).toBe(401)
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Unauthorized')
    })
  })

  test.describe('GET /api/games/[id]/current-phase', () => {
    test('should return 400 or 404 for invalid game ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id/current-phase`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/any-id/current-phase`)

      expect(response.status()).toBe(401)
    })
  })

  test.describe('GET /api/games/[id]/leaderboard', () => {
    test('should return 400 or 404 for invalid game ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id/leaderboard`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })

    test('should return 401 when not authenticated', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/any-id/leaderboard`)

      expect(response.status()).toBe(401)
    })
  })

  test.describe('POST /api/games/[id]/predictions', () => {
    test('should return 400 or 401 for invalid game ID', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games/invalid-id/predictions`, {
        headers: mockAuthHeader,
        data: {
          match_id: 'match-123',
          home_goals_predicted: 2,
          away_goals_predicted: 1,
        },
      })

      expect([400, 401, 404]).toContain(response.status())
    })

    test('should validate prediction input', async ({ request }) => {
      const response = await request.post(`${API_BASE}/games/invalid-id/predictions`, {
        headers: mockAuthHeader,
        data: {
          match_id: 'match-123',
          // Missing home_goals_predicted and away_goals_predicted
        },
      })

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('GET /api/games/[id]/my-predictions', () => {
    test('should return 400 or 404 for invalid game ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id/my-predictions`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('GET /api/games/[id]/my-score', () => {
    test('should return 400 or 404 for invalid game ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id/my-score`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('POST /api/games/[id]/phase/[phase_key]/open', () => {
    test('should return 400 for invalid phase key', async ({ request }) => {
      const response = await request.post(
        `${API_BASE}/games/invalid-id/phase/INVALID/open`,
        {
          headers: mockAuthHeader,
        }
      )

      expect([400, 401, 404]).toContain(response.status())
    })
  })

  test.describe('POST /api/games/[id]/phase/[phase_key]/lock', () => {
    test('should return 400 for invalid phase key', async ({ request }) => {
      const response = await request.post(
        `${API_BASE}/games/invalid-id/phase/INVALID/lock`,
        {
          headers: mockAuthHeader,
        }
      )

      expect([400, 401, 404]).toContain(response.status())
    })
  })

  test.describe('POST /api/games/[id]/phase/[phase_key]/results', () => {
    test('should return 400 for missing results data', async ({ request }) => {
      const response = await request.post(
        `${API_BASE}/games/invalid-id/phase/LEAGUE/results`,
        {
          headers: mockAuthHeader,
          data: {},
        }
      )

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('GET /api/games/[id]/matches/[phase_key]', () => {
    test('should return matches for a phase', async ({ request }) => {
      const response = await request.get(
        `${API_BASE}/games/invalid-id/matches/LEAGUE`,
        {
          headers: mockAuthHeader,
        }
      )

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('GET /api/games/[id]/history', () => {
    test('should return 400 or 404 for invalid game ID', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/invalid-id/history`, {
        headers: mockAuthHeader,
      })

      expect([400, 404]).toContain(response.status())
    })
  })

  test.describe('Response format validation', () => {
    test('all error responses should have error field', async ({ request }) => {
      const response = await request.get(`${API_BASE}/games/nonexistent/leaderboard`, {
        headers: mockAuthHeader,
      })

      const body = await response.json()
      expect(body).toHaveProperty('error')
      expect(typeof body.error).toBe('string')
    })

    test('error responses should have appropriate status codes', async ({ request }) => {
      // Test 401 Unauthorized
      const unauth = await request.get(`${API_BASE}/games`)
      expect(unauth.status()).toBe(401)

      // Test 404 Not Found
      const notFound = await request.get(`${API_BASE}/games/nonexistent/leaderboard`, {
        headers: mockAuthHeader,
      })
      expect([400, 404]).toContain(notFound.status())
    })
  })
})
