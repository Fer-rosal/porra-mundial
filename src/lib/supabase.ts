import { createClient } from '@supabase/supabase-js'

// ARCHITECT_NOTE: .env.local uses NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead of
// NEXT_PUBLIC_SUPABASE_ANON_KEY. The spec says to use NEXT_PUBLIC_SUPABASE_ANON_KEY.
// We support both via fallback so neither .env.local nor .env.local.example needs
// to change immediately. Flagging for review.
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? ''

/**
 * Singleton anon client — used for all read-only queries where no session
 * identity is needed.
 */
export const supabase = createClient(supabaseUrl, supabaseAnon)

/**
 * Returns a Supabase client that sends x-session-id header on every request.
 * Required for RLS policies that gate admin mutations (game update/delete,
 * tournament_phases update, matches update).
 *
 * Creating a new instance per call is safe in Next.js App Router client
 * components — the underlying HTTP client is stateless. A shared singleton
 * with mutable headers would risk race conditions across concurrent renders.
 */
export function supabaseWithSession(sessionId: string) {
  return createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { 'x-session-id': sessionId } },
  })
}
