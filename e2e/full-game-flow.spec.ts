/**
 * Full Happy Path — Supabase-backed multi-device flow.
 *
 * Covers the end-to-end product journey using isolated browser contexts:
 * - creator creates game
 * - two players join via invite link
 * - both submit predictions and scorer picks
 * - admin enters result, awards scorer point, locks phase
 * - players are blocked after lock
 * - admin confirms R16 teams and opens phase
 * - player predicts in R16
 * - cross-device rejoin works through invite link
 */

import { test, expect, type Page } from '@playwright/test'

function extractGameIdFromHref(href: string | null): string {
  expect(href).toBeTruthy()
  const match = href!.match(/\/games\/([^/?#]+)/)
  expect(match).toBeTruthy()
  return match![1]
}

function extractInviteCode(text: string): string {
  const match = text.match(/\b[A-Z0-9]{7}\b/)
  expect(match).toBeTruthy()
  return match![0]
}

function extractMatchIdFromTestId(testId: string | null, prefix: string): string {
  expect(testId).toBeTruthy()
  expect(testId!.startsWith(prefix)).toBe(true)
  return testId!.slice(prefix.length)
}

async function joinGame(page: Page, inviteCode: string, playerName: string): Promise<void> {
  await page.goto(`/join?code=${inviteCode}`)
  await expect(page.getByTestId('join-page')).toBeVisible()
  await expect(page.getByTestId('join-code-input')).toHaveValue(inviteCode)

  await page.getByTestId('join-name-input').fill(playerName)
  await page.getByTestId('join-submit-btn').click()

  await expect(page.getByTestId('join-success-page')).toBeVisible()
  await page.getByTestId('join-success-continue-btn').click()
}

async function submitPredictionsForFirstTwoMatches(page: Page, scoreA: [string, string], scoreB: [string, string]): Promise<string[]> {
  await expect(page.getByTestId('predictions-page')).toBeVisible()
  await expect(page.getByTestId('predictions-waiting')).not.toBeVisible()

  const checkboxLoc = page.locator('[data-testid^="match-checkbox-"]')
  const checkboxCount = await checkboxLoc.count()
  expect(checkboxCount).toBeGreaterThanOrEqual(2)

  const firstId = extractMatchIdFromTestId(await checkboxLoc.nth(0).getAttribute('data-testid'), 'match-checkbox-')
  const secondId = extractMatchIdFromTestId(await checkboxLoc.nth(1).getAttribute('data-testid'), 'match-checkbox-')

  await page.getByTestId(`match-checkbox-${firstId}`).check()
  await page.getByTestId(`match-checkbox-${secondId}`).check()

  await page.getByTestId(`match-home-input-${firstId}`).fill(scoreA[0])
  await page.getByTestId(`match-away-input-${firstId}`).fill(scoreA[1])
  await page.getByTestId(`match-home-input-${secondId}`).fill(scoreB[0])
  await page.getByTestId(`match-away-input-${secondId}`).fill(scoreB[1])

  await page.getByTestId('predictions-submit-btn').click()
  await expect(page.getByTestId('predictions-saved')).toBeVisible()

  return [firstId, secondId]
}

test.describe.serial('Full game happy path', () => {
  let adminPage: Page
  let player1Page: Page
  let player2Page: Page

  let gameId = ''
  let inviteCode = ''
  let leagueMatch1Id = ''
  let player1Name = ''

  test.beforeAll(async ({ browser }) => {
    const adminCtx = await browser.newContext()
    const player1Ctx = await browser.newContext()
    const player2Ctx = await browser.newContext()

    adminPage = await adminCtx.newPage()
    player1Page = await player1Ctx.newPage()
    player2Page = await player2Ctx.newPage()

    await adminPage.goto('/')
    await player1Page.goto('/')
    await player2Page.goto('/')
  })

  test.afterAll(async () => {
    if (adminPage) await adminPage.context().close()
    if (player1Page) await player1Page.context().close()
    if (player2Page) await player2Page.context().close()
  })

  test('happy path with all major steps', async ({ browser }) => {
    const suffix = Date.now().toString().slice(-6)
    player1Name = `player-one-${suffix}`
    const player2Name = `player-two-${suffix}`

    await test.step('1) Creator creates a game and captures invite code', async () => {
      await adminPage.goto('/dashboard/create-game')
      await expect(adminPage.getByTestId('create-game-page')).toBeVisible()

      await adminPage.getByTestId('create-game-name-input').fill(`WC Happy Path ${suffix}`)
      const submitButton = adminPage.getByTestId('create-game-submit-btn')
      const successCard = adminPage.getByTestId('create-game-success-card')
      const errorCard = adminPage.getByTestId('create-game-error')

      for (let attempt = 1; attempt <= 3; attempt++) {
        await submitButton.click()
        try {
          await expect(successCard).toBeVisible({ timeout: 15000 })
          break
        } catch {
          const hasError = await errorCard.isVisible()
          if (!hasError || attempt === 3) {
            throw new Error('Unable to create game after retries')
          }
          await expect(submitButton).toBeEnabled({ timeout: 10000 })
        }
      }

      const startHref = await adminPage.getByTestId('create-game-start-btn').getAttribute('href')
      gameId = extractGameIdFromHref(startHref)

      await adminPage.getByTestId('create-game-start-btn').click()
      await expect(adminPage.getByTestId('game-overview-page')).toBeVisible()

      const inviteSectionText = await adminPage.getByTestId('game-invite-section').innerText()
      inviteCode = extractInviteCode(inviteSectionText)
      expect(inviteCode).toMatch(/^[A-Z0-9]{7}$/)
    })

    await test.step('2) Player 1 joins through invite link', async () => {
      await joinGame(player1Page, inviteCode, player1Name)
      await player1Page.waitForURL(new RegExp(`/games/${gameId}`))
      await expect(player1Page.getByTestId('game-overview-page')).toBeVisible()
    })

    await test.step('3) Player 2 joins through invite link from another device', async () => {
      await joinGame(player2Page, inviteCode, player2Name)
      await player2Page.waitForURL(new RegExp(`/games/${gameId}`))
      await expect(player2Page.getByTestId('game-overview-page')).toBeVisible()
    })

    await test.step('4) Player 1 submits league predictions and scorer', async () => {
      await player1Page.goto(`/games/${gameId}/predictions`)
      const [m1] = await submitPredictionsForFirstTwoMatches(player1Page, ['2', '1'], ['0', '0'])
      leagueMatch1Id = m1

      await player1Page.goto(`/games/${gameId}/scorer`)
      await expect(player1Page.getByTestId('scorer-page')).toBeVisible()
      await player1Page.getByTestId('scorer-name-input').fill('Lionel Messi')
      await player1Page.getByTestId('scorer-submit-btn').click()
    })

    await test.step('5) Player 2 submits league predictions and scorer', async () => {
      await player2Page.goto(`/games/${gameId}/predictions`)
      await submitPredictionsForFirstTwoMatches(player2Page, ['1', '1'], ['3', '0'])

      await player2Page.goto(`/games/${gameId}/scorer`)
      await expect(player2Page.getByTestId('scorer-page')).toBeVisible()
      await player2Page.getByTestId('scorer-name-input').fill('Kylian Mbappe')
      await player2Page.getByTestId('scorer-submit-btn').click()
    })

    await test.step('6) Creator enters result and awards scorer point', async () => {
      await adminPage.goto(`/games/${gameId}/admin/results`)
      await expect(adminPage.getByTestId('results-page')).toBeVisible()

      await adminPage.getByTestId(`match-home-input-${leagueMatch1Id}`).fill('2')
      await adminPage.getByTestId(`match-away-input-${leagueMatch1Id}`).fill('1')
      await adminPage.getByTestId('results-submit-btn').click()
      await expect(adminPage.getByTestId('results-saved')).toBeVisible()

      await adminPage.goto(`/games/${gameId}/admin/scorer-points`)
      await expect(adminPage.getByTestId('scorer-points-page')).toBeVisible()
      await expect(adminPage.getByTestId('scorer-points-list')).toBeVisible()

      const firstAwardButton = adminPage.locator('[data-testid^="scorer-award-"]').first()
      await expect(firstAwardButton).toBeVisible()
      await firstAwardButton.click()
      await expect(adminPage.getByTestId('scorer-points-saved')).toBeVisible()
    })

    await test.step('7) Both players can see the leaderboard with both names', async () => {
      await player1Page.reload()
      await player1Page.goto(`/games/${gameId}/leaderboard`)
      await expect(player1Page.getByTestId('leaderboard-page')).toBeVisible()
      await expect(player1Page.getByTestId('leaderboard-table')).toBeVisible()
      await expect(player1Page.getByText(player1Name)).toBeVisible()
      await expect(player1Page.getByText(player2Name)).toBeVisible()

      await player2Page.reload()
      await player2Page.goto(`/games/${gameId}/leaderboard`)
      await expect(player2Page.getByTestId('leaderboard-page')).toBeVisible()
      await expect(player2Page.getByText(player1Name)).toBeVisible()
      await expect(player2Page.getByText(player2Name)).toBeVisible()
    })

    await test.step('8) Creator locks league phase', async () => {
      await adminPage.goto(`/games/${gameId}/admin`)
      await expect(adminPage.getByTestId('admin-page')).toBeVisible()

      await adminPage.getByTestId('admin-phase-LEAGUE').click()
      await expect(adminPage.getByTestId('admin-lock-phase-btn')).toBeVisible()
      await adminPage.getByTestId('admin-lock-phase-btn').click()
      await expect(adminPage.getByTestId('admin-confirm-modal')).toBeVisible()
      await adminPage.getByTestId('admin-confirm-action').click()
      await expect(adminPage.getByTestId('admin-lock-phase-btn')).not.toBeVisible()
    })

    await test.step('9) Players can no longer submit league predictions after lock', async () => {
      await player1Page.reload()
      await player1Page.goto(`/games/${gameId}/predictions`)
      await expect(player1Page.getByTestId('predictions-page')).toBeVisible()
      await expect(player1Page.getByTestId('predictions-waiting')).toBeVisible()

      await player2Page.reload()
      await player2Page.goto(`/games/${gameId}/predictions`)
      await expect(player2Page.getByTestId('predictions-waiting')).toBeVisible()
    })

    await test.step('10) Creator confirms R16 teams and opens R16 phase', async () => {
      await adminPage.goto(`/games/${gameId}/admin`)
      await expect(adminPage.getByTestId('admin-page')).toBeVisible()

      await adminPage.getByTestId('admin-phase-R16').click()
      await expect(adminPage.getByTestId('admin-tbd-warning')).toBeVisible()
      await expect(adminPage.getByTestId('admin-open-phase-btn')).not.toBeVisible()

      await adminPage.getByTestId('admin-tbd-manage-link').click()
      await expect(adminPage.getByTestId('admin-matches-page')).toBeVisible()

      const rows = adminPage.locator('[data-testid^="admin-match-row-"]')
      expect(await rows.count()).toBeGreaterThanOrEqual(2)

      const firstRowId = extractMatchIdFromTestId(await rows.nth(0).getAttribute('data-testid'), 'admin-match-row-')
      const secondRowId = extractMatchIdFromTestId(await rows.nth(1).getAttribute('data-testid'), 'admin-match-row-')

      await adminPage.getByTestId(`admin-match-${firstRowId}-home`).fill('Argentina')
      await adminPage.getByTestId(`admin-match-${firstRowId}-away`).fill('Ecuador')
      await adminPage.getByTestId(`admin-match-${secondRowId}-home`).fill('France')
      await adminPage.getByTestId(`admin-match-${secondRowId}-away`).fill('Morocco')
      await adminPage.getByTestId('admin-matches-save-btn').click()
      await expect(adminPage.getByTestId('admin-matches-saved')).toBeVisible()

      await adminPage.goto(`/games/${gameId}/admin`)
      await adminPage.getByTestId('admin-phase-R16').click()
      await expect(adminPage.getByTestId('admin-tbd-warning')).not.toBeVisible()
      await expect(adminPage.getByTestId('admin-open-phase-btn')).toBeVisible()

      await adminPage.getByTestId('admin-open-phase-btn').click()
      await expect(adminPage.getByTestId('admin-confirm-modal')).toBeVisible()
      await adminPage.getByTestId('admin-confirm-action').click()
      await expect(adminPage.getByTestId('admin-lock-phase-btn')).toBeVisible()
    })

    await test.step('11) Player 1 can now submit R16 prediction and scorer', async () => {
      await player1Page.reload()
      await player1Page.goto(`/games/${gameId}/predictions`)
      await expect(player1Page.getByTestId('predictions-page')).toBeVisible()
      await expect(player1Page.getByTestId('predictions-waiting')).not.toBeVisible()

      const checkbox = player1Page.locator('[data-testid^="match-checkbox-"]').first()
      const r16MatchId = extractMatchIdFromTestId(await checkbox.getAttribute('data-testid'), 'match-checkbox-')
      await checkbox.check()
      await player1Page.getByTestId(`match-home-input-${r16MatchId}`).fill('2')
      await player1Page.getByTestId(`match-away-input-${r16MatchId}`).fill('0')
      await player1Page.getByTestId('predictions-submit-btn').click()
      await expect(player1Page.getByTestId('predictions-saved')).toBeVisible()

      await player1Page.goto(`/games/${gameId}/scorer`)
      await expect(player1Page.getByTestId('scorer-page')).toBeVisible()
      await player1Page.getByTestId('scorer-name-input').fill('Erling Haaland')
      await player1Page.getByTestId('scorer-submit-btn').click()
    })

    await test.step('12) Player 1 can re-join from a new device using invite link', async () => {
      const freshCtx = await browser.newContext()
      const freshPage = await freshCtx.newPage()
      await freshPage.goto('/')

      await joinGame(freshPage, inviteCode, player1Name)
      await freshPage.waitForURL(new RegExp(`/games/${gameId}`))
      await expect(freshPage.getByTestId('game-overview-page')).toBeVisible()

      await freshPage.goto(`/games/${gameId}/my-predictions`)
      await expect(freshPage.getByTestId('my-predictions-page')).toBeVisible()
      await expect(freshPage.getByTestId('my-predictions-empty')).not.toBeVisible()

      await freshCtx.close()
    })
  })
})
