import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our custom user data (stored in user_profiles table)
export interface UserProfile {
  id: string
  user_id: string // References auth.users.id
  username: string
  nickname: string
  avatar_url?: string // Profile picture URL
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: UserProfile | null
  error: string | null
}
