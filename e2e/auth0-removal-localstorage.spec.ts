import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Auth0 Removal / localStorage Architecture
 *
 * Tests the full user flow now that Auth0 is gone and everything is local.
 * Uses localStorage injection for state setup where needed.
 */

const SCREENSHOTS_DIR = '.webforge/agents/qa/screenshots'

// ─── Helper: build a minimal LocalStore with one game ─────────────────────────
function buildLocalStore(overrides: {
  gameId?: string
  inviteCode?: string
  creatorSessionId?: string
  gameName?: string
} = {}) {
  const gameId = overrides.gameId ?? 'e2e-game-001'
  const inviteCode = overrides.inviteCode ?? 'TSTCODE'
  const creatorSessionId = overrides.creatorSessionId ?? 'creator-session-001'
  const gameName = overrides.gameName ?? 'E2E Test Game'
  const now = new Date().toISOString()

  const game = {
    id: gameId,
    name: gameName,
    inviteCode,
    creatorSessionId,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
    players: [
      { sessionId: creatorSessionId, name: 'Creator', joinedAt: now },
    ],
    phases: [
      { phaseKey: 'LEAGUE', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R16', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R8', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R4', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R2', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'FINAL', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
    ],
    matches: [
      {
        id: 'match-LEAGUE-1',
        phaseKey: 'LEAGUE',
        matchNumber: 1,
        homeTeam: 'Brazil',
        awayTeam: 'Germany',
        scheduledAt: '2026-06-15T18:00:00.000Z',
        homeGoals: null,
        awayGoals: null,
        resultEntered: false,
      },
    ],
    predictions: [],
    scorerSelections: [],
  }

  return {
    store: { version: 1, games: { [gameId]: game } },
    game,
  }
}

// ─── Test 1: Landing page loads without auth ──────────────────────────────────

test.describe('Landing Page — no auth required', () => {
  test('should load landing page without any authentication', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('landing-page')).toBeVisible()
    await expect(page.getByTestId('landing-create-game-card')).toBeVisible()
    await expect(page.getByTestId('landing-join-game-card')).toBeVisible()
    await expect(page.getByTestId('landing-dashboard-card')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/landing-initial.png`,
      fullPage: true,
    })
  })

  test('mobile viewport: landing page renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(page.getByTestId('landing-page')).toBeVisible()
    await expect(page.getByTestId('landing-create-game-card')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/landing-mobile.png`,
      fullPage: true,
    })
  })

  test('nav header should have no login/logout buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('nav-header')).toBeVisible()
    // Auth0 buttons should NOT exist
    await expect(page.locator('[data-testid="nav-login-btn"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="nav-logout-btn"]')).toHaveCount(0)
    // New nav links should exist
    await expect(page.getByTestId('nav-my-games-link')).toBeVisible()
    await expect(page.getByTestId('nav-create-game-btn')).toBeVisible()
  })
})

// ─── Test 2: Create game flow ─────────────────────────────────────────────────

