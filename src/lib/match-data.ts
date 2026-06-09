// FIFA 2026 World Cup Match Data
// This data will be used to seed matches when a game is created

export interface MatchDataPoint {
  match_number: number
  home_team: string
  away_team: string
  scheduled_at: string
  phase_key: 'LEAGUE' | 'R16' | 'R8' | 'R4' | 'R2' | 'FINAL'
}

// Total: 64 matches
// League: 8, R16: 8, R8: 4, R4: 2, R2: 2, Final: 1
export const MATCH_DATA: MatchDataPoint[] = [
  // LEAGUE PHASE (8 matches - simplified example)
  { match_number: 1, home_team: 'Argentina', away_team: 'Morocco', scheduled_at: '2026-06-20 18:00:00', phase_key: 'LEAGUE' },
  { match_number: 2, home_team: 'France', away_team: 'Germany', scheduled_at: '2026-06-21 20:00:00', phase_key: 'LEAGUE' },
  { match_number: 3, home_team: 'Brazil', away_team: 'Spain', scheduled_at: '2026-06-22 18:00:00', phase_key: 'LEAGUE' },
  { match_number: 4, home_team: 'England', away_team: 'Netherlands', scheduled_at: '2026-06-23 20:00:00', phase_key: 'LEAGUE' },
  { match_number: 5, home_team: 'Italy', away_team: 'Belgium', scheduled_at: '2026-06-24 18:00:00', phase_key: 'LEAGUE' },
  { match_number: 6, home_team: 'Portugal', away_team: 'Mexico', scheduled_at: '2026-06-25 20:00:00', phase_key: 'LEAGUE' },
  { match_number: 7, home_team: 'Uruguay', away_team: 'Canada', scheduled_at: '2026-06-26 18:00:00', phase_key: 'LEAGUE' },
  { match_number: 8, home_team: 'Colombia', away_team: 'Costa Rica', scheduled_at: '2026-06-27 20:00:00', phase_key: 'LEAGUE' },

  // R16 PHASE (8 matches)
  { match_number: 1, home_team: 'Winner Group 1', away_team: 'Runner-up Group 2', scheduled_at: '2026-07-01 18:00:00', phase_key: 'R16' },
  { match_number: 2, home_team: 'Winner Group 2', away_team: 'Runner-up Group 1', scheduled_at: '2026-07-02 20:00:00', phase_key: 'R16' },
  { match_number: 3, home_team: 'Winner Group 3', away_team: 'Runner-up Group 4', scheduled_at: '2026-07-03 18:00:00', phase_key: 'R16' },
  { match_number: 4, home_team: 'Winner Group 4', away_team: 'Runner-up Group 3', scheduled_at: '2026-07-04 20:00:00', phase_key: 'R16' },
  { match_number: 5, home_team: 'Winner Group 5', away_team: 'Runner-up Group 6', scheduled_at: '2026-07-05 18:00:00', phase_key: 'R16' },
  { match_number: 6, home_team: 'Winner Group 6', away_team: 'Runner-up Group 5', scheduled_at: '2026-07-06 20:00:00', phase_key: 'R16' },
  { match_number: 7, home_team: 'Winner Group 7', away_team: 'Runner-up Group 8', scheduled_at: '2026-07-07 18:00:00', phase_key: 'R16' },
  { match_number: 8, home_team: 'Winner Group 8', away_team: 'Runner-up Group 7', scheduled_at: '2026-07-08 20:00:00', phase_key: 'R16' },

  // R8 PHASE (4 matches - Quarter Finals)
  { match_number: 1, home_team: 'QF1 Winner', away_team: 'QF2 Winner', scheduled_at: '2026-07-10 18:00:00', phase_key: 'R8' },
  { match_number: 2, home_team: 'QF3 Winner', away_team: 'QF4 Winner', scheduled_at: '2026-07-11 20:00:00', phase_key: 'R8' },
  { match_number: 3, home_team: 'QF5 Winner', away_team: 'QF6 Winner', scheduled_at: '2026-07-12 18:00:00', phase_key: 'R8' },
  { match_number: 4, home_team: 'QF7 Winner', away_team: 'QF8 Winner', scheduled_at: '2026-07-13 20:00:00', phase_key: 'R8' },

  // R4 PHASE (2 matches - Semi Finals)
  { match_number: 1, home_team: 'SF1 Winner', away_team: 'SF2 Winner', scheduled_at: '2026-07-15 18:00:00', phase_key: 'R4' },
  { match_number: 2, home_team: 'SF3 Winner', away_team: 'SF4 Winner', scheduled_at: '2026-07-16 20:00:00', phase_key: 'R4' },

  // R2 PHASE (2 matches - Third Place & Final)
  { match_number: 1, home_team: 'SF1 Loser', away_team: 'SF2 Loser', scheduled_at: '2026-07-18 18:00:00', phase_key: 'R2' },
  { match_number: 2, home_team: 'Winner SF1', away_team: 'Winner SF2', scheduled_at: '2026-07-19 20:00:00', phase_key: 'R2' },

  // FINAL PHASE (1 match)
  { match_number: 1, home_team: 'Final SF1 Winner', away_team: 'Final SF2 Winner', scheduled_at: '2026-07-20 18:00:00', phase_key: 'FINAL' },
]

export function getMatchesByPhase(phaseKey: string): MatchDataPoint[] {
  return MATCH_DATA.filter(m => m.phase_key === phaseKey)
}
