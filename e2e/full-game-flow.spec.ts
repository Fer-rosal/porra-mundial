/**
 * Full World Cup Betting Game Flow — 14-step end-to-end test
 *
 * Architecture: multi-context simulation
 * - adminPage     : game creator / organiser
 * - player1Page   : Player One (joins via invite link)
 * - player2Page   : admin's second identity as a player (incognito-style)
 * - player1NewPage: Player One after importing the game into a fresh browser
 *
 * State sync: because localStorage is isolated per BrowserContext, shared game
 * state is copied between contexts at each step where synchronisation is needed.
 */

import { test, expect, type Page } from '@playwright/test'

// ── Shared test state ────────────────────────────────────────────────────────

let adminPage: Page
let player1Page: Page
let player2Page: Page

let gameId: string
let inviteCode: string
let adminSessionId: string
let player1SessionId: string
let player2SessionId: string
let leagueMatch1Id: string
let leagueMatch2Id: string
let r16Match1Id: string
let r16Match2Id: string
let player1ScorerSelectionId: string

// ── localStorage helpers ─────────────────────────────────────────────────────

type Games = Record<string, unknown>

async function readGames(page: Page): Promise<Games> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('porra_mundial_store')
    if (!raw) return {}
    try {
      return (JSON.parse(raw) as { games: Games }).games ?? {}
    } catch {
      return {}
    }
  })
}

async function writeGames(page: Page, games: Games): Promise<void> {
  await page.evaluate((gs) => {
    localStorage.setItem('porra_mundial_store', JSON.stringify({ version: 1, games: gs }))
  }, games)
}

async function readSession(page: Page, gId: string): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), `porra_mundial_session_${gId}`)
}

async function writeSession(page: Page, gId: string, sId: string): Promise<void> {
  await page.evaluate(
    ({ key, val }) => localStorage.setItem(key, val),
    { key: `porra_mundial_session_${gId}`, val: sId }
  )
}

// Encode game + session for export (mirrors game-store.tsx exportGame logic)
async function encodeExport(page: Page, gId: string): Promise<string> {
  return page.evaluate((gameId) => {
    const raw = localStorage.getItem('porra_mundial_store')
    const games = raw ? (JSON.parse(raw) as { games: Games }).games : {}
    const game = games[gameId]
    const sessionId = localStorage.getItem(`porra_mundial_session_${gameId}`)
    const data = { v: 1, game, sessionId, at: new Date().toISOString() }
    return btoa(encodeURIComponent(JSON.stringify(data)))
  }, gId)
}