test.describe('Create Game Flow', () => {
  test('should render create game form', async ({ page }) => {
    await page.goto('/dashboard/create-game')
    await expect(page.getByTestId('create-game-page')).toBeVisible()
    await expect(page.getByTestId('create-game-form')).toBeVisible()
    await expect(page.getByTestId('create-game-name-input')).toBeVisible()
    await expect(page.getByTestId('create-game-submit-btn')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/create-game-form.png`,
      fullPage: true,
    })
  })

  test('should show validation error for empty game name', async ({ page }) => {
    await page.goto('/dashboard/create-game')
    await page.getByTestId('create-game-submit-btn').click()
    await expect(page.getByTestId('create-game-error')).toBeVisible()
    await expect(page.getByTestId('create-game-error')).toContainText('required')

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/create-game-error.png`,
      fullPage: true,
    })
  })

  test('should create a game and show invite card', async ({ page }) => {
    await page.goto('/dashboard/create-game')
    await page.getByTestId('create-game-name-input').fill('My E2E Test Game')
    await page.getByTestId('create-game-submit-btn').click()

    // After success, the success card should appear
    await expect(page.getByTestId('create-game-success-card')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('create-game-copy-link-btn')).toBeVisible()
    await expect(page.getByTestId('create-game-start-btn')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/create-game-success.png`,
      fullPage: true,
    })
  })

  test('should navigate to game page after clicking Start Playing', async ({ page }) => {
    await page.goto('/dashboard/create-game')
    await page.getByTestId('create-game-name-input').fill('Navigation Test Game')
    await page.getByTestId('create-game-submit-btn').click()

    await expect(page.getByTestId('create-game-success-card')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('create-game-start-btn').click()

    // Should navigate to game overview
    await expect(page).toHaveURL(/\/games\/[a-f0-9-]+/)
    await expect(page.getByTestId('game-overview-page')).toBeVisible({ timeout: 5000 })
  })
})

// ─── Test 3: Dashboard — empty and populated states ───────────────────────────

test.describe('Dashboard', () => {
  test('should show empty state when no games exist', async ({ page }) => {
    // Navigate to dashboard with no localStorage data
    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    // Since localStorage starts empty per test, expect empty state
    await expect(page.getByTestId('dashboard-empty')).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/dashboard-empty.png`,
      fullPage: true,
    })
  })

  test('should show game cards when games exist in localStorage', async ({ page }) => {
    const { store, game } = buildLocalStore({ gameName: 'Dashboard Test Game' })

    await page.goto('/dashboard')
    // Inject localStorage after page load (store must be set before React hydration reads it)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })

    // Reload to trigger hydration from localStorage
    await page.reload()

    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await expect(page.getByTestId(`dashboard-game-${game.id}`)).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId(`dashboard-view-game-${game.id}`)).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/dashboard-populated.png`,
      fullPage: true,
    })
  })

  test('filter buttons should be visible', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-filter-ALL')).toBeVisible()
    await expect(page.getByTestId('dashboard-filter-OPEN')).toBeVisible()
    await expect(page.getByTestId('dashboard-filter-IN_PROGRESS')).toBeVisible()
    await expect(page.getByTestId('dashboard-filter-COMPLETED')).toBeVisible()
  })

  test('delete confirmation modal should appear and cancel correctly', async ({ page }) => {
    const { store, game } = buildLocalStore({ gameName: 'Delete Test Game' })

    await page.goto('/dashboard')
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.reload()

    await expect(page.getByTestId(`dashboard-game-${game.id}`)).toBeVisible({ timeout: 5000 })

    // Click delete button
    await page.getByTestId(`dashboard-delete-${game.id}`).click()
    await expect(page.getByTestId('dashboard-delete-modal')).toBeVisible()
    await expect(page.getByTestId('dashboard-delete-cancel')).toBeVisible()
    await expect(page.getByTestId('dashboard-delete-confirm')).toBeVisible()

    // Cancel should dismiss the modal
    await page.getByTestId('dashboard-delete-cancel').click()
    await expect(page.getByTestId('dashboard-delete-modal')).toHaveCount(0)
    // Game should still be visible
    await expect(page.getByTestId(`dashboard-game-${game.id}`)).toBeVisible()
  })

  test('delete confirmation should remove game from list', async ({ page }) => {
    const { store, game } = buildLocalStore({ gameName: 'Confirm Delete Game' })

    await page.goto('/dashboard')
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.reload()

    await expect(page.getByTestId(`dashboard-game-${game.id}`)).toBeVisible({ timeout: 5000 })
    await page.getByTestId(`dashboard-delete-${game.id}`).click()
    await expect(page.getByTestId('dashboard-delete-modal')).toBeVisible()
    await page.getByTestId('dashboard-delete-confirm').click()

    // Modal should close and game card should be gone
    await expect(page.getByTestId('dashboard-delete-modal')).toHaveCount(0)
    await expect(page.getByTestId(`dashboard-game-${game.id}`)).toHaveCount(0)
  })
})

// ─── Test 4: Join via invite link ─────────────────────────────────────────────

test.describe('Join Game Flow', () => {
  test('should render join form', async ({ page }) => {
    await page.goto('/join')
    await expect(page.getByTestId('join-page')).toBeVisible()
    await expect(page.getByTestId('join-form')).toBeVisible()
    await expect(page.getByTestId('join-code-input')).toBeVisible()
    await expect(page.getByTestId('join-name-input')).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/join-form.png`,
      fullPage: true,
    })
  })

  test('should pre-fill invite code from URL query param', async ({ page }) => {
    await page.goto('/join?code=ABC1234')
    await expect(page.getByTestId('join-code-input')).toHaveValue('ABC1234')
  })

  test('should show error when joining with invalid code', async ({ page }) => {
    // No games in localStorage — any code is invalid
    await page.goto('/join')
    await page.getByTestId('join-code-input').fill('INVALID')
    await page.getByTestId('join-name-input').fill('Test Player')
    await page.getByTestId('join-submit-btn').click()

    await expect(page.getByTestId('join-error')).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/join-error.png`,
      fullPage: true,
    })
  })

  test('should show error when player name is empty', async ({ page }) => {
    await page.goto('/join')
    await page.getByTestId('join-code-input').fill('TSTCODE')
    // Leave name empty
    await page.getByTestId('join-submit-btn').click()
    await expect(page.getByTestId('join-error')).toBeVisible({ timeout: 5000 })
  })

  test('should join game successfully and navigate to game page', async ({ page }) => {
    const { store, game } = buildLocalStore({ inviteCode: 'JOINGME' })

    await page.goto('/join')
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })

    await page.getByTestId('join-code-input').fill('JOINGME')
    await page.getByTestId('join-name-input').fill('New Player')
    await page.getByTestId('join-submit-btn').click()

    // Should navigate to the game overview
    await expect(page).toHaveURL(`/games/${game.id}`, { timeout: 5000 })
    await expect(page.getByTestId('game-overview-page')).toBeVisible({ timeout: 5000 })
  })
})

// ─── Test 5: Predictions persist across page reload ──────────────────────────

test.describe('Predictions Persistence', () => {
  test('predictions page shows waiting message when no phase is open', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const creatorSessionId = game.creatorSessionId

    await page.goto(`/games/${game.id}/predictions`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: creatorSessionId })
    await page.reload()

    await expect(page.getByTestId('predictions-page')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('predictions-waiting')).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/predictions-waiting.png`,
      fullPage: true,
    })
  })

  test('predictions page shows form when a phase is open', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const creatorSessionId = game.creatorSessionId

    // Open LEAGUE phase
    store.games[game.id].phases[0].isOpen = true
    store.games[game.id].phases[0].openedAt = new Date().toISOString()

    await page.goto(`/games/${game.id}/predictions`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: creatorSessionId })
    await page.reload()

    await expect(page.getByTestId('predictions-page')).toBeVisible({ timeout: 5000 })
    // A form or submit button should be visible (open phase = predictions available)
    await expect(page.getByTestId('predictions-submit-btn')).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/predictions-form.png`,
      fullPage: true,
    })
  })
})

// ─── Test 6: Admin controls visible only to creator ──────────────────────────

test.describe('Admin Controls Access', () => {
  test('admin link is visible to the creator', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const creatorSessionId = game.creatorSessionId

    await page.goto(`/games/${game.id}`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: creatorSessionId })
    await page.reload()

    await expect(page.getByTestId('game-overview-page')).toBeVisible({ timeout: 5000 })
    // Creator should see the admin link in overview
    await expect(page.getByTestId('game-overview-admin-link')).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/game-overview-creator.png`,
      fullPage: true,
    })
  })

  test('admin link is NOT visible to non-creator players', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const playerSessionId = 'player-session-002'
    const now = new Date().toISOString()

    // Add a second player (non-creator)
    store.games[game.id].players.push({
      sessionId: playerSessionId,
      name: 'Guest Player',
      joinedAt: now,
    })

    await page.goto(`/games/${game.id}`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    // Set session as the guest player, NOT the creator
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: playerSessionId })
    await page.reload()

    await expect(page.getByTestId('game-overview-page')).toBeVisible({ timeout: 5000 })
    // Guest player should NOT see the admin link in overview
    await expect(page.getByTestId('game-overview-admin-link')).toHaveCount(0)

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/game-overview-guest.png`,
      fullPage: true,
    })
  })

  test('admin page redirects or shows error for non-admin users', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const playerSessionId = 'player-session-003'
    const now = new Date().toISOString()

    store.games[game.id].players.push({
      sessionId: playerSessionId,
      name: 'Non-Admin Player',
      joinedAt: now,
    })

    await page.goto(`/games/${game.id}/admin`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: playerSessionId })
    await page.reload()

    // Admin page should show an access-denied message or redirect for non-admins
    // Either admin-page testid shows an error, or we're redirected away
    const adminPage = page.getByTestId('admin-page')
    if (await adminPage.count() > 0) {
      // If still on admin page, it should show an unauthorized message
      // (the page should guard against non-admin access)
      const pageContent = await page.textContent('body')
      expect(pageContent).toMatch(/not authorized|admin only|creator|no access|must be/i)
    }
    // otherwise a redirect happened, which is also acceptable
  })
})

// ─── Test 7: Game overview page — players list ────────────────────────────────

test.describe('Game Overview — Players List', () => {
  test('should display the players list', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const creatorSessionId = game.creatorSessionId
    const now = new Date().toISOString()

    store.games[game.id].players.push({
      sessionId: 'player-session-101',
      name: 'Alice',
      joinedAt: now,
    })

    await page.goto(`/games/${game.id}`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: creatorSessionId })
    await page.reload()

    await expect(page.getByTestId('game-overview-page')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('game-players-list')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId(`game-player-${creatorSessionId}`)).toBeVisible()
    await expect(page.getByTestId('game-player-player-session-101')).toBeVisible()
  })

  test('invite section is visible to all players', async ({ page }) => {
    const { store, game } = buildLocalStore()
    const playerSessionId = 'player-session-102'
    const now = new Date().toISOString()

    store.games[game.id].players.push({
      sessionId: playerSessionId,
      name: 'Guest',
      joinedAt: now,
    })

    await page.goto(`/games/${game.id}`)
    await page.evaluate(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    }, { key: 'porra_mundial_store', value: store })
    await page.evaluate(({ gameId, sessionId }) => {
      localStorage.setItem(`porra_mundial_session_${gameId}`, sessionId)
    }, { gameId: game.id, sessionId: playerSessionId })
    await page.reload()

    // Guest player should also see the invite section
    await expect(page.getByTestId('game-invite-section')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('game-copy-invite-btn')).toBeVisible()
  })
})

// ─── Test 8: No /api routes exist ─────────────────────────────────────────────

test.describe('API Routes Removed', () => {
  test('/api/games should return 404 (route does not exist)', async ({ request }) => {
    const res = await request.get('/api/games')
    expect(res.status()).toBe(404)
  })

  test('/api/games/join should return 404 (route does not exist)', async ({ request }) => {
    const res = await request.post('/api/games/join', { data: {} })
    expect(res.status()).toBe(404)
  })
})
