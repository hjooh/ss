import { createClient } from '@supabase/supabase-js'

// Ensure the variable names here EXACTLY match the names you used in Vercel.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// The '!' tells TypeScript that you are certain these variables will exist.

if (!supabaseUrl || !supabaseKey) {
  // This check provides a clearer error message if the variables are missing.
  throw new Error("Supabase URL or Key is missing from environment variables.");
}


export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our custom user data (stored in user_profiles table)
export interface UserProfile {
  id: string
  user_id: string // References auth.users.id
  username: string
  nickname: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: UserProfile | null
  error: string | null
}
