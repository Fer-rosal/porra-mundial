# Porra Mundial - World Cup 2026 Betting Game

A multiplayer online betting game for the FIFA World Cup 2026, where players predict match results and goalscorers across all tournament phases.

## 🌐 Live Demo

**App**: https://porramundial-ten.vercel.app

## 📋 Features

### Admin
- ✅ Create games with auto-generated invite codes
- ✅ Open and lock tournament phases (League → Finals)
- ✅ Enter match results (system auto-infers 1X2)
- ✅ Award scorer points (1-2 pts per goal)
- ✅ View player predictions and scorer selections
- ✅ Edit results and scorer selections

### Players
- ✅ Join games via invite code
- ✅ Submit exact match predictions (e.g., 2-1)
- ✅ Select one scorer per tournament phase (locked after entry)
- ✅ View live leaderboard with running scores
- ✅ Track personal score across all 6 phases
- ✅ See prediction history and results

## 🎯 Scoring System

| Scenario | Points |
|----------|--------|
| Correct 1X2 (Win/Draw) | 1 pt |
| Correct Exact Result | 1 + 2 = 3 pts |
| Scorer Goal (Regular Phase) | 1 pt per goal |
| **Final Phase Multiplier** | **3x** |
| Final 1X2 | 3 pts |
| Final Exact Result | 3 + 5 = 8 pts |
| Final Scorer Goal | 2 pts per goal |

## 🏆 Tournament Phases

1. **League Round** (Group Stage)
2. **Round of 16** (1/16)
3. **Quarterfinals** (1/8)
4. **Semifinals** (1/4)
5. **Finals** (1/2)
6. **Championship** (Final)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js Route Handlers, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Auth0
- **Deployment**: Vercel
- **Testing**: Jest, Playwright

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/Fer-rosal/porra-mundial
   cd porra-mundial
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your credentials:
   ```env
   # Auth0
   NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.us.auth0.com
   NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
   AUTH0_CLIENT_SECRET=your_client_secret
   AUTH0_BASE_URL=http://localhost:3000

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run locally**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## 🗄️ Database

The project includes Supabase migrations in `supabase/migrations/001_create_schema.sql`:
- 8 tables with proper relationships
- Indexes for performance
- Cascading deletes for data integrity

Run migrations via Supabase dashboard or CLI.

## 🧪 Testing

### Unit Tests
```bash
npm test
```
- Scoring utilities (phase multipliers, calculations)
- API response utilities (success/error patterns)
- Match data utilities (tournament structure, filtering)

### E2E Tests
```bash
npm run test:e2e
```
- Full tournament workflow
- Admin and player flows
- Visual regression detection

## 🚀 Deployment

### Vercel (Production)

The app is already deployed to Vercel and automatically deploys on git push:

**Environment Variables in Vercel:**
- `NEXT_PUBLIC_AUTH0_DOMAIN`
- `NEXT_PUBLIC_AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Deployment Status**: https://vercel.com/fernando-rosals-projects/porra_mundial

## 📁 Project Structure

```
porra-mundial/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (16 endpoints)
│   │   ├── dashboard/        # Player dashboard
│   │   ├── games/[gameId]/   # Game pages (predictions, leaderboard, etc)
│   │   ├── join/             # Game join page
│   │   ├── layout.tsx        # Root layout with Auth0 provider
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable components (6 total)
│   ├── lib/
│   │   ├── api.ts            # API client
│   │   ├── auth.ts           # Auth utilities
│   │   ├── scoring.ts        # Score calculation
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── match-data.ts     # 64 preloaded FIFA 2026 matches
│   │   └── __tests__/        # Unit tests
│   └── styles/               # Global CSS & Tailwind
├── supabase/
│   └── migrations/           # Database schema
├── e2e/                      # End-to-end tests
├── public/                   # Static assets
├── package.json
├── next.config.js
├── tsconfig.json
└── tailwind.config.js
```

## 🎨 Design

- **Color Scheme**: White background with orange accents (orange-500: #f97316)
- **Typography**: Montserrat font family
- **Responsive**: Mobile-first design (375px, 768px, 1200px+)
- **Accessibility**: WCAG AA contrast standards, keyboard navigation

## 👥 User Roles

### Admin
- Can create games
- Can manage tournament phases
- Can enter match results and scorer points
- Can view all game history and predictions

### Player
- Can join games via invite code
- Can submit predictions and scorers
- Can view leaderboard and personal score
- Cannot modify games (read-only)

## 🔐 Security

- Auth0 OAuth for user authentication
- JWT tokens for API authorization
- Role-based access control (admin vs player)
- Parameterized SQL queries (no injection)
- Environment variables for sensitive data

## 📊 API Endpoints

**Admin Endpoints** (8 total)
- POST `/api/games` - Create game
- PUT `/api/games/[id]/phase/[phase_key]/open` - Open phase
- PUT `/api/games/[id]/phase/[phase_key]/lock` - Lock phase
- POST `/api/games/[id]/phase/[phase_key]/results` - Enter results
- POST `/api/games/[id]/phase/[phase_key]/scorer-points` - Award scorer points
- GET `/api/games/[id]/history` - View game history
- And more...

**Player Endpoints** (8 total)
- GET `/api/games` - List user's games
- POST `/api/games/join` - Join game
- GET `/api/games/[id]/current-phase` - Get current phase
- POST `/api/games/[id]/predictions` - Submit prediction
- POST `/api/games/[id]/scorer-selection` - Select scorer
- GET `/api/games/[id]/leaderboard` - Get leaderboard
- And more...

## 📝 License

MIT

## 👤 Author

Created with Claude Code WebForge Framework

---

**Questions?** Check the Vercel dashboard or view the deployment logs:
https://vercel.com/fernando-rosals-projects/porra_mundial
