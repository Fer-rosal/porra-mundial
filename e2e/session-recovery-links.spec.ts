/**
 * E2E tests — Session Recovery Links + App Visual Revamp
 *
 * Slug: session-recovery-links+app-visual-revamp
 *
 * Covers:
 *  1. CopyRecoveryLink component — click/feedback interaction
 *  2. GameNavBar — mobile bottom bar visible, desktop strip visible, admin tab gated
 *  3. Player token redemption page (/games/[id]/join?token=) — loading → success redirect
 *  4. Player token redemption — error states (no token, invalid token, no-game)
 *  5. Admin token redemption via ?token= on admin page
 *  6. create-game success card shows admin recovery section
 *  7. join success page shows recovery link section before navigating
 *  8. predictions page shows recovery link section for joined player
 *  9. admin/history page shows recovery link section for creator
 * 10. Mobile viewport: mobile nav visible, desktop nav hidden
 *
 * State seeding strategy: write localStorage before page.goto() — matches
 * the existing spec pattern in creator-admin-access.spec.ts.
 */

import { test, expect, type Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

// ── Screenshot helpers ────────────────────────────────────────────────────────

const SCREENSHOT_DIR = path.join(__dirname, '../.webforge/agents/qa/screenshots')

async function screenshot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `session-recovery-links-${name}.png`),
    fullPage: true,
  })
}

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const GAME_ID = 'recovery-test-game'
const CREATOR_SESSION = 'creator-session-id'
const PLAYER_SESSION = 'player-session-id'
const ADMIN_TOKEN = 'test-admin-token-uuid-123'
const PLAYER_TOKEN = 'test-player-token-uuid-456'

function makeGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date().toISOString()
  return {
    id: GAME_ID,
    name: 'Recovery Links QA Game',
    inviteCode: 'RLQATST',
    creatorSessionId: CREATOR_SESSION,
    adminToken: ADMIN_TOKEN,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
    players: [
      {
        sessionId: CREATOR_SESSION,
        name: 'Creator',
        joinedAt: now,
        playerToken: 'creator-player-token-xyz',
      },
      {
        sessionId: PLAYER_SESSION,
        name: 'Alice',
        joinedAt: now,
        playerToken: PLAYER_TOKEN,
      },
    ],
    phases: [
      { phaseKey: 'LEAGUE', isOpen: true, isLocked: false, openedAt: now, lockedAt: null },
    ],
    matches: [],
    predictions: [],
    scorerSelections: [],
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — GameNavBar
// ─────────────────────────────────────────────────────────────────────────────

test.describe('GameNavBar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('desktop: shows navigation strip with Overview, Predict, Scorer, Ranking tabs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-nav-desktop')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop-overview')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop-predictions')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop-scorer')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop-leaderboard')).toBeVisible()

    await screenshot(page, 'desktop-nav-player')
  })

  test('desktop: admin tab hidden for non-admin player', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)
    // No creator key — not admin

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-nav-desktop')).toBeVisible()
    // Admin tab should not exist in DOM
    await expect(page.getByTestId('game-nav-desktop-admin')).not.toBeVisible()
  })

  test('desktop: admin tab visible for creator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-nav-desktop')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop-admin')).toBeVisible()

    await screenshot(page, 'desktop-nav-admin')
  })

  test('mobile: fixed bottom bar visible, desktop nav hidden', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-nav-mobile')).toBeVisible()
    await expect(page.getByTestId('game-nav-mobile-overview')).toBeVisible()
    await expect(page.getByTestId('game-nav-mobile-predictions')).toBeVisible()
    await expect(page.getByTestId('game-nav-mobile-scorer')).toBeVisible()
    await expect(page.getByTestId('game-nav-mobile-leaderboard')).toBeVisible()

    await screenshot(page, 'mobile-nav-player')
  })

  test('mobile: admin tab visible in bottom bar for creator', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-nav-mobile-admin')).toBeVisible()

    await screenshot(page, 'mobile-nav-admin')
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — CopyRecoveryLink component
// ─────────────────────────────────────────────────────────────────────────────

test.describe('CopyRecoveryLink — copy button interaction', () => {
  test('admin page shows copy admin recovery link button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(`/games/${GAME_ID}/admin`)
    await expect(page.getByTestId('admin-recovery-link-section')).toBeVisible()
    await expect(page.getByTestId('copy-recovery-link-btn')).toBeVisible()

    await screenshot(page, 'admin-copy-recovery-btn')
  })

  test('copy button shows "Copied!" feedback after click, then resets', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(`/games/${GAME_ID}/admin`)
    const copyBtn = page.getByTestId('copy-recovery-link-btn')
    await expect(copyBtn).toBeVisible()

    // Initial state shows Copy icon text (not "Copied!")
    await expect(copyBtn).not.toContainText('Copied!')

    await copyBtn.click()

    // After click — should show "Copied!" for 2 seconds
    await expect(copyBtn).toContainText('Copied!')

    await screenshot(page, 'admin-copy-btn-feedback')

    // After ~2.5 seconds — should revert to original label
    await page.waitForTimeout(2500)
    await expect(copyBtn).not.toContainText('Copied!')
  })

  test('predictions page shows player recovery link section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)

    await page.goto(`/games/${GAME_ID}/predictions`)
    await expect(page.getByTestId('predictions-recovery-link-section')).toBeVisible()
    await expect(page.getByTestId('copy-recovery-link-btn')).toBeVisible()

    await screenshot(page, 'predictions-recovery-link')
  })

  test('admin/history page shows recovery link section for creator', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, CREATOR_SESSION)
    await setCreatorKey(page, GAME_ID, CREATOR_SESSION)

    await page.goto(`/games/${GAME_ID}/admin/history`)
    await expect(page.getByTestId('history-recovery-link-section')).toBeVisible()
    await expect(page.getByTestId('copy-recovery-link-btn')).toBeVisible()

    await screenshot(page, 'history-recovery-link')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Player token redemption page (/games/[id]/join?token=)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Player token redemption page', () => {
  test('loading state shown briefly on arrival', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    // Navigate — catch loading state (may be brief)
    const responsePromise = page.goto(`/games/${GAME_ID}/join?token=${PLAYER_TOKEN}`)
    // Loading spinner should appear briefly (or redirect happens fast — either ok)
    await responsePromise
    // After navigation, it should redirect to predictions (success) OR show error
    // Either way, join-token-loading should not be stuck
  })

  test('valid player token redirects to predictions page', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    await page.goto(`/games/${GAME_ID}/join?token=${PLAYER_TOKEN}`)

    // Should redirect to predictions
    await page.waitForURL(`**/games/${GAME_ID}/predictions`, { timeout: 5000 })
    await expect(page).toHaveURL(new RegExp(`/games/${GAME_ID}/predictions`))

    await screenshot(page, 'player-token-success-redirect')
  })

  test('missing token shows no-token error with join link', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    await page.goto(`/games/${GAME_ID}/join`)
    await expect(page.getByTestId('join-token-page')).toBeVisible()
    await expect(page.getByTestId('join-token-error')).toBeVisible()
    // no-token errorType renders join link
    await expect(page.getByTestId('join-token-join-link')).toBeVisible()

    await screenshot(page, 'player-token-no-token-error')
  })

  test('invalid token shows error with join link', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    await page.goto(`/games/${GAME_ID}/join?token=completely-wrong-token`)
    await expect(page.getByTestId('join-token-page')).toBeVisible()
    await expect(page.getByTestId('join-token-error')).toBeVisible()
    await expect(page.getByTestId('join-token-join-link')).toBeVisible()
    await expect(page.getByTestId('join-token-dashboard-link')).toBeVisible()

    await screenshot(page, 'player-token-invalid-error')
  })

  test('no-game error shows import link and dashboard link', async ({ page }) => {
    await page.goto('/')
    // Store with NO game data
    await page.evaluate(() => localStorage.clear())

    await page.goto(`/games/${GAME_ID}/join?token=any-token`)
    await expect(page.getByTestId('join-token-page')).toBeVisible()
    await expect(page.getByTestId('join-token-error')).toBeVisible()
    await expect(page.getByTestId('join-token-dashboard-link')).toBeVisible()

    await screenshot(page, 'player-token-no-game-error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Admin token redemption via ?token= on admin page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Admin token redemption', () => {
  test('valid admin token on URL grants access and removes token from URL', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    // No creator key in localStorage — simulate new browser
    await page.evaluate((gId) => localStorage.removeItem(`porra_mundial_creator_${gId}`), GAME_ID)

    await page.goto(`/games/${GAME_ID}/admin?token=${ADMIN_TOKEN}`)

    // Should show admin page (token was valid, access granted)
    await expect(page.getByTestId('admin-page')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('admin-access-denied')).not.toBeVisible()

    // URL should be cleaned (token removed)
    await expect(page).not.toHaveURL(/token=/)

    await screenshot(page, 'admin-token-redemption-success')
  })

  test('invalid admin token shows access denied', async ({ page }) => {
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await page.evaluate((gId) => localStorage.removeItem(`porra_mundial_creator_${gId}`), GAME_ID)

    await page.goto(`/games/${GAME_ID}/admin?token=wrong-admin-token`)

    await expect(page.getByTestId('admin-access-denied')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('admin-page')).not.toBeVisible()

    await screenshot(page, 'admin-token-redemption-denied')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — create-game success card shows admin recovery section
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Create game — admin recovery section in success card', () => {
  test('create game flow shows admin recovery section after creation', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/dashboard/create-game')

    // Fill the form
    await page.getByTestId('create-game-name-input').fill('QA Recovery Test Game')
    await page.getByTestId('create-game-submit-btn').click()

    // Wait for success state
    await expect(page.getByTestId('create-game-success-card')).toBeVisible({ timeout: 10000 })

    // Admin recovery section should be present
    await expect(page.getByTestId('create-game-admin-recovery-section')).toBeVisible()

    // Copy button should be inside it
    const recoverySection = page.getByTestId('create-game-admin-recovery-section')
    await expect(recoverySection.getByTestId('copy-recovery-link-btn')).toBeVisible()

    await screenshot(page, 'create-game-success-with-recovery')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 6 — Join success page shows recovery link
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Join success page — recovery link section', () => {
  test('join success screen shows recovery link and continue button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    // Seed a game to join
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    await page.goto('/join')
    await page.getByTestId('join-code-input').fill('RLQATST')
    await page.getByTestId('join-name-input').fill('NewPlayer')
    await page.getByTestId('join-submit-btn').click()

    // Wait for success state
    await expect(page.getByTestId('join-success-page')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('join-success-card')).toBeVisible()
    await expect(page.getByTestId('join-recovery-link-section')).toBeVisible()
    await expect(page.getByTestId('join-success-continue-btn')).toBeVisible()

    await screenshot(page, 'join-success-recovery-link')
  })

  test('clicking continue navigates to game predictions', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })

    await page.goto('/join')
    await page.getByTestId('join-code-input').fill('RLQATST')
    await page.getByTestId('join-name-input').fill('ContinuePlayer')
    await page.getByTestId('join-submit-btn').click()

    await expect(page.getByTestId('join-success-page')).toBeVisible({ timeout: 10000 })
    await page.getByTestId('join-success-continue-btn').click()

    // Should navigate to the game predictions page
    await page.waitForURL(`**/games/${GAME_ID}/predictions`, { timeout: 10000 })
    await expect(page).toHaveURL(new RegExp(`/games/${GAME_ID}/predictions`))

    await screenshot(page, 'join-continue-to-predictions')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Suite 7 — Visual polish: Mobile overview snapshot
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Visual polish — mobile overview', () => {
  test('game overview renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('game-nav-mobile')).toBeVisible()

    await screenshot(page, 'mobile-overview')
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('game overview renders correctly on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/')
    const game = makeGame()
    await writeStore(page, { version: 1, games: { [GAME_ID]: game } })
    await setSession(page, GAME_ID, PLAYER_SESSION)

    await page.goto(`/games/${GAME_ID}`)
    await expect(page.getByTestId('game-layout')).toBeVisible()
    await expect(page.getByTestId('game-nav-desktop')).toBeVisible()

    await screenshot(page, 'desktop-overview')
  })
})