// Copy current games from `source` into `target`, preserving target's session keys
async function syncGames(source: Page, target: Page): Promise<void> {
  const games = await readGames(source)
  await writeGames(target, games)
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe.serial('Full World Cup game flow', () => {
  test.beforeAll(async ({ browser }) => {
    const adminCtx = await browser.newContext()
    const player1Ctx = await browser.newContext()
    const player2Ctx = await browser.newContext()

    adminPage = await adminCtx.newPage()
    player1Page = await player1Ctx.newPage()
    player2Page = await player2Ctx.newPage()

    // Navigate each page once so Next.js initialises properly
    await adminPage.goto('/')
    await player1Page.goto('/')
    await player2Page.goto('/')
  })

  test.afterAll(async () => {
    await adminPage.context().close()
    await player1Page.context().close()
    await player2Page.context().close()
  })

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  test('1: Admin creates game and gets invite link', async () => {
    await adminPage.goto('/dashboard/create-game')
    await expect(adminPage.getByTestId('create-game-page')).toBeVisible()

    await adminPage.getByTestId('create-game-name-input').fill('WC2026 Test Game')
    await adminPage.getByTestId('create-game-submit-btn').click()

    await expect(adminPage.getByTestId('create-game-success-card')).toBeVisible()
    await expect(adminPage.getByTestId('create-game-copy-link-btn')).toBeVisible()

    // Capture game data
    const games = await readGames(adminPage)
    const gamesList = Object.values(games) as Array<{
      id: string
      inviteCode: string
      creatorSessionId: string
      phases: Array<{ phaseKey: string; isOpen: boolean }>
      matches: Array<{ id: string; phaseKey: string; matchNumber: number }>
    }>
    expect(gamesList).toHaveLength(1)

    const game = gamesList[0]
    gameId = game.id
    inviteCode = game.inviteCode
    adminSessionId = game.creatorSessionId

    // Verify invite code format
    expect(inviteCode).toMatch(/^[A-Z0-9]{7}$/)

    // Verify LEAGUE phase is already open (requirement: auto-open on create)
    const leaguePhase = game.phases.find((p) => p.phaseKey === 'LEAGUE')
    expect(leaguePhase?.isOpen).toBe(true)

    // Stash first two LEAGUE match IDs for predictions steps
    const leagueMatches = game.matches
      .filter((m) => m.phaseKey === 'LEAGUE')
      .sort((a, b) => a.matchNumber - b.matchNumber)
    expect(leagueMatches.length).toBeGreaterThanOrEqual(2)
    leagueMatch1Id = leagueMatches[0].id
    leagueMatch2Id = leagueMatches[1].id

    // Stash R16 match IDs for steps 13-14
    const r16Matches = game.matches
      .filter((m) => m.phaseKey === 'R16')
      .sort((a, b) => a.matchNumber - b.matchNumber)
    r16Match1Id = r16Matches[0].id
    r16Match2Id = r16Matches[1].id
  })

  // ── Step 2 ───────────────────────────────────────────────────────────────────
  test('2: Player1 joins via invite link, enters predictions and scorer', async () => {
    // Seed player1's browser with admin's game data so joinGame can find it
    await syncGames(adminPage, player1Page)
    await player1Page.reload()

    // Join via invite link
    await player1Page.goto(`/join?code=${inviteCode}`)
    await expect(player1Page.getByTestId('join-page')).toBeVisible()
    await expect(player1Page.getByTestId('join-code-input')).toHaveValue(inviteCode)

    await player1Page.getByTestId('join-name-input').fill('Player One')
    await player1Page.getByTestId('join-submit-btn').click()

    // Should land on game overview
    await player1Page.waitForURL(new RegExp(`/games/${gameId}`))
    await expect(player1Page.getByTestId('game-overview-page')).toBeVisible()

    player1SessionId = (await readSession(player1Page, gameId)) ?? ''
    expect(player1SessionId).toBeTruthy()

    // Enter predictions for Phase 1 (LEAGUE is already open)
    await player1Page.goto(`/games/${gameId}/predictions`)
    await expect(player1Page.getByTestId('predictions-page')).toBeVisible()
    // Waiting state should NOT be shown because LEAGUE is open
    await expect(player1Page.getByTestId('predictions-waiting')).not.toBeVisible()

    // Enter scores for first two LEAGUE matches
    await player1Page.getByTestId(`match-home-input-${leagueMatch1Id}`).fill('2')
    await player1Page.getByTestId(`match-away-input-${leagueMatch1Id}`).fill('1')
    await player1Page.getByTestId(`match-home-input-${leagueMatch2Id}`).fill('0')
    await player1Page.getByTestId(`match-away-input-${leagueMatch2Id}`).fill('0')
    await player1Page.getByTestId('predictions-submit-btn').click()
    await expect(player1Page.getByTestId('predictions-saved')).toBeVisible()

    // Enter scorer selection
    await player1Page.goto(`/games/${gameId}/scorer`)
    await expect(player1Page.getByTestId('scorer-page')).toBeVisible()
    await player1Page.getByTestId('scorer-name-input').fill('Lionel Messi')
    await player1Page.getByTestId('scorer-submit-btn').click()

    // Capture scorer selection ID from localStorage
    const games = await readGames(player1Page)
    const game = games[gameId] as {
      scorerSelections: Array<{ id: string; phaseKey: string; sessionId: string }>
    }
    const selection = game.scorerSelections.find(
      (s) => s.phaseKey === 'LEAGUE' && s.sessionId === player1SessionId
    )
    expect(selection).toBeDefined()
    player1ScorerSelectionId = selection!.id
  })

  // ── Step 3 ───────────────────────────────────────────────────────────────────
  test('3: Admin verifies they cannot predict as admin, joins as Player2 via invite link', async () => {
    // Sync latest state (Player1 is now in the game) to admin
    await syncGames(player1Page, adminPage)
    await adminPage.reload()
    await writeSession(adminPage, gameId, adminSessionId)

    // Admin checks predictions page — admin IS a player so they could predict,
    // but by design they choose to participate separately as Player2.
    await adminPage.goto(`/games/${gameId}/predictions`)
    await expect(adminPage.getByTestId('predictions-page')).toBeVisible()
    // Admin can see LEAGUE predictions form (no artificial block)
    await expect(adminPage.getByTestId('predictions-waiting')).not.toBeVisible()

    // Admin joins their own game in a separate (incognito-like) browser context as Player2
    await syncGames(player1Page, player2Page)
    await player2Page.reload()

    await player2Page.goto(`/join?code=${inviteCode}`)
    await expect(player2Page.getByTestId('join-page')).toBeVisible()

    await player2Page.getByTestId('join-name-input').fill('Player Two')
    await player2Page.getByTestId('join-submit-btn').click()

    await player2Page.waitForURL(new RegExp(`/games/${gameId}`))
    await expect(player2Page.getByTestId('game-overview-page')).toBeVisible()

    player2SessionId = (await readSession(player2Page, gameId)) ?? ''
    expect(player2SessionId).toBeTruthy()
    expect(player2SessionId).not.toBe(adminSessionId)

    // Verify the game now shows all 3 players (Creator, Player One, Player Two)
    const games = await readGames(player2Page)
    const game = games[gameId] as { players: Array<{ name: string }> }
    const playerNames = game.players.map((p) => p.name)
    expect(playerNames).toContain('Player One')
    expect(playerNames).toContain('Player Two')
  })

  // ── Step 4 ───────────────────────────────────────────────────────────────────
  test('4: Player1 revisits game and sees their predictions', async () => {
    // Sync latest state (Player Two has joined) to Player1
    await syncGames(player2Page, player1Page)
    await player1Page.reload()
    await writeSession(player1Page, gameId, player1SessionId)

    await player1Page.goto(`/games/${gameId}/my-predictions`)
    await expect(player1Page.getByTestId('my-predictions-page')).toBeVisible()

    // Should NOT show empty state — Player1 has predictions saved
    await expect(player1Page.getByTestId('my-predictions-empty')).not.toBeVisible()
  })

  // ── Step 5 ───────────────────────────────────────────────────────────────────
  test('5: Player2 enters predictions and scorer', async () => {
    // Player2's browser already has the latest state + player2SessionId stored

    await player2Page.goto(`/games/${gameId}/predictions`)
    await expect(player2Page.getByTestId('predictions-page')).toBeVisible()
    await expect(player2Page.getByTestId('predictions-waiting')).not.toBeVisible()

    // Player2 predicts different scores
    await player2Page.getByTestId(`match-home-input-${leagueMatch1Id}`).fill('1')
    await player2Page.getByTestId(`match-away-input-${leagueMatch1Id}`).fill('1')
    await player2Page.getByTestId(`match-home-input-${leagueMatch2Id}`).fill('3')
    await player2Page.getByTestId(`match-away-input-${leagueMatch2Id}`).fill('0')
    await player2Page.getByTestId('predictions-submit-btn').click()
    await expect(player2Page.getByTestId('predictions-saved')).toBeVisible()

    // Player2 selects a scorer
    await player2Page.goto(`/games/${gameId}/scorer`)
    await expect(player2Page.getByTestId('scorer-page')).toBeVisible()
    await player2Page.getByTestId('scorer-name-input').fill('Kylian Mbappé')
    await player2Page.getByTestId('scorer-submit-btn').click()
  })

  // ── Step 6 ───────────────────────────────────────────────────────────────────
  test('6: Admin enters match results and awards scorer point to Player1', async () => {
    // Sync latest state to admin
    await syncGames(player2Page, adminPage)
    await adminPage.reload()
    await writeSession(adminPage, gameId, adminSessionId)

    // Enter results for match 1 (2-1 — exactly what Player1 predicted)
    await adminPage.goto(`/games/${gameId}/admin/results`)
    await expect(adminPage.getByTestId('results-page')).toBeVisible()

    await adminPage.getByTestId(`match-home-input-${leagueMatch1Id}`).fill('2')
    await adminPage.getByTestId(`match-away-input-${leagueMatch1Id}`).fill('1')
    await adminPage.getByTestId('results-submit-btn').click()

    // Award scorer point to Player1 (Messi scored)
    await adminPage.goto(`/games/${gameId}/admin/scorer-points`)
    await expect(adminPage.getByTestId('scorer-points-page')).toBeVisible()

    const awardBtn = adminPage.getByTestId(`scorer-award-${player1ScorerSelectionId}`)
    await expect(awardBtn).toBeVisible()
    await awardBtn.click()
  })

  // ── Step 7 ───────────────────────────────────────────────────────────────────
  test('7: Player1 sees updated leaderboard with points', async () => {
    await syncGames(adminPage, player1Page)
    await player1Page.reload()
    await writeSession(player1Page, gameId, player1SessionId)

    await player1Page.goto(`/games/${gameId}/leaderboard`)
    await expect(player1Page.getByTestId('leaderboard-page')).toBeVisible()
    await expect(player1Page.getByTestId('leaderboard-empty')).not.toBeVisible()
    await expect(player1Page.getByTestId('leaderboard-table')).toBeVisible()

    // Player1 predicted 2-1 exactly → 3 pts + scorer point → leading
    const player1Row = player1Page.getByTestId(`leaderboard-row-${player1SessionId}`)
    await expect(player1Row).toBeVisible()
  })

  // ── Step 8 ───────────────────────────────────────────────────────────────────
  test('8: Player2 sees updated leaderboard', async () => {
    await syncGames(adminPage, player2Page)
    await player2Page.reload()
    await writeSession(player2Page, gameId, player2SessionId)

    await player2Page.goto(`/games/${gameId}/leaderboard`)
    await expect(player2Page.getByTestId('leaderboard-page')).toBeVisible()
    await expect(player2Page.getByTestId('leaderboard-table')).toBeVisible()

    // Player2 predicted 1-1 (outcome correct: draw=draw? No, result is 2-1) → 0 pts
    const player2Row = player2Page.getByTestId(`leaderboard-row-${player2SessionId}`)
    await expect(player2Row).toBeVisible()
  })

  // ── Steps 9–10 ───────────────────────────────────────────────────────────────
  test('9-10: Player1 exports data and loads it in a new browser', async ({ browser }) => {
    // Ensure Player1's page has latest state
    await syncGames(adminPage, player1Page)
    await player1Page.reload()
    await writeSession(player1Page, gameId, player1SessionId)

    // Step 9 — generate the export code via the UI
    await player1Page.goto(`/games/${gameId}`)
    await expect(player1Page.getByTestId('game-overview-page')).toBeVisible()
    await player1Page.getByTestId('game-export-btn').click()
    await expect(player1Page.getByTestId('game-export-section')).toBeVisible()

    const exportCode = await player1Page.getByTestId('game-export-code').inputValue()
    expect(exportCode.length).toBeGreaterThan(100) // non-trivial payload

    // Step 10 — load data in a fresh browser context
    const newCtx = await browser.newContext()
    const newPage = await newCtx.newPage()

    await newPage.goto('/import')
    await expect(newPage.getByTestId('import-page')).toBeVisible()

    await newPage.getByTestId('import-code-input').fill(exportCode)
    await newPage.getByTestId('import-submit-btn').click()

    await expect(newPage.getByTestId('import-success')).toBeVisible()

    // Verify the game is loaded and navigable
    await newPage.getByTestId('import-go-to-game-btn').click()
    await expect(newPage.getByTestId('game-overview-page')).toBeVisible()

    // Player1's session should be restored — my-predictions should show data
    await newPage.goto(`/games/${gameId}/my-predictions`)
    await expect(newPage.getByTestId('my-predictions-page')).toBeVisible()
    await expect(newPage.getByTestId('my-predictions-empty')).not.toBeVisible()

    await newCtx.close()
  })

  // ── Step 11 ──────────────────────────────────────────────────────────────────
  test('11: Admin locks (closes) Phase 1 (LEAGUE)', async () => {
    await writeSession(adminPage, gameId, adminSessionId)
    await adminPage.goto(`/games/${gameId}/admin`)
    await expect(adminPage.getByTestId('admin-page')).toBeVisible()

    // LEAGUE tab should already be selected; click it explicitly to be sure
    await adminPage.getByTestId('admin-phase-LEAGUE').click()

    // LEAGUE is open, not locked → should see the Lock button
    await expect(adminPage.getByTestId('admin-lock-phase-btn')).toBeVisible()
    await adminPage.getByTestId('admin-lock-phase-btn').click()

    // Confirm the lock action in the modal
    await expect(adminPage.getByTestId('admin-confirm-modal')).toBeVisible()
    await adminPage.getByTestId('admin-confirm-action').click()

    // Now the phase should be shown as LOCKED
    await expect(adminPage.getByTestId('admin-lock-phase-btn')).not.toBeVisible()
  })

  // ── Step 12 ──────────────────────────────────────────────────────────────────
  test('12: Players cannot add predictions for Phase 1 or Phase 2', async () => {
    // Sync locked state to Player1
    await syncGames(adminPage, player1Page)
    await player1Page.reload()
    await writeSession(player1Page, gameId, player1SessionId)

    // Player1 visits predictions — LEAGUE locked, R16 not open → waiting state
    await player1Page.goto(`/games/${gameId}/predictions`)
    await expect(player1Page.getByTestId('predictions-page')).toBeVisible()
    await expect(player1Page.getByTestId('predictions-waiting')).toBeVisible()

    // Submit button should not be visible
    await expect(player1Page.getByTestId('predictions-submit-btn')).not.toBeVisible()

    // Player2 also cannot predict
    await syncGames(adminPage, player2Page)
    await player2Page.reload()
    await writeSession(player2Page, gameId, player2SessionId)

    await player2Page.goto(`/games/${gameId}/predictions`)
    await expect(player2Page.getByTestId('predictions-waiting')).toBeVisible()
  })

  // ── Step 13 ──────────────────────────────────────────────────────────────────
  test('13: Admin confirms R16 teams then opens Phase 2', async () => {
    await writeSession(adminPage, gameId, adminSessionId)
    await adminPage.goto(`/games/${gameId}/admin`)

    // Select R16 phase — Open button must NOT be visible (teams not yet confirmed)
    await adminPage.getByTestId('admin-phase-R16').click()
    await expect(adminPage.getByTestId('admin-tbd-warning')).toBeVisible()
    await expect(adminPage.getByTestId('admin-open-phase-btn')).not.toBeVisible()

    // Navigate to match management via the warning link
    await adminPage.getByTestId('admin-tbd-manage-link').click()
    await expect(adminPage.getByTestId('admin-matches-page')).toBeVisible()

    // Enter team names for first two R16 matches
    await adminPage.getByTestId(`admin-match-${r16Match1Id}-home`).fill('Argentina')
    await adminPage.getByTestId(`admin-match-${r16Match1Id}-away`).fill('Ecuador')
    await adminPage.getByTestId(`admin-match-${r16Match2Id}-home`).fill('France')
    await adminPage.getByTestId(`admin-match-${r16Match2Id}-away`).fill('Morocco')

    // Confirm Teams saves ALL 16 matches (marks teamsConfirmed=true for all)
    await adminPage.getByTestId('admin-matches-save-btn').click()
    await expect(adminPage.getByTestId('admin-matches-saved')).toBeVisible()

    // Verify the edits persisted for the two edited matches
    const games = await readGames(adminPage)
    const game = games[gameId] as { matches: Array<{ id: string; homeTeam: string; awayTeam: string }> }
    const m1 = game.matches.find((m) => m.id === r16Match1Id)
    expect(m1?.homeTeam).toBe('Argentina')
    expect(m1?.awayTeam).toBe('Ecuador')

    // Back to admin panel — Open button must now be visible (all teams confirmed)
    await adminPage.goto(`/games/${gameId}/admin`)
    await adminPage.getByTestId('admin-phase-R16').click()
    await expect(adminPage.getByTestId('admin-tbd-warning')).not.toBeVisible()
    await expect(adminPage.getByTestId('admin-open-phase-btn')).toBeVisible()

    // Open R16
    await adminPage.getByTestId('admin-open-phase-btn').click()
    await expect(adminPage.getByTestId('admin-confirm-modal')).toBeVisible()
    await adminPage.getByTestId('admin-confirm-action').click()

    // Verify R16 is now open (lock button appears)
    await expect(adminPage.getByTestId('admin-lock-phase-btn')).toBeVisible()
  })

  // ── Step 14 ──────────────────────────────────────────────────────────────────
  test('14: Player1 enters predictions for Phase 2 (R16)', async () => {
    // Sync: Player1 gets the latest state (R16 open, match teams set)
    await syncGames(adminPage, player1Page)
    await player1Page.reload()
    await writeSession(player1Page, gameId, player1SessionId)

    await player1Page.goto(`/games/${gameId}/predictions`)
    await expect(player1Page.getByTestId('predictions-page')).toBeVisible()

    // R16 is now the active phase → predictions form should be visible
    await expect(player1Page.getByTestId('predictions-waiting')).not.toBeVisible()

    // The mock R16 match teams should appear in the form
    await expect(player1Page.getByText('Argentina')).toBeVisible()
    await expect(player1Page.getByText('Ecuador')).toBeVisible()

    // Enter prediction for the first R16 match
    await player1Page.getByTestId(`match-home-input-${r16Match1Id}`).fill('2')
    await player1Page.getByTestId(`match-away-input-${r16Match1Id}`).fill('0')
    await player1Page.getByTestId('predictions-submit-btn').click()
    await expect(player1Page.getByTestId('predictions-saved')).toBeVisible()

    // Enter scorer selection for R16
    await player1Page.goto(`/games/${gameId}/scorer`)
    await expect(player1Page.getByTestId('scorer-page')).toBeVisible()
    await player1Page.getByTestId('scorer-name-input').fill('Erling Haaland')
    await player1Page.getByTestId('scorer-submit-btn').click()

    // Verify prediction is saved
    await player1Page.goto(`/games/${gameId}/my-predictions`)
    await expect(player1Page.getByTestId('my-predictions-page')).toBeVisible()
    await expect(player1Page.getByTestId('my-predictions-empty')).not.toBeVisible()
  })
})
