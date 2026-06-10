/**
 * E2E tests — Predictions Form: Checkbox Partial Save + 0-0 Bug Fix + Immutability
 * Slug: predictions-checkbox-save
 *
 * Covers:
 *  - predictions page: initial load, checkbox-driven partial save, 0-0 default,
 *    immutability (saved predictions become read-only), waiting/locked states
 *  - admin predictions page: access denied for non-creator, override for creator
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// ─── localStorage helpers ─────────────────────────────────────────────────────

type LocalStore = {
  version: 1
  games: Record<string, LocalGame>
}

type LocalGame = {
  id: string
  name: string
  inviteCode: string
  creatorSessionId: string
  status: string
  createdAt: string
  updatedAt: string
  players: LocalPlayer[]
  phases: LocalPhase[]
  matches: LocalMatch[]
  predictions: LocalPrediction[]
  scorerSelections: unknown[]
}

type LocalPlayer = { sessionId: string; name: string; joinedAt: string }
type LocalPhase = { phaseKey: string; isOpen: boolean; isLocked: boolean; openedAt: string | null; lockedAt: string | null }
type LocalMatch = { id: string; phaseKey: string; matchNumber: number; homeTeam: string; awayTeam: string; scheduledAt: string; homeGoals: number | null; awayGoals: number | null; resultEntered: boolean; teamsConfirmed: boolean }
type LocalPrediction = { id: string; sessionId: string; matchId: string; homeGoalsPredicted: number; awayGoalsPredicted: number; createdAt: string; updatedAt: string }

const SCREENSHOTS_DIR = '/home/phernando/Repos/porra_mundial/.webforge/agents/qa/screenshots'

async function readStore(page: Page): Promise<LocalStore> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('porra_mundial_store')
    if (!raw) return { version: 1, games: {} }
    try { return JSON.parse(raw) as { version: 1; games: Record<string, unknown> } }
    catch { return { version: 1, games: {} } }
  }) as Promise<LocalStore>
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

// ─── Build a minimal game fixture ─────────────────────────────────────────────

function makeFixture(): LocalGame {
  const now = new Date().toISOString()
  const creatorSessionId = 'creator-session-123'
  const playerSessionId = 'player-session-456'

  const match1: LocalMatch = {
    id: 'match-LEAGUE-1',
    phaseKey: 'LEAGUE',
    matchNumber: 1,
    homeTeam: 'Brazil',
    awayTeam: 'Mexico',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    homeGoals: null,
    awayGoals: null,
    resultEntered: false,
    teamsConfirmed: true,
  }

  const match2: LocalMatch = {
    id: 'match-LEAGUE-2',
    phaseKey: 'LEAGUE',
    matchNumber: 2,
    homeTeam: 'France',
    awayTeam: 'Germany',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    homeGoals: null,
    awayGoals: null,
    resultEntered: false,
    teamsConfirmed: true,
  }

  return {
    id: 'game-test-123',
    name: 'QA Test Game',
    inviteCode: 'QATST01',
    creatorSessionId,
    status: 'IN_PROGRESS',
    createdAt: now,
    updatedAt: now,
    players: [
      { sessionId: creatorSessionId, name: 'Creator', joinedAt: now },
      { sessionId: playerSessionId, name: 'Player One', joinedAt: now },
    ],
    phases: [
      { phaseKey: 'LEAGUE', isOpen: true, isLocked: false, openedAt: now, lockedAt: null },
      { phaseKey: 'R16', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R8', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R4', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'R2', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
      { phaseKey: 'FINAL', isOpen: false, isLocked: false, openedAt: null, lockedAt: null },
    ],
    matches: [match1, match2],
    predictions: [],
    scorerSelections: [],
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Predictions Form — Checkbox Partial Save + 0-0 Bug Fix + Immutability', () => {
  let ctx: BrowserContext
  let page: Page
  const game = makeFixture()
  const GAME_URL = `/games/${game.id}/predictions`
  const ADMIN_PREDICTIONS_URL = `/games/${game.id}/admin/predictions`

  test.beforeAll(async ({ browser }) => {
    ctx = await browser.newContext()
    page = await ctx.newPage()
    await page.goto('/')
  })

  test.afterAll(async () => {
    await ctx.close()
  })

  // Seed the game and a session into localStorage before each test
  test.beforeEach(async () => {
    // Fresh game state for each test
    const freshGame = makeFixture()
    await writeStore(page, { version: 1, games: { [freshGame.id]: freshGame } })
    // Default: logged in as the regular player
    await setSession(page, freshGame.id, 'player-session-456')
  })

  // ── Initial page load ────────────────────────────────────────────────────────

  test('initial load: shows predictions page with match cards', async () => {
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    // Both matches should be visible as Mode B (unsaved, with checkbox)
    await expect(page.getByTestId(`match-card-${game.matches[0].id}`)).toBeVisible()
    await expect(page.getByTestId(`match-card-${game.matches[1].id}`)).toBeVisible()

    // Checkboxes should be present and unchecked
    const checkbox1 = page.getByTestId(`match-checkbox-${game.matches[0].id}`)
    await expect(checkbox1).toBeVisible()
    await expect(checkbox1).not.toBeChecked()

    // Submit button disabled when no checkboxes checked
    await expect(page.getByTestId('predictions-submit-btn')).toBeDisabled()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-initial.png`, fullPage: true })
  })

  // ── Checkbox enables submit ──────────────────────────────────────────────────

  test('checking a match checkbox enables the submit button', async () => {
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    const checkbox1 = page.getByTestId(`match-checkbox-${game.matches[0].id}`)
    await checkbox1.check()
    await expect(checkbox1).toBeChecked()

    // Submit button now enabled
    await expect(page.getByTestId('predictions-submit-btn')).toBeEnabled()
  })

  // ── Happy path: save one match ───────────────────────────────────────────────

  test('happy path: check one match, enter score, save — shows read-only saved card', async () => {
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    const matchId = game.matches[0].id

    // Check the first match
    await page.getByTestId(`match-checkbox-${matchId}`).check()

    // Enter a score (2-1)
    await page.getByTestId(`match-home-input-${matchId}`).fill('2')
    await page.getByTestId(`match-away-input-${matchId}`).fill('1')

    // Save
    await page.getByTestId('predictions-submit-btn').click()

    // Success banner should appear
    await expect(page.getByTestId('predictions-saved')).toBeVisible()

    // match-1 should now show as Mode A (read-only with saved badge)
    await expect(page.getByTestId(`match-saved-badge-${matchId}`)).toBeVisible()
    await expect(page.getByTestId(`match-readonly-score-${matchId}`)).toBeVisible()
    await expect(page.getByTestId(`match-readonly-score-${matchId}`)).toContainText('2')
    await expect(page.getByTestId(`match-readonly-score-${matchId}`)).toContainText('1')

    // match-2 should still be in Mode B (checkbox, editable)
    const match2Id = game.matches[1].id
    await expect(page.getByTestId(`match-checkbox-${match2Id}`)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-success.png`, fullPage: true })
  })

  // ── 0-0 default bug fix ──────────────────────────────────────────────────────

  test('0-0 default: checking a match without touching inputs saves as 0-0', async () => {
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    const matchId = game.matches[0].id

    // Check without entering score (inputs start at 0 by default)
    await page.getByTestId(`match-checkbox-${matchId}`).check()
    await page.getByTestId('predictions-submit-btn').click()

    // Should succeed
    await expect(page.getByTestId('predictions-saved')).toBeVisible()

    // Readonly score should show 0 : 0
    await expect(page.getByTestId(`match-readonly-score-${matchId}`)).toContainText('0')

    // Verify in localStorage
    const store = await readStore(page)
    const savedGame = store.games[game.id]
    const pred = savedGame.predictions.find(
      (p) => p.matchId === matchId && p.sessionId === 'player-session-456'
    )
    expect(pred).toBeTruthy()
    expect(pred?.homeGoalsPredicted).toBe(0)
    expect(pred?.awayGoalsPredicted).toBe(0)
  })

  // ── Immutability: cannot re-save a saved prediction ──────────────────────────

  test('immutability: saved matches appear read-only and checkbox is disabled', async () => {
    // Pre-seed a prediction for match-1
    const freshGame = makeFixture()
    freshGame.predictions = [
      {
        id: 'pred-existing',
        sessionId: 'player-session-456',
        matchId: 'match-LEAGUE-1',
        homeGoalsPredicted: 3,
        awayGoalsPredicted: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    await writeStore(page, { version: 1, games: { [freshGame.id]: freshGame } })
    await setSession(page, freshGame.id, 'player-session-456')

    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    const savedMatchId = 'match-LEAGUE-1'

    // The saved match should show read-only mode (badge, no checkbox enabled)
    await expect(page.getByTestId(`match-saved-badge-${savedMatchId}`)).toBeVisible()
    await expect(page.getByTestId(`match-readonly-score-${savedMatchId}`)).toBeVisible()
    await expect(page.getByTestId(`match-readonly-score-${savedMatchId}`)).toContainText('3')

    // The checkbox should be disabled (readOnly=true)
    const checkbox = page.getByTestId(`match-checkbox-${savedMatchId}`)
    await expect(checkbox).toBeDisabled()
  })

  // ── Partial save: only checked matches are saved ──────────────────────────────

  test('partial save: only the checked match is saved, unchecked one is unchanged', async () => {
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    const match1Id = game.matches[0].id
    const match2Id = game.matches[1].id

    // Only check match-1
    await page.getByTestId(`match-checkbox-${match1Id}`).check()
    await page.getByTestId(`match-home-input-${match1Id}`).fill('1')
    await page.getByTestId(`match-away-input-${match1Id}`).fill('0')
    await page.getByTestId('predictions-submit-btn').click()

    await expect(page.getByTestId('predictions-saved')).toBeVisible()

    // Verify in localStorage: only match-1 should have a prediction
    const store = await readStore(page)
    const savedGame = store.games[game.id]
    const preds = savedGame.predictions.filter((p) => p.sessionId === 'player-session-456')
    expect(preds).toHaveLength(1)
    expect(preds[0].matchId).toBe(match1Id)

    // match-2 still shows checkbox (not saved)
    await expect(page.getByTestId(`match-checkbox-${match2Id}`)).toBeVisible()
    await expect(page.getByTestId(`match-checkbox-${match2Id}`)).not.toBeChecked()
  })

  // ── Waiting state (no open phase) ────────────────────────────────────────────

  test('waiting state: shows waiting message when no phase is open', async () => {
    const freshGame = makeFixture()
    // Close the LEAGUE phase
    freshGame.phases = freshGame.phases.map((p) => ({ ...p, isOpen: false }))
    await writeStore(page, { version: 1, games: { [freshGame.id]: freshGame } })
    await setSession(page, freshGame.id, 'player-session-456')

    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()
    await expect(page.getByTestId('predictions-waiting')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-waiting.png`, fullPage: true })
  })

  // ── Error state: no session ───────────────────────────────────────────────────

  test('no session: shows no-session warning when player is not in the game', async () => {
    // Clear session key so getMySession returns null
    await page.evaluate(
      (key) => localStorage.removeItem(key),
      `porra_mundial_session_${game.id}`
    )

    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-no-session')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-error.png`, fullPage: true })
  })

  // ── Mobile viewport ───────────────────────────────────────────────────────────

  test('mobile viewport: predictions page renders correctly at 390x844', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(GAME_URL)
    await expect(page.getByTestId('predictions-page')).toBeVisible()

    // Match cards should still be visible
    await expect(page.getByTestId(`match-card-${game.matches[0].id}`)).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-mobile.png`, fullPage: true })

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  // ── Admin predictions page: access denied ────────────────────────────────────

  test('admin predictions page: non-creator sees access denied', async () => {
    // player-session-456 is NOT the creator
    await setSession(page, game.id, 'player-session-456')

    await page.goto(ADMIN_PREDICTIONS_URL)
    await expect(page.getByTestId('admin-access-denied')).toBeVisible()
  })

  // ── Admin predictions page: creator access ───────────────────────────────────

  test('admin predictions page: creator sees the full override UI', async () => {
    // Log in as creator
    await setSession(page, game.id, 'creator-session-123')

    await page.goto(ADMIN_PREDICTIONS_URL)
    await expect(page.getByTestId('admin-predictions-page')).toBeVisible()

    // Phase selector should be visible
    await expect(page.getByTestId('admin-predictions-phase-selector')).toBeVisible()

    // Player selector should be visible
    await expect(page.getByTestId('admin-predictions-player-selector')).toBeVisible()

    // Match cards and save button should be visible (LEAGUE phase has matches)
    await expect(page.getByTestId('admin-predictions-list')).toBeVisible()
    await expect(page.getByTestId('admin-predictions-save-btn')).toBeVisible()

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/predictions-checkbox-save-admin.png`, fullPage: true })
  })

  // ── Admin override: creates new prediction for a player ──────────────────────

  test('admin override: creator can save a prediction on behalf of a player', async () => {
    await setSession(page, game.id, 'creator-session-123')

    await page.goto(ADMIN_PREDICTIONS_URL)
    await expect(page.getByTestId('admin-predictions-page')).toBeVisible()

    // Select Player One (player-session-456)
    const playerBtn = page.getByTestId('admin-predictions-player-player-session-456')
    await expect(playerBtn).toBeVisible()
    await playerBtn.click()
    // Wait for the player selection to be reflected (orange background = bg-orange-500)
    await expect(playerBtn).toHaveClass(/bg-orange-500/)

    // LEAGUE phase is selected by default — match cards should appear
    await expect(page.getByTestId('admin-predictions-list')).toBeVisible()

    const matchId = game.matches[0].id

    // Enter score for match-1
    await page.getByTestId(`match-home-input-${matchId}`).fill('2')
    await page.getByTestId(`match-away-input-${matchId}`).fill('0')

    // Save override
    await page.getByTestId('admin-predictions-save-btn').click()
    await expect(page.getByTestId('admin-predictions-saved')).toBeVisible()

    // Verify in localStorage: player-session-456 should now have a prediction for match-1
    const store = await readStore(page)
    const savedGame = store.games[game.id]
    const pred = savedGame.predictions.find(
      (p) => p.sessionId === 'player-session-456' && p.matchId === matchId
    )
    expect(pred).toBeTruthy()
    expect(pred?.homeGoalsPredicted).toBe(2)
    expect(pred?.awayGoalsPredicted).toBe(0)
  })

  // ── Admin predictions page: shows edit-predictions nav card on admin page ─────

  test('admin panel: shows "Edit Predictions" nav card linking to admin/predictions', async () => {
    await setSession(page, game.id, 'creator-session-123')

    await page.goto(`/games/${game.id}/admin`)
    await expect(page.getByTestId('admin-page')).toBeVisible()
    await expect(page.getByTestId('admin-edit-predictions-card')).toBeVisible()

    // Clicking it navigates to admin/predictions
    await page.getByTestId('admin-edit-predictions-card').click()
    await page.waitForURL(new RegExp('/admin/predictions'))
    await expect(page.getByTestId('admin-predictions-page')).toBeVisible()
  })
})
