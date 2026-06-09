#!/usr/bin/env node

/**
 * API Integration Tests
 * Tests all 16 endpoints with various scenarios
 */

const http = require('http')
const https = require('https')

const API_BASE = 'http://localhost:3000/api'

// Mock auth tokens
const mockAuthHeader = 'Bearer test-token'
const mockPlayerAuth = 'Bearer player-token'

let testsPassed = 0
let testsFailed = 0
let testGameId = null
let testInviteCode = null

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body))
    }

    const req = client.request(url, options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null
          resolve({
            status: res.statusCode,
            body: parsed,
            headers: res.headers,
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers,
          })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function test(name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
    testsPassed++
  } catch (error) {
    console.error(`✗ ${name}`)
    console.error(`  Error: ${error.message}`)
    testsFailed++
  }
}

async function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

async function assertStatusCode(response, expectedStatus, message) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `${message}: expected status ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(response.body)}`
    )
  }
}

async function assertStatusIn(response, expectedStatuses, message) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${message}: expected status in [${expectedStatuses.join(', ')}], got ${response.status}`
    )
  }
}

async function assertHasProperty(obj, prop, message) {
  if (!obj.hasOwnProperty(prop)) {
    throw new Error(`${message}: expected property '${prop}' not found`)
  }
}

async function runTests() {
  console.log('🧪 Starting API Integration Tests\n')

  // Test 1: POST /api/games - Create Game
  console.log('--- Phase 1: Game Creation ---')

  await test('POST /api/games - Create game with valid data', async () => {
    const response = await makeRequest('POST', '/games', {
      Authorization: mockAuthHeader,
    }, {
      name: 'Test World Cup Betting Game',
    })

    assertStatusCode(response, 201, 'Create game')
    await assertHasProperty(response.body, 'id', 'Game response')
    await assertHasProperty(response.body, 'invite_code', 'Game response')
    await assertHasProperty(response.body, 'status', 'Game response')
    await assertHasProperty(response.body, 'tournament_phases', 'Game response')
    await assertHasProperty(response.body, 'matches', 'Game response')

    testGameId = response.body.id
    testInviteCode = response.body.invite_code
  })

  await test('POST /api/games - Empty name should fail', async () => {
    const response = await makeRequest('POST', '/games', {
      Authorization: mockAuthHeader,
    }, {
      name: '',
    })

    assertStatusCode(response, 400, 'Empty name validation')
    await assertHasProperty(response.body, 'error', 'Error response')
  })

  await test('POST /api/games - Missing name should fail', async () => {
    const response = await makeRequest('POST', '/games', {
      Authorization: mockAuthHeader,
    }, {})

    assertStatusCode(response, 400, 'Missing name validation')
  })

  await test('POST /api/games - Unauthenticated request fails', async () => {
    const response = await makeRequest('POST', '/games', {}, {
      name: 'Unauthorized Game',
    })

    assertStatusCode(response, 401, 'Unauthenticated request')
  })

  // Test 2: GET /api/games - List Games
  console.log('\n--- Phase 2: Game Listing ---')

  await test('GET /api/games - List games for authenticated user', async () => {
    const response = await makeRequest('GET', '/games', {
      Authorization: mockAuthHeader,
    })

    assertStatusCode(response, 200, 'List games')
    await assertHasProperty(response.body, 'games', 'Games list response')
  })

  await test('GET /api/games - Unauthenticated fails', async () => {
    const response = await makeRequest('GET', '/games')
    assertStatusCode(response, 401, 'Unauthenticated list')
  })

  // Test 3: POST /api/games/join - Join Game
  console.log('\n--- Phase 3: Player Joining ---')

  await test('POST /api/games/join - Invalid invite code fails', async () => {
    const response = await makeRequest('POST', '/games/join', {
      Authorization: mockPlayerAuth,
    }, {
      invite_code: 'INVALID_CODE_12345',
      player_name: 'Test Player',
    })

    assertStatusCode(response, 404, 'Invalid invite code')
  })

  await test('POST /api/games/join - Missing invite code fails', async () => {
    const response = await makeRequest('POST', '/games/join', {
      Authorization: mockPlayerAuth,
    }, {
      player_name: 'Test Player',
    })

    assertStatusCode(response, 400, 'Missing invite code')
  })

  await test('POST /api/games/join - Unauthenticated fails', async () => {
    const response = await makeRequest('POST', '/games/join', {}, {
      invite_code: testInviteCode || 'TEST',
      player_name: 'Test Player',
    })

    assertStatusCode(response, 401, 'Unauthenticated join')
  })

  // Test 4: GET /api/games/[id] - Get Game Details
  console.log('\n--- Phase 4: Game Details ---')

  await test('GET /api/games/[id] - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game ID')
  })

  await test('GET /api/games/[id] - Unauthenticated fails', async () => {
    const response = await makeRequest('GET', '/games/any-id')
    assertStatusCode(response, 401, 'Unauthenticated get game')
  })

  // Test 5: GET /api/games/[id]/current-phase
  console.log('\n--- Phase 5: Current Phase ---')

  await test('GET /api/games/[id]/current-phase - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/current-phase', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for current phase')
  })

  await test('GET /api/games/[id]/current-phase - Unauthenticated fails', async () => {
    const response = await makeRequest('GET', '/games/any-id/current-phase')
    assertStatusCode(response, 401, 'Unauthenticated current phase')
  })

  // Test 6: POST /api/games/[id]/predictions
  console.log('\n--- Phase 6: Predictions ---')

  await test('POST /api/games/[id]/predictions - Invalid game ID fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/predictions', {
      Authorization: mockAuthHeader,
    }, {
      match_id: 'match-1',
      home_goals_predicted: 2,
      away_goals_predicted: 1,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for predictions')
  })

  await test('POST /api/games/[id]/predictions - Unauthenticated fails', async () => {
    const response = await makeRequest('POST', '/games/any-id/predictions', {}, {
      match_id: 'match-1',
      home_goals_predicted: 2,
      away_goals_predicted: 1,
    })

    assertStatusCode(response, 401, 'Unauthenticated predictions')
  })

  // Test 7: GET /api/games/[id]/my-predictions
  console.log('\n--- Phase 7: My Predictions ---')

  await test('GET /api/games/[id]/my-predictions - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/my-predictions', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for my predictions')
  })

  // Test 8: GET /api/games/[id]/my-score
  console.log('\n--- Phase 8: My Score ---')

  await test('GET /api/games/[id]/my-score - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/my-score', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for my score')
  })

  // Test 9: GET /api/games/[id]/leaderboard
  console.log('\n--- Phase 9: Leaderboard ---')

  await test('GET /api/games/[id]/leaderboard - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/leaderboard', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for leaderboard')
  })

  await test('GET /api/games/[id]/leaderboard - Unauthenticated fails', async () => {
    const response = await makeRequest('GET', '/games/any-id/leaderboard')
    assertStatusCode(response, 401, 'Unauthenticated leaderboard')
  })

  // Test 10: Phase management endpoints
  console.log('\n--- Phase 10: Phase Management ---')

  await test('POST /api/games/[id]/phase/[phase_key]/open - Invalid phase fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/phase/INVALID/open', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 401, 404], 'Invalid phase open')
  })

  await test('POST /api/games/[id]/phase/[phase_key]/lock - Invalid phase fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/phase/INVALID/lock', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 401, 404], 'Invalid phase lock')
  })

  await test('POST /api/games/[id]/phase/[phase_key]/results - Missing data fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/phase/LEAGUE/results', {
      Authorization: mockAuthHeader,
    }, {})

    assertStatusIn(response, [400, 404], 'Invalid results submission')
  })

  // Test 11: Matches and Matches
  console.log('\n--- Phase 11: Matches ---')

  await test('GET /api/games/[id]/matches/[phase_key] - Invalid game fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/matches/LEAGUE', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for matches')
  })

  // Test 12: Scorer Selection
  console.log('\n--- Phase 12: Scorer Selection ---')

  await test('POST /api/games/[id]/scorer-selection - Invalid game fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/scorer-selection', {
      Authorization: mockAuthHeader,
    }, {
      phase_key: 'LEAGUE',
      player_name: 'Messi',
    })

    assertStatusIn(response, [400, 404], 'Invalid game for scorer selection')
  })

  // Test 13: Scorer Points
  console.log('\n--- Phase 13: Scorer Points ---')

  await test('POST /api/games/[id]/phase/[phase_key]/scorer-points - Invalid data fails', async () => {
    const response = await makeRequest('POST', '/games/invalid-id/phase/LEAGUE/scorer-points', {
      Authorization: mockAuthHeader,
    }, {})

    assertStatusIn(response, [400, 404], 'Invalid scorer points data')
  })

  // Test 14: History
  console.log('\n--- Phase 14: Game History ---')

  await test('GET /api/games/[id]/history - Invalid ID fails', async () => {
    const response = await makeRequest('GET', '/games/invalid-id/history', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid game for history')
  })

  // Test 15: Predictions delete
  console.log('\n--- Phase 15: Delete Prediction ---')

  await test('DELETE /api/games/[id]/predictions/[prediction_id] - Invalid fails', async () => {
    const response = await makeRequest('DELETE', '/games/invalid-id/predictions/pred-123', {
      Authorization: mockAuthHeader,
    })

    assertStatusIn(response, [400, 404], 'Invalid prediction delete')
  })

  // Summary
  console.log('\n════════════════════════════════════════')
  console.log(`✓ Passed: ${testsPassed}`)
  console.log(`✗ Failed: ${testsFailed}`)
  console.log(`Total: ${testsPassed + testsFailed}`)
  console.log('════════════════════════════════════════\n')

  process.exit(testsFailed > 0 ? 1 : 0)
}

// Run tests with a small delay to ensure server is ready
setTimeout(runTests, 2000)
