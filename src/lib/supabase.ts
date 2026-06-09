import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Client-side Supabase client
// Note: Will throw at runtime if env vars are missing, but allows build to succeed
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : (null as any)

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = supabaseUrl && supabaseKey
  ? (supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseKey))
  : (null as any)
