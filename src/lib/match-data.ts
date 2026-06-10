// FIFA 2026 World Cup — Official Match Data
// Group stage (LEAGUE): all 72 fixtures with official team names and venues
// Knockout rounds: official bracket placeholders; admin must confirm teams before opening each phase

export interface MatchDataPoint {
  match_number: number
  home_team: string
  away_team: string
  scheduled_at: string
  phase_key: 'LEAGUE' | 'R16' | 'R8' | 'R4' | 'R2' | 'FINAL'
  group?: string
  venue?: string
}

export const MATCH_DATA: MatchDataPoint[] = [
  // ── LEAGUE PHASE — 72 matches ────────────────────────────────────────────────
  // Jun 11
  { match_number: 1,  phase_key: 'LEAGUE', group: 'A', home_team: 'Mexico',                  away_team: 'South Africa',          scheduled_at: '2026-06-11T16:00:00Z', venue: 'Mexico City Stadium' },
  { match_number: 2,  phase_key: 'LEAGUE', group: 'A', home_team: 'Korea Republic',           away_team: 'Czechia',               scheduled_at: '2026-06-11T20:00:00Z', venue: 'Estadio Guadalajara' },
  // Jun 12
  { match_number: 3,  phase_key: 'LEAGUE', group: 'B', home_team: 'Canada',                   away_team: 'Bosnia and Herzegovina',scheduled_at: '2026-06-12T16:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 4,  phase_key: 'LEAGUE', group: 'D', home_team: 'USA',                      away_team: 'Paraguay',              scheduled_at: '2026-06-12T20:00:00Z', venue: 'Los Angeles Stadium' },
  // Jun 13
  { match_number: 5,  phase_key: 'LEAGUE', group: 'C', home_team: 'Haiti',                    away_team: 'Scotland',              scheduled_at: '2026-06-13T15:00:00Z', venue: 'Boston Stadium' },
  { match_number: 6,  phase_key: 'LEAGUE', group: 'D', home_team: 'Australia',                away_team: 'Türkiye',               scheduled_at: '2026-06-13T17:00:00Z', venue: 'BC Place Vancouver' },
  { match_number: 7,  phase_key: 'LEAGUE', group: 'C', home_team: 'Brazil',                   away_team: 'Morocco',               scheduled_at: '2026-06-13T20:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 8,  phase_key: 'LEAGUE', group: 'B', home_team: 'Qatar',                    away_team: 'Switzerland',           scheduled_at: '2026-06-13T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  // Jun 14
  { match_number: 9,  phase_key: 'LEAGUE', group: 'E', home_team: "Côte d'Ivoire",            away_team: 'Ecuador',               scheduled_at: '2026-06-14T15:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 10, phase_key: 'LEAGUE', group: 'E', home_team: 'Germany',                  away_team: 'Curaçao',               scheduled_at: '2026-06-14T18:00:00Z', venue: 'Houston Stadium' },
  { match_number: 11, phase_key: 'LEAGUE', group: 'F', home_team: 'Netherlands',              away_team: 'Japan',                 scheduled_at: '2026-06-14T21:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 12, phase_key: 'LEAGUE', group: 'F', home_team: 'Sweden',                   away_team: 'Tunisia',               scheduled_at: '2026-06-14T23:00:00Z', venue: 'Estadio Monterrey' },
  // Jun 15
  { match_number: 13, phase_key: 'LEAGUE', group: 'H', home_team: 'Saudi Arabia',             away_team: 'Uruguay',               scheduled_at: '2026-06-15T15:00:00Z', venue: 'Miami Stadium' },
  { match_number: 14, phase_key: 'LEAGUE', group: 'H', home_team: 'Spain',                    away_team: 'Cabo Verde',            scheduled_at: '2026-06-15T18:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 15, phase_key: 'LEAGUE', group: 'G', home_team: 'IR Iran',                  away_team: 'New Zealand',           scheduled_at: '2026-06-15T21:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 16, phase_key: 'LEAGUE', group: 'G', home_team: 'Belgium',                  away_team: 'Egypt',                 scheduled_at: '2026-06-15T23:00:00Z', venue: 'Seattle Stadium' },
  // Jun 16
  { match_number: 17, phase_key: 'LEAGUE', group: 'I', home_team: 'France',                   away_team: 'Senegal',               scheduled_at: '2026-06-16T15:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 18, phase_key: 'LEAGUE', group: 'I', home_team: 'Iraq',                     away_team: 'Norway',                scheduled_at: '2026-06-16T18:00:00Z', venue: 'Boston Stadium' },
  { match_number: 19, phase_key: 'LEAGUE', group: 'J', home_team: 'Argentina',                away_team: 'Algeria',               scheduled_at: '2026-06-16T21:00:00Z', venue: 'Kansas City Stadium' },
  { match_number: 20, phase_key: 'LEAGUE', group: 'J', home_team: 'Austria',                  away_team: 'Jordan',                scheduled_at: '2026-06-16T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  // Jun 17
  { match_number: 21, phase_key: 'LEAGUE', group: 'L', home_team: 'Ghana',                    away_team: 'Panama',                scheduled_at: '2026-06-17T15:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 22, phase_key: 'LEAGUE', group: 'L', home_team: 'England',                  away_team: 'Croatia',               scheduled_at: '2026-06-17T18:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 23, phase_key: 'LEAGUE', group: 'K', home_team: 'Portugal',                 away_team: 'Congo DR',              scheduled_at: '2026-06-17T21:00:00Z', venue: 'Houston Stadium' },
  { match_number: 24, phase_key: 'LEAGUE', group: 'K', home_team: 'Uzbekistan',               away_team: 'Colombia',              scheduled_at: '2026-06-17T23:00:00Z', venue: 'Mexico City Stadium' },
  // Jun 18
  { match_number: 25, phase_key: 'LEAGUE', group: 'A', home_team: 'Czechia',                  away_team: 'South Africa',          scheduled_at: '2026-06-18T15:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 26, phase_key: 'LEAGUE', group: 'B', home_team: 'Switzerland',              away_team: 'Bosnia and Herzegovina',scheduled_at: '2026-06-18T18:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 27, phase_key: 'LEAGUE', group: 'B', home_team: 'Canada',                   away_team: 'Qatar',                 scheduled_at: '2026-06-18T21:00:00Z', venue: 'BC Place Vancouver' },
  { match_number: 28, phase_key: 'LEAGUE', group: 'A', home_team: 'Mexico',                   away_team: 'Korea Republic',        scheduled_at: '2026-06-18T23:00:00Z', venue: 'Estadio Guadalajara' },
  // Jun 19
  { match_number: 29, phase_key: 'LEAGUE', group: 'C', home_team: 'Brazil',                   away_team: 'Haiti',                 scheduled_at: '2026-06-19T15:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 30, phase_key: 'LEAGUE', group: 'C', home_team: 'Scotland',                 away_team: 'Morocco',               scheduled_at: '2026-06-19T18:00:00Z', venue: 'Boston Stadium' },
  { match_number: 31, phase_key: 'LEAGUE', group: 'D', home_team: 'Türkiye',                  away_team: 'Paraguay',              scheduled_at: '2026-06-19T21:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  { match_number: 32, phase_key: 'LEAGUE', group: 'D', home_team: 'USA',                      away_team: 'Australia',             scheduled_at: '2026-06-19T23:00:00Z', venue: 'Seattle Stadium' },
  // Jun 20
  { match_number: 33, phase_key: 'LEAGUE', group: 'E', home_team: 'Germany',                  away_team: "Côte d'Ivoire",         scheduled_at: '2026-06-20T15:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 34, phase_key: 'LEAGUE', group: 'E', home_team: 'Ecuador',                  away_team: 'Curaçao',               scheduled_at: '2026-06-20T18:00:00Z', venue: 'Kansas City Stadium' },
  { match_number: 35, phase_key: 'LEAGUE', group: 'F', home_team: 'Netherlands',              away_team: 'Sweden',                scheduled_at: '2026-06-20T21:00:00Z', venue: 'Houston Stadium' },
  { match_number: 36, phase_key: 'LEAGUE', group: 'F', home_team: 'Tunisia',                  away_team: 'Japan',                 scheduled_at: '2026-06-20T23:00:00Z', venue: 'Estadio Monterrey' },
  // Jun 21
  { match_number: 37, phase_key: 'LEAGUE', group: 'H', home_team: 'Uruguay',                  away_team: 'Cabo Verde',            scheduled_at: '2026-06-21T15:00:00Z', venue: 'Miami Stadium' },
  { match_number: 38, phase_key: 'LEAGUE', group: 'H', home_team: 'Spain',                    away_team: 'Saudi Arabia',          scheduled_at: '2026-06-21T18:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 39, phase_key: 'LEAGUE', group: 'G', home_team: 'Belgium',                  away_team: 'IR Iran',               scheduled_at: '2026-06-21T21:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 40, phase_key: 'LEAGUE', group: 'G', home_team: 'New Zealand',              away_team: 'Egypt',                 scheduled_at: '2026-06-21T23:00:00Z', venue: 'BC Place Vancouver' },
  // Jun 22
  { match_number: 41, phase_key: 'LEAGUE', group: 'I', home_team: 'Norway',                   away_team: 'Senegal',               scheduled_at: '2026-06-22T15:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 42, phase_key: 'LEAGUE', group: 'I', home_team: 'France',                   away_team: 'Iraq',                  scheduled_at: '2026-06-22T18:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 43, phase_key: 'LEAGUE', group: 'J', home_team: 'Argentina',                away_team: 'Austria',               scheduled_at: '2026-06-22T21:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 44, phase_key: 'LEAGUE', group: 'J', home_team: 'Jordan',                   away_team: 'Algeria',               scheduled_at: '2026-06-22T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  // Jun 23
  { match_number: 45, phase_key: 'LEAGUE', group: 'L', home_team: 'England',                  away_team: 'Ghana',                 scheduled_at: '2026-06-23T15:00:00Z', venue: 'Boston Stadium' },
  { match_number: 46, phase_key: 'LEAGUE', group: 'L', home_team: 'Panama',                   away_team: 'Croatia',               scheduled_at: '2026-06-23T18:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 47, phase_key: 'LEAGUE', group: 'K', home_team: 'Portugal',                 away_team: 'Uzbekistan',            scheduled_at: '2026-06-23T21:00:00Z', venue: 'Houston Stadium' },
  { match_number: 48, phase_key: 'LEAGUE', group: 'K', home_team: 'Colombia',                 away_team: 'Congo DR',              scheduled_at: '2026-06-23T23:00:00Z', venue: 'Estadio Guadalajara' },
  // Jun 24 — last matchday (6 matches, groups play simultaneously)
  { match_number: 49, phase_key: 'LEAGUE', group: 'C', home_team: 'Scotland',                 away_team: 'Brazil',                scheduled_at: '2026-06-24T15:00:00Z', venue: 'Miami Stadium' },
  { match_number: 50, phase_key: 'LEAGUE', group: 'C', home_team: 'Morocco',                  away_team: 'Haiti',                 scheduled_at: '2026-06-24T15:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 51, phase_key: 'LEAGUE', group: 'B', home_team: 'Switzerland',              away_team: 'Canada',                scheduled_at: '2026-06-24T19:00:00Z', venue: 'BC Place Vancouver' },
  { match_number: 52, phase_key: 'LEAGUE', group: 'B', home_team: 'Bosnia and Herzegovina',  away_team: 'Qatar',                 scheduled_at: '2026-06-24T19:00:00Z', venue: 'Seattle Stadium' },
  { match_number: 53, phase_key: 'LEAGUE', group: 'A', home_team: 'Czechia',                  away_team: 'Mexico',                scheduled_at: '2026-06-24T23:00:00Z', venue: 'Mexico City Stadium' },
  { match_number: 54, phase_key: 'LEAGUE', group: 'A', home_team: 'South Africa',             away_team: 'Korea Republic',        scheduled_at: '2026-06-24T23:00:00Z', venue: 'Estadio Monterrey' },
  // Jun 25 — last matchday (6 matches)
  { match_number: 55, phase_key: 'LEAGUE', group: 'E', home_team: 'Curaçao',                  away_team: "Côte d'Ivoire",         scheduled_at: '2026-06-25T15:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 56, phase_key: 'LEAGUE', group: 'E', home_team: 'Ecuador',                  away_team: 'Germany',               scheduled_at: '2026-06-25T15:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 57, phase_key: 'LEAGUE', group: 'F', home_team: 'Japan',                    away_team: 'Sweden',                scheduled_at: '2026-06-25T19:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 58, phase_key: 'LEAGUE', group: 'F', home_team: 'Tunisia',                  away_team: 'Netherlands',           scheduled_at: '2026-06-25T19:00:00Z', venue: 'Kansas City Stadium' },
  { match_number: 59, phase_key: 'LEAGUE', group: 'D', home_team: 'Türkiye',                  away_team: 'USA',                   scheduled_at: '2026-06-25T23:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 60, phase_key: 'LEAGUE', group: 'D', home_team: 'Paraguay',                 away_team: 'Australia',             scheduled_at: '2026-06-25T23:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  // Jun 26 — last matchday (6 matches)
  { match_number: 61, phase_key: 'LEAGUE', group: 'I', home_team: 'Norway',                   away_team: 'France',                scheduled_at: '2026-06-26T15:00:00Z', venue: 'Boston Stadium' },
  { match_number: 62, phase_key: 'LEAGUE', group: 'I', home_team: 'Senegal',                  away_team: 'Iraq',                  scheduled_at: '2026-06-26T15:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 63, phase_key: 'LEAGUE', group: 'G', home_team: 'Egypt',                    away_team: 'IR Iran',               scheduled_at: '2026-06-26T19:00:00Z', venue: 'Seattle Stadium' },
  { match_number: 64, phase_key: 'LEAGUE', group: 'G', home_team: 'New Zealand',              away_team: 'Belgium',               scheduled_at: '2026-06-26T19:00:00Z', venue: 'BC Place Vancouver' },
  { match_number: 65, phase_key: 'LEAGUE', group: 'H', home_team: 'Cabo Verde',               away_team: 'Saudi Arabia',          scheduled_at: '2026-06-26T23:00:00Z', venue: 'Houston Stadium' },
  { match_number: 66, phase_key: 'LEAGUE', group: 'H', home_team: 'Uruguay',                  away_team: 'Spain',                 scheduled_at: '2026-06-26T23:00:00Z', venue: 'Estadio Guadalajara' },
  // Jun 27 — last matchday (6 matches)
  { match_number: 67, phase_key: 'LEAGUE', group: 'L', home_team: 'Panama',                   away_team: 'England',               scheduled_at: '2026-06-27T15:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 68, phase_key: 'LEAGUE', group: 'L', home_team: 'Croatia',                  away_team: 'Ghana',                 scheduled_at: '2026-06-27T15:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 69, phase_key: 'LEAGUE', group: 'J', home_team: 'Algeria',                  away_team: 'Austria',               scheduled_at: '2026-06-27T19:00:00Z', venue: 'Kansas City Stadium' },
  { match_number: 70, phase_key: 'LEAGUE', group: 'J', home_team: 'Jordan',                   away_team: 'Argentina',             scheduled_at: '2026-06-27T19:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 71, phase_key: 'LEAGUE', group: 'K', home_team: 'Colombia',                 away_team: 'Portugal',              scheduled_at: '2026-06-27T23:00:00Z', venue: 'Miami Stadium' },
  { match_number: 72, phase_key: 'LEAGUE', group: 'K', home_team: 'Congo DR',                 away_team: 'Uzbekistan',            scheduled_at: '2026-06-27T23:00:00Z', venue: 'Atlanta Stadium' },

  // ── R16 PHASE — 16 matches (Round of 32) — admin confirms teams before opening ──
  { match_number: 1,  phase_key: 'R16', home_team: 'Group A runners-up',                away_team: 'Group B runners-up',                    scheduled_at: '2026-06-28T20:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 2,  phase_key: 'R16', home_team: 'Group E winners',                   away_team: 'Group A/B/C/D/F best 3rd',              scheduled_at: '2026-06-29T16:00:00Z', venue: 'Boston Stadium' },
  { match_number: 3,  phase_key: 'R16', home_team: 'Group F winners',                   away_team: 'Group C runners-up',                    scheduled_at: '2026-06-29T20:00:00Z', venue: 'Estadio Monterrey' },
  { match_number: 4,  phase_key: 'R16', home_team: 'Group C winners',                   away_team: 'Group F runners-up',                    scheduled_at: '2026-06-29T23:00:00Z', venue: 'Houston Stadium' },
  { match_number: 5,  phase_key: 'R16', home_team: 'Group I winners',                   away_team: 'Group C/D/F/G/H best 3rd',              scheduled_at: '2026-06-30T16:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 6,  phase_key: 'R16', home_team: 'Group E runners-up',                away_team: 'Group I runners-up',                    scheduled_at: '2026-06-30T20:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 7,  phase_key: 'R16', home_team: 'Group A winners',                   away_team: 'Group C/E/F/H/I best 3rd',              scheduled_at: '2026-06-30T23:00:00Z', venue: 'Mexico City Stadium' },
  { match_number: 8,  phase_key: 'R16', home_team: 'Group L winners',                   away_team: 'Group E/H/I/J/K best 3rd',              scheduled_at: '2026-07-01T16:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 9,  phase_key: 'R16', home_team: 'Group D winners',                   away_team: 'Group B/E/F/I/J best 3rd',              scheduled_at: '2026-07-01T20:00:00Z', venue: 'San Francisco Bay Area Stadium' },
  { match_number: 10, phase_key: 'R16', home_team: 'Group G winners',                   away_team: 'Group A/E/H/I/J best 3rd',              scheduled_at: '2026-07-01T23:00:00Z', venue: 'Seattle Stadium' },
  { match_number: 11, phase_key: 'R16', home_team: 'Group K runners-up',                away_team: 'Group L runners-up',                    scheduled_at: '2026-07-02T16:00:00Z', venue: 'Toronto Stadium' },
  { match_number: 12, phase_key: 'R16', home_team: 'Group H winners',                   away_team: 'Group J runners-up',                    scheduled_at: '2026-07-02T20:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 13, phase_key: 'R16', home_team: 'Group B winners',                   away_team: 'Group E/F/G/I/J best 3rd',              scheduled_at: '2026-07-02T23:00:00Z', venue: 'BC Place Vancouver' },
  { match_number: 14, phase_key: 'R16', home_team: 'Group J winners',                   away_team: 'Group H runners-up',                    scheduled_at: '2026-07-03T16:00:00Z', venue: 'Miami Stadium' },
  { match_number: 15, phase_key: 'R16', home_team: 'Group K winners',                   away_team: 'Group D/E/I/J/L best 3rd',              scheduled_at: '2026-07-03T20:00:00Z', venue: 'Kansas City Stadium' },
  { match_number: 16, phase_key: 'R16', home_team: 'Group D runners-up',                away_team: 'Group G runners-up',                    scheduled_at: '2026-07-03T23:00:00Z', venue: 'Dallas Stadium' },

  // ── R8 PHASE — 8 matches (Round of 16) ──────────────────────────────────────
  { match_number: 1,  phase_key: 'R8', home_team: 'Winner R32 M2',  away_team: 'Winner R32 M5',  scheduled_at: '2026-07-04T16:00:00Z', venue: 'Philadelphia Stadium' },
  { match_number: 2,  phase_key: 'R8', home_team: 'Winner R32 M1',  away_team: 'Winner R32 M3',  scheduled_at: '2026-07-04T20:00:00Z', venue: 'Houston Stadium' },
  { match_number: 3,  phase_key: 'R8', home_team: 'Winner R32 M4',  away_team: 'Winner R32 M6',  scheduled_at: '2026-07-05T16:00:00Z', venue: 'New York New Jersey Stadium' },
  { match_number: 4,  phase_key: 'R8', home_team: 'Winner R32 M7',  away_team: 'Winner R32 M8',  scheduled_at: '2026-07-05T20:00:00Z', venue: 'Mexico City Stadium' },
  { match_number: 5,  phase_key: 'R8', home_team: 'Winner R32 M11', away_team: 'Winner R32 M12', scheduled_at: '2026-07-06T16:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 6,  phase_key: 'R8', home_team: 'Winner R32 M9',  away_team: 'Winner R32 M10', scheduled_at: '2026-07-06T20:00:00Z', venue: 'Seattle Stadium' },
  { match_number: 7,  phase_key: 'R8', home_team: 'Winner R32 M14', away_team: 'Winner R32 M16', scheduled_at: '2026-07-07T16:00:00Z', venue: 'Atlanta Stadium' },
  { match_number: 8,  phase_key: 'R8', home_team: 'Winner R32 M13', away_team: 'Winner R32 M15', scheduled_at: '2026-07-07T20:00:00Z', venue: 'BC Place Vancouver' },

  // ── R4 PHASE — 4 matches (Quarter-finals) ───────────────────────────────────
  { match_number: 1,  phase_key: 'R4', home_team: 'Winner R16 M1', away_team: 'Winner R16 M2', scheduled_at: '2026-07-09T20:00:00Z', venue: 'Boston Stadium' },
  { match_number: 2,  phase_key: 'R4', home_team: 'Winner R16 M5', away_team: 'Winner R16 M6', scheduled_at: '2026-07-10T20:00:00Z', venue: 'Los Angeles Stadium' },
  { match_number: 3,  phase_key: 'R4', home_team: 'Winner R16 M3', away_team: 'Winner R16 M4', scheduled_at: '2026-07-11T16:00:00Z', venue: 'Miami Stadium' },
  { match_number: 4,  phase_key: 'R4', home_team: 'Winner R16 M7', away_team: 'Winner R16 M8', scheduled_at: '2026-07-11T20:00:00Z', venue: 'Kansas City Stadium' },

  // ── R2 PHASE — 2 matches (Semi-finals) ──────────────────────────────────────
  { match_number: 1,  phase_key: 'R2', home_team: 'Winner QF1', away_team: 'Winner QF2', scheduled_at: '2026-07-14T23:00:00Z', venue: 'Dallas Stadium' },
  { match_number: 2,  phase_key: 'R2', home_team: 'Winner QF3', away_team: 'Winner QF4', scheduled_at: '2026-07-15T23:00:00Z', venue: 'Atlanta Stadium' },

  // ── FINAL PHASE — 2 matches (Bronze Final + Final) ──────────────────────────
  { match_number: 1,  phase_key: 'FINAL', home_team: 'Runner-up SF1', away_team: 'Runner-up SF2', scheduled_at: '2026-07-18T23:00:00Z', venue: 'Miami Stadium' },
  { match_number: 2,  phase_key: 'FINAL', home_team: 'Winner SF1',    away_team: 'Winner SF2',    scheduled_at: '2026-07-19T23:00:00Z', venue: 'TBD' },
]

export function getMatchesByPhase(phaseKey: string): MatchDataPoint[] {
  return MATCH_DATA.filter(m => m.phase_key === phaseKey)
}
