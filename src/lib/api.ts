// Client-side API functions for fetching from /api/* endpoints

const API_BASE = '/api'

export async function getGames() {
  const res = await fetch(`${API_BASE}/games`)
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function getGame(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}`)
  if (!res.ok) throw new Error('Failed to fetch game')
  return res.json()
}

export async function createGame(name: string) {
  const res = await fetch(`${API_BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to create game')
  return res.json()
}

export async function joinGame(inviteCode: string) {
  const res = await fetch(`${API_BASE}/games/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invite_code: inviteCode }),
  })
  if (!res.ok) throw new Error('Failed to join game')
  return res.json()
}

export async function getCurrentPhase(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/current-phase`)
  if (!res.ok) throw new Error('Failed to fetch current phase')
  return res.json()
}

export async function submitPredictions(gameId: string, predictions: Array<{ match_id: string; home_goals_predicted: number; away_goals_predicted: number }>) {
  const res = await fetch(`${API_BASE}/games/${gameId}/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(predictions),
  })
  if (!res.ok) throw new Error('Failed to submit predictions')
  return res.json()
}

export async function updatePrediction(gameId: string, predictionId: string, homGoals: number, awayGoals: number) {
  const res = await fetch(`${API_BASE}/games/${gameId}/predictions/${predictionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      home_goals_predicted: homGoals,
      away_goals_predicted: awayGoals,
    }),
  })
  if (!res.ok) throw new Error('Failed to update prediction')
  return res.json()
}

export async function selectScorer(gameId: string, tournamentPhaseId: string, playerName: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/scorer-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tournament_phase_id: tournamentPhaseId, player_name: playerName }),
  })
  if (!res.ok) throw new Error('Failed to select scorer')
  return res.json()
}

export async function submitScorerSelection(gameId: string, phaseKey: string, playerName: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/scorer-selection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase_key: phaseKey, player_name: playerName }),
  })
  if (!res.ok) throw new Error('Failed to submit scorer selection')
  return res.json()
}

export async function getMyPredictions(gameId: string, phaseKey?: string) {
  const url = new URL(`${window.location.origin}${API_BASE}/games/${gameId}/my-predictions`)
  if (phaseKey) url.searchParams.append('phase_key', phaseKey)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch predictions')
  return res.json()
}

export async function getLeaderboard(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/leaderboard`)
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json()
}

export async function getMyScore(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/my-score`)
  if (!res.ok) throw new Error('Failed to fetch my score')
  return res.json()
}

export async function openPhase(gameId: string, phaseKey: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/phase/${phaseKey}/open`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to open phase')
  return res.json()
}

export async function lockPhase(gameId: string, phaseKey: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/phase/${phaseKey}/lock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error('Failed to lock phase')
  return res.json()
}

export async function submitResults(gameId: string, phaseKey: string, results: Array<{ match_id: string; home_goals: number; away_goals: number }>) {
  const res = await fetch(`${API_BASE}/games/${gameId}/phase/${phaseKey}/results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(results),
  })
  if (!res.ok) throw new Error('Failed to submit results')
  return res.json()
}

export async function submitScorerPoints(gameId: string, phaseKey: string, scorerPoints: Array<{ game_player_id: string; goals_count: number }>) {
  const res = await fetch(`${API_BASE}/games/${gameId}/phase/${phaseKey}/scorer-points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scorerPoints),
  })
  if (!res.ok) throw new Error('Failed to submit scorer points')
  return res.json()
}

export async function getHistory(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/history`)
  if (!res.ok) throw new Error('Failed to fetch game history')
  return res.json()
}

export async function getGameHistory(gameId: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/history`)
  if (!res.ok) throw new Error('Failed to fetch game history')
  return res.json()
}

export async function getPhaseMatches(gameId: string, phaseKey: string) {
  const res = await fetch(`${API_BASE}/games/${gameId}/matches/${phaseKey}`)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}
