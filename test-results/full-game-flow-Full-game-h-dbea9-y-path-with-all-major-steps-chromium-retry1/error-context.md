# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-game-flow.spec.ts >> Full game happy path >> happy path with all major steps
- Location: e2e/full-game-flow.spec.ts:103:7

# Error details

```
Error: Unable to create game after retries
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e4]:
      - link "🏆" [ref=e6] [cursor=pointer]:
        - /url: /
        - generic [ref=e7]: 🏆
      - button "Open menu" [ref=e9]:
        - img [ref=e10]
  - main [ref=e11]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - heading "Create New Game" [level=1] [ref=e15]
        - paragraph [ref=e16]: Start a new World Cup 2026 betting tournament
      - generic [ref=e17]:
        - generic [ref=e18]:
          - generic [ref=e19]: Game Name *
          - textbox "Game Name *" [ref=e20]:
            - /placeholder: e.g., Office World Cup 2026
            - text: WC Happy Path 346903
        - generic [ref=e21]:
          - button "Create Game" [ref=e22]
          - button "Cancel" [ref=e23]
  - button "Open Next.js Dev Tools" [ref=e29] [cursor=pointer]:
    - img [ref=e30]
  - alert [ref=e33]
```

# Test source

```ts
  25  |   const match = text.match(/\b[A-Z0-9]{7}\b/)
  26  |   expect(match).toBeTruthy()
  27  |   return match![0]
  28  | }
  29  | 
  30  | function extractMatchIdFromTestId(testId: string | null, prefix: string): string {
  31  |   expect(testId).toBeTruthy()
  32  |   expect(testId!.startsWith(prefix)).toBe(true)
  33  |   return testId!.slice(prefix.length)
  34  | }
  35  | 
  36  | async function joinGame(page: Page, inviteCode: string, playerName: string): Promise<void> {
  37  |   await page.goto(`/join?code=${inviteCode}`)
  38  |   await expect(page.getByTestId('join-page')).toBeVisible()
  39  |   await expect(page.getByTestId('join-code-input')).toHaveValue(inviteCode)
  40  | 
  41  |   await page.getByTestId('join-name-input').fill(playerName)
  42  |   await page.getByTestId('join-submit-btn').click()
  43  | 
  44  |   await expect(page.getByTestId('join-success-page')).toBeVisible()
  45  |   await page.getByTestId('join-success-continue-btn').click()
  46  | }
  47  | 
  48  | async function submitPredictionsForFirstTwoMatches(page: Page, scoreA: [string, string], scoreB: [string, string]): Promise<string[]> {
  49  |   await expect(page.getByTestId('predictions-page')).toBeVisible()
  50  |   await expect(page.getByTestId('predictions-waiting')).not.toBeVisible()
  51  | 
  52  |   const checkboxLoc = page.locator('[data-testid^="match-checkbox-"]')
  53  |   const checkboxCount = await checkboxLoc.count()
  54  |   expect(checkboxCount).toBeGreaterThanOrEqual(2)
  55  | 
  56  |   const firstId = extractMatchIdFromTestId(await checkboxLoc.nth(0).getAttribute('data-testid'), 'match-checkbox-')
  57  |   const secondId = extractMatchIdFromTestId(await checkboxLoc.nth(1).getAttribute('data-testid'), 'match-checkbox-')
  58  | 
  59  |   await page.getByTestId(`match-checkbox-${firstId}`).check()
  60  |   await page.getByTestId(`match-checkbox-${secondId}`).check()
  61  | 
  62  |   await page.getByTestId(`match-home-input-${firstId}`).fill(scoreA[0])
  63  |   await page.getByTestId(`match-away-input-${firstId}`).fill(scoreA[1])
  64  |   await page.getByTestId(`match-home-input-${secondId}`).fill(scoreB[0])
  65  |   await page.getByTestId(`match-away-input-${secondId}`).fill(scoreB[1])
  66  | 
  67  |   await page.getByTestId('predictions-submit-btn').click()
  68  |   await expect(page.getByTestId('predictions-saved')).toBeVisible()
  69  | 
  70  |   return [firstId, secondId]
  71  | }
  72  | 
  73  | test.describe.serial('Full game happy path', () => {
  74  |   let adminPage: Page
  75  |   let player1Page: Page
  76  |   let player2Page: Page
  77  | 
  78  |   let gameId = ''
  79  |   let inviteCode = ''
  80  |   let leagueMatch1Id = ''
  81  |   let player1Name = ''
  82  | 
  83  |   test.beforeAll(async ({ browser }) => {
  84  |     const adminCtx = await browser.newContext()
  85  |     const player1Ctx = await browser.newContext()
  86  |     const player2Ctx = await browser.newContext()
  87  | 
  88  |     adminPage = await adminCtx.newPage()
  89  |     player1Page = await player1Ctx.newPage()
  90  |     player2Page = await player2Ctx.newPage()
  91  | 
  92  |     await adminPage.goto('/')
  93  |     await player1Page.goto('/')
  94  |     await player2Page.goto('/')
  95  |   })
  96  | 
  97  |   test.afterAll(async () => {
  98  |     if (adminPage) await adminPage.context().close()
  99  |     if (player1Page) await player1Page.context().close()
  100 |     if (player2Page) await player2Page.context().close()
  101 |   })
  102 | 
  103 |   test('happy path with all major steps', async ({ browser }) => {
  104 |     const suffix = Date.now().toString().slice(-6)
  105 |     player1Name = `player-one-${suffix}`
  106 |     const player2Name = `player-two-${suffix}`
  107 | 
  108 |     await test.step('1) Creator creates a game and captures invite code', async () => {
  109 |       await adminPage.goto('/dashboard/create-game')
  110 |       await expect(adminPage.getByTestId('create-game-page')).toBeVisible()
  111 | 
  112 |       await adminPage.getByTestId('create-game-name-input').fill(`WC Happy Path ${suffix}`)
  113 |       const submitButton = adminPage.getByTestId('create-game-submit-btn')
  114 |       const successCard = adminPage.getByTestId('create-game-success-card')
  115 |       const errorCard = adminPage.getByTestId('create-game-error')
  116 | 
  117 |       for (let attempt = 1; attempt <= 3; attempt++) {
  118 |         await submitButton.click()
  119 |         try {
  120 |           await expect(successCard).toBeVisible({ timeout: 15000 })
  121 |           break
  122 |         } catch {
  123 |           const hasError = await errorCard.isVisible()
  124 |           if (!hasError || attempt === 3) {
> 125 |             throw new Error('Unable to create game after retries')
      |                   ^ Error: Unable to create game after retries
  126 |           }
  127 |           await expect(submitButton).toBeEnabled({ timeout: 10000 })
  128 |         }
  129 |       }
  130 | 
  131 |       const startHref = await adminPage.getByTestId('create-game-start-btn').getAttribute('href')
  132 |       gameId = extractGameIdFromHref(startHref)
  133 | 
  134 |       await adminPage.getByTestId('create-game-start-btn').click()
  135 |       await expect(adminPage.getByTestId('game-overview-page')).toBeVisible()
  136 | 
  137 |       const inviteSectionText = await adminPage.getByTestId('game-invite-section').innerText()
  138 |       inviteCode = extractInviteCode(inviteSectionText)
  139 |       expect(inviteCode).toMatch(/^[A-Z0-9]{7}$/)
  140 |     })
  141 | 
  142 |     await test.step('2) Player 1 joins through invite link', async () => {
  143 |       await joinGame(player1Page, inviteCode, player1Name)
  144 |       await player1Page.waitForURL(new RegExp(`/games/${gameId}`))
  145 |       await expect(player1Page.getByTestId('game-overview-page')).toBeVisible()
  146 |     })
  147 | 
  148 |     await test.step('3) Player 2 joins through invite link from another device', async () => {
  149 |       await joinGame(player2Page, inviteCode, player2Name)
  150 |       await player2Page.waitForURL(new RegExp(`/games/${gameId}`))
  151 |       await expect(player2Page.getByTestId('game-overview-page')).toBeVisible()
  152 |     })
  153 | 
  154 |     await test.step('4) Player 1 submits league predictions and scorer', async () => {
  155 |       await player1Page.goto(`/games/${gameId}/predictions`)
  156 |       const [m1] = await submitPredictionsForFirstTwoMatches(player1Page, ['2', '1'], ['0', '0'])
  157 |       leagueMatch1Id = m1
  158 | 
  159 |       await player1Page.goto(`/games/${gameId}/scorer`)
  160 |       await expect(player1Page.getByTestId('scorer-page')).toBeVisible()
  161 |       await player1Page.getByTestId('scorer-name-input').fill('Lionel Messi')
  162 |       await player1Page.getByTestId('scorer-submit-btn').click()
  163 |     })
  164 | 
  165 |     await test.step('5) Player 2 submits league predictions and scorer', async () => {
  166 |       await player2Page.goto(`/games/${gameId}/predictions`)
  167 |       await submitPredictionsForFirstTwoMatches(player2Page, ['1', '1'], ['3', '0'])
  168 | 
  169 |       await player2Page.goto(`/games/${gameId}/scorer`)
  170 |       await expect(player2Page.getByTestId('scorer-page')).toBeVisible()
  171 |       await player2Page.getByTestId('scorer-name-input').fill('Kylian Mbappe')
  172 |       await player2Page.getByTestId('scorer-submit-btn').click()
  173 |     })
  174 | 
  175 |     await test.step('6) Creator enters result and awards scorer point', async () => {
  176 |       await adminPage.goto(`/games/${gameId}/admin/results`)
  177 |       await expect(adminPage.getByTestId('results-page')).toBeVisible()
  178 | 
  179 |       await adminPage.getByTestId(`match-home-input-${leagueMatch1Id}`).fill('2')
  180 |       await adminPage.getByTestId(`match-away-input-${leagueMatch1Id}`).fill('1')
  181 |       await adminPage.getByTestId('results-submit-btn').click()
  182 |       await expect(adminPage.getByTestId('results-saved')).toBeVisible()
  183 | 
  184 |       await adminPage.goto(`/games/${gameId}/admin/scorer-points`)
  185 |       await expect(adminPage.getByTestId('scorer-points-page')).toBeVisible()
  186 |       await expect(adminPage.getByTestId('scorer-points-list')).toBeVisible()
  187 | 
  188 |       const firstAwardButton = adminPage.locator('[data-testid^="scorer-award-"]').first()
  189 |       await expect(firstAwardButton).toBeVisible()
  190 |       await firstAwardButton.click()
  191 |       await expect(adminPage.getByTestId('scorer-points-saved')).toBeVisible()
  192 |     })
  193 | 
  194 |     await test.step('7) Both players can see the leaderboard with both names', async () => {
  195 |       await player1Page.reload()
  196 |       await player1Page.goto(`/games/${gameId}/leaderboard`)
  197 |       await expect(player1Page.getByTestId('leaderboard-page')).toBeVisible()
  198 |       await expect(player1Page.getByTestId('leaderboard-table')).toBeVisible()
  199 |       await expect(player1Page.getByText(player1Name)).toBeVisible()
  200 |       await expect(player1Page.getByText(player2Name)).toBeVisible()
  201 | 
  202 |       await player2Page.reload()
  203 |       await player2Page.goto(`/games/${gameId}/leaderboard`)
  204 |       await expect(player2Page.getByTestId('leaderboard-page')).toBeVisible()
  205 |       await expect(player2Page.getByText(player1Name)).toBeVisible()
  206 |       await expect(player2Page.getByText(player2Name)).toBeVisible()
  207 |     })
  208 | 
  209 |     await test.step('8) Creator locks league phase', async () => {
  210 |       await adminPage.goto(`/games/${gameId}/admin`)
  211 |       await expect(adminPage.getByTestId('admin-page')).toBeVisible()
  212 | 
  213 |       await adminPage.getByTestId('admin-phase-LEAGUE').click()
  214 |       await expect(adminPage.getByTestId('admin-lock-phase-btn')).toBeVisible()
  215 |       await adminPage.getByTestId('admin-lock-phase-btn').click()
  216 |       await expect(adminPage.getByTestId('admin-confirm-modal')).toBeVisible()
  217 |       await adminPage.getByTestId('admin-confirm-action').click()
  218 |       await expect(adminPage.getByTestId('admin-lock-phase-btn')).not.toBeVisible()
  219 |     })
  220 | 
  221 |     await test.step('9) Players can no longer submit league predictions after lock', async () => {
  222 |       await player1Page.reload()
  223 |       await player1Page.goto(`/games/${gameId}/predictions`)
  224 |       await expect(player1Page.getByTestId('predictions-page')).toBeVisible()
  225 |       await expect(player1Page.getByTestId('predictions-waiting')).toBeVisible()
```