/**
 * E2E tests — Creator Admin Access Feature
 *
 * Verifies end-to-end that:
 * 1. Creator retains admin access after joining the same game as a named player
 * 2. Reclaim Admin Access button works for the creator in the same browser
 * 3. Non-creator players cannot access the admin panel
 * 4. Migration backfill works for old games (no creator key in localStorage)
 *
 * State seeding strategy (matches predictions-checkbox-save.spec.ts pattern):
 *   - Write localStorage values (game data + session/creator keys)
 *   - Then navigate to the target URL
 *   The React provider's useEffect reads localStorage on mount — seeding before
 *   the navigate ensures the data is available when the component mounts.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// ── localStorage helpers ──────────────────────────────────────────────────────

type LocalStore = {
  version: 1
  games: Record<string, unknown>
}

async function writeStore(page: Page, store: LocalStore): Promise<void> {
  await page.evaluate((s) => {
    localStorage.setItem('porra_mundial_store', JSON.stringify(s))
  }, store as unknown as Parameters<typeof page.evaluate>[1])
}

async function setSession(page: Page, gameId: string, sessionId: string): Promise<void> {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: `porra_mundial_session_${gameId}`, v: sessionId }
  )
}

async function setCreatorKey(page: Page, gameId: string, sessionId: string): Promise<void> {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: `porra_mundial_creator_${gameId}`, v: sessionId }
  )
}

async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key)
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GAME_ID = 'creator-access-game'
const CREATOR_SESSION = 'creator-session-id'
const PLAYER_SESSION = 'player-session-id'
const GAME_URL = `/games/${GAME_ID}`
const ADMIN_URL = `/games/${GAME_ID}/admin`
const ADMIN_PREDICTIONS_URL = `/games/${GAME_ID}/admin/predictions`

function makeGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    id: GAME_ID,
    name: 'Creator Access QA Game',
    inviteCode: 'CRQATST',
    creatorSessionId: CREATOR_SESSION,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
    players: [
      { sessionId: CREATOR_SESSION, name: 'Creator', joinedAt: now },
    ],
    phases: [
      { phaseKey: 'LEAGUE', isOpen: true, isLocked: false, openedAt: now, lockedAt: null },
      { phaseKey: 'R16', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R8', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R4', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R2', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'FINAL', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
    ],
    matches: [],
    predictions: [],
    scorerSelections: [],
    ...overrides,
  }
}

// ── Screenshot helpers ────────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, '../.webforge/agents/qa/screenshots')

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `creator-admin-access-${name}.png`),
    fullPage: true,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Creator Admin Access', () => {
  let ctx: BrowserContext
  let page: Page

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext()
    page = await ctx.newPage()
    await page.goto('/')  // warm up the app
  })

  test.afterAll(async () => {
    await ctx.close()
  })

  // ── Scenario 1: Creator has creator key → admin panel accessible ─────────────

  test('creator with creator key in localStorage can access admin panel', async () => {
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(GAME_URL)
    await expect(page.getByTestId('game-overview-page')).toBeVisible()

    await screenshot(page, 'game-overview-creator')

    // Admin Panel link should be visible in the header
    await expect(page.getByTestId('game-admin-link')).toBeVisible()

    // Creator Controls admin link on overview
    await expect(page.getByTestId('game-overview-admin-link')).toBeVisible()

    // Navigate to Admin Panel
    await page.goto(ADMIN_URL)
    await expect(page.getByTestId('admin-page')).toBeVisible()
    await expect(page.getByTestId('admin-access-denied')).not.toBeVisible()

    await screenshot(page, 'admin-panel-creator')
  })

  // ── Scenario 2: Creator joins as player — admin access retained ──────────────

  test('creator retains admin access after joining the game as a named player', async () => {
    const now = new Date().toISOString()
    const game = makeGame({
      players: [
        { sessionId: CREATOR_SESSION, name: 'Creator', joinedAt: now },
        { sessionId: PLAYER_SESSION, name: 'Creator as Player', joinedAt: now },
      ],
    })

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    // Creator joined as player: session key → new player sessionId
    await setSession(page, GAME_ID, PLAYER_SESSION)
    // But creator key still → original creator session
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(GAME_URL)
    await expect(page.getByTestId('game-overview-page')).toBeVisible()

    await screenshot(page, 'game-overview-after-join-as-player')

    // Admin Panel link must still be visible — creator key is separate from session key
    await expect(page.getByTestId('game-admin-link')).toBeVisible()

    await page.goto(ADMIN_URL)
    await expect(page.getByTestId('admin-page')).toBeVisible()
    await expect(page.getByTestId('admin-access-denied')).not.toBeVisible()

    await screenshot(page, 'admin-after-join-as-player')
  })

  // ── Scenario 3: Regular player cannot access admin panel ────────────────────

  test('regular player is denied access to admin panel', async () => {
    const now = new Date().toISOString()
    const game = makeGame({
      players: [
        { sessionId: CREATOR_SESSION, name: 'Creator', joinedAt: now },
        { sessionId: PLAYER_SESSION, name: 'Alice', joinedAt: now },
      ],
    })

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    // Regular player: no creator key, session = their own id
    await setSession(page, GAME_ID, PLAYER_SESSION)
    // Remove creator key (in case left from previous test)
    await page.evaluate(
      (k) => localStorage.removeItem(k),
      `porra_mundial_creator_${GAME_ID}`
    )

    await page.goto(GAME_URL)
    await expect(page.getByTestId('game-overview-page')).toBeVisible()

    await screenshot(page, 'game-overview-regular-player')

    // Admin Panel link should NOT be visible
    await expect(page.getByTestId('game-admin-link')).not.toBeVisible()

    await page.goto(ADMIN_URL)
    await expect(page.getByTestId('admin-access-denied')).toBeVisible()
    await expect(page.getByTestId('admin-page')).not.toBeVisible()

    await screenshot(page, 'admin-access-denied-player')
  })

  // ── Scenario 4: Migration — old game without creator key ─────────────────────

  test('migration: old game without creator key grants access when session IS the creator', async () => {
    const game = makeGame()

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    // Old game: session key = creator session, but NO creator key
    await setSession(page, GAME_ID, CREATOR_SESSION)
    // Remove creator key to simulate pre-fix state
    await page.evaluate(
      (k) => localStorage.removeItem(k),
      `porra_mundial_creator_${GAME_ID}`
    )

    await page.goto(GAME_URL)
    await expect(page.getByTestId('game-overview-page')).toBeVisible()

    // Admin Panel link should appear (migration path via session key)
    await expect(page.getByTestId('game-admin-link')).toBeVisible()

    await page.goto(ADMIN_URL)
    await expect(page.getByTestId('admin-page')).toBeVisible()

    await screenshot(page, 'admin-migration-backfill')

    // Verify backfill: creator key should now exist in localStorage
    const creatorKey = await getLocalStorageItem(page, `porra_mundial_creator_${GAME_ID}`)
    expect(creatorKey).toBe(CREATOR_SESSION)
  })

  // ── Scenario 5: Reclaim Admin Access button flow ─────────────────────────────

  test('Reclaim Admin Access button restores creator access in current session', async () => {
    const game = makeGame()

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    // Simulate: browser has the game data but creator key was lost
    // and the session key is missing too (user not logged in as any player)
    await page.evaluate((gId) => {
      localStorage.removeItem(`porra_mundial_session_${gId}`)
      localStorage.removeItem(`porra_mundial_creator_${gId}`)
    }, GAME_ID)

    await page.goto(GAME_URL)
    await expect(page.getByTestId('game-overview-page')).toBeVisible()

    await screenshot(page, 'reclaim-admin-card')

    // Reclaim card should be visible (not a creator, not reclaimed)
    await expect(page.getByTestId('game-reclaim-admin-card')).toBeVisible()

    // Click reclaim
    await page.getByTestId('game-reclaim-admin-btn').click()
    await page.waitForTimeout(300)

    await screenshot(page, 'reclaim-admin-after-click')

    // After reclaim: Creator Controls section should appear
    await expect(page.getByTestId('game-overview-admin-link')).toBeVisible()

    // Reclaim card should disappear
    await expect(page.getByTestId('game-reclaim-admin-card')).not.toBeVisible()
  })

  // ── Scenario 6: Admin sub-pages also enforce creator check ───────────────────

  test('admin/predictions page denies access to non-creator', async () => {
    const now = new Date().toISOString()
    const game = makeGame({
      players: [
        { sessionId: CREATOR_SESSION, name: 'Creator', joinedAt: now },
        { sessionId: PLAYER_SESSION, name: 'Bob', joinedAt: now },
      ],
    })

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)
    await page.evaluate(
      (k) => localStorage.removeItem(k),
      `porra_mundial_creator_${GAME_ID}`
    )

    await page.goto(ADMIN_PREDICTIONS_URL)
    await expect(page.getByTestId('admin-access-denied')).toBeVisible()

    await screenshot(page, 'admin-predictions-denied')
  })

  test('admin/predictions page allows creator access', async () => {
    const game = makeGame()

    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(ADMIN_PREDICTIONS_URL)
    await expect(page.getByTestId('admin-predictions-page')).toBeVisible()
    await expect(page.getByTestId('admin-access-denied')).not.toBeVisible()

    await screenshot(page, 'admin-predictions-creator')
  })

  // ── Scenario 7: Mobile viewport check ────────────────────────────────────────

  test('admin panel is accessible on mobile viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 })

    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(ADMIN_URL)
    await expect(page.getByTestId('admin-page')).toBeVisible()

    await screenshot(page, 'admin-panel-mobile')

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})
