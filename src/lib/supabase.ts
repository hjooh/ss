// Re-export the client-side Supabase client for backward compatibility
export { createClient } from './supabase/client'

// For direct supabase instance (backward compatibility)
import { createClient } from './supabase/client'
export const supabase = createClient()

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
