import { supabase, UserProfile, AuthResponse } from './supabase'
import { generateUserAvatar } from './avatar-generator'

export const authService = {
  // Sign up with username and password using Supabase Auth
  async signUp(username: string, password: string, nickname: string): Promise<AuthResponse> {
    try {
      // Check if username already exists in user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', username)
        .single()

      if (existingProfile) {
        return {
          user: null,
          error: 'Username already exists'
        }
      }

      // Create user with Supabase Auth using email format for username
      // Use .internal domain (reserved, can't be registered by others)
      const tempEmail = `${username}@padmatch.internal`
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: password,
      })

      if (authError) {
        return {
          user: null,
          error: authError.message
        }
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Failed to create user'
        }
      }

      // Create user profile with DiceBear Thumbs avatar
      const avatarUrl = generateUserAvatar(username);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: authData.user.id,
            username,
            nickname,
            avatar_url: avatarUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (profileError) {
        // Note: Admin functions don't work with anon key
        // Supabase will handle cleanup of unused auth users automatically
        return {
          user: null,
          error: 'Username may already be taken. Please try a different one.'
        }
      }

      return {
        user: {
          id: profileData.id,
          user_id: profileData.user_id,
          username: profileData.username,
          nickname: profileData.nickname,
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  },

  // Sign in with username and password using Supabase Auth
  async signIn(username: string, password: string, rememberMe: boolean = true): Promise<AuthResponse> {
    try {
      // Convert username to email format for Supabase Auth
      const tempEmail = `${username}@padmatch.internal`
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: password,
      })

      if (authError) {
        return {
          user: null,
          error: 'Invalid username or password'
        }
      }

      if (!authData.user) {
        return {
          user: null,
          error: 'Login failed'
        }
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()

      if (profileError || !profileData) {
        return {
          user: null,
          error: 'User profile not found'
        }
      }

      // Update last login timestamp
      await supabase
        .from('user_profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', profileData.id)

      // Handle remember me functionality
      if (!rememberMe) {
        // Store a flag to indicate this session should not persist
        try {
          localStorage.setItem('padmatch-remember-me', 'false');
        } catch (e) {
          console.warn('Could not set remember me flag:', e);
        }
      } else {
        // Clear the flag if remember me is true
        try {
          localStorage.removeItem('padmatch-remember-me');
        } catch (e) {
          console.warn('Could not clear remember me flag:', e);
        }
      }

      return {
        user: {
          id: profileData.id,
          user_id: profileData.user_id,
          username: profileData.username,
          nickname: profileData.nickname,
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  },

  // Get current user session
  async getCurrentUser(): Promise<AuthResponse> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        return {
          user: null,
          error: 'No authenticated user'
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single()

      if (profileError || !profileData) {
        return {
          user: null,
          error: 'User profile not found'
        }
      }

      return {
        user: {
          id: profileData.id,
          user_id: profileData.user_id,
          username: profileData.username,
          nickname: profileData.nickname,
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  },

  // Update user profile
  async updateProfile(updates: { nickname?: string; username?: string; avatar_url?: string }): Promise<AuthResponse> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        return {
          user: null,
          error: 'No authenticated user'
        }
      }

      // Check if username is being changed and if it already exists
      if (updates.username) {
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', updates.username)
          .neq('user_id', authUser.id)
          .single()

        if (existingProfile) {
          return {
            user: null,
            error: 'Username already exists'
          }
        }
      }

      // Update the profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authUser.id)
        .select()
        .single()

      if (profileError) {
        return {
          user: null,
          error: profileError.message
        }
      }

      return {
        user: {
          id: profileData.id,
          user_id: profileData.user_id,
          username: profileData.username,
          nickname: profileData.nickname,
          avatar_url: profileData.avatar_url,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        },
        error: null
      }
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  },

  // Check if remember me is enabled
  isRememberMeEnabled(): boolean {
    try {
      const rememberMeFlag = localStorage.getItem('padmatch-remember-me');
      return rememberMeFlag !== 'false';
    } catch (e) {
      console.warn('Could not check remember me flag:', e);
      return true; // Default to enabled if we can't check
    }
  },

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      // Clear remember me flag
      try {
        localStorage.removeItem('padmatch-remember-me');
      } catch (e) {
        console.warn('Could not clear remember me flag:', e);
      }

      const { error } = await supabase.auth.signOut()
      return { error: error?.message || null }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  }
}
