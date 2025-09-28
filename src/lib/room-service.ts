import { supabase } from './supabase';
import { HuntSession, LobbySettings } from '@/types';

export interface RoomData {
  id: string;
  code: string;
  name: string;
  host_id: string;
  rounds: number;
  settings: LobbySettings;
  status: 'waiting' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}

export class RoomService {
  /**
   * Create a new room in Supabase
   */
  static async createRoom(session: HuntSession): Promise<RoomData | null> {
    try {
      console.log('🏠 Creating room in Supabase:', session.code);
      
      const roomData = {
        code: session.code,
        name: session.name,
        host_id: session.hostId,
        rounds: session.settings?.numberOfRounds || 10,
        settings: session.settings || {},
        status: 'waiting' as const
      };

      const { data, error } = await supabase
        .from('room')
        .insert([roomData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating room in Supabase:', error);
        return null;
      }

      console.log('✅ Room created successfully in Supabase:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create room in Supabase:', error);
      return null;
    }
  }

  /**
   * Update room settings in Supabase
   */
  static async updateRoomSettings(code: string, settings: Partial<LobbySettings>): Promise<boolean> {
    try {
      console.log('⚙️ Updating room settings in Supabase:', { code, settings });
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Update rounds if numberOfRounds is provided
      if (settings.numberOfRounds !== undefined) {
        updateData.rounds = settings.numberOfRounds;
      }

      // Update settings object
      if (Object.keys(settings).length > 0) {
        updateData.settings = settings;
      }

      const { error } = await supabase
        .from('room')
        .update(updateData)
        .eq('code', code);

      if (error) {
        console.error('❌ Error updating room settings in Supabase:', error);
        return false;
      }

      console.log('✅ Room settings updated successfully in Supabase');
      return true;
    } catch (error) {
      console.error('❌ Failed to update room settings in Supabase:', error);
      return false;
    }
  }

  /**
   * Update room status in Supabase
   */
  static async updateRoomStatus(code: string, status: 'waiting' | 'active' | 'completed'): Promise<boolean> {
    try {
      console.log('📊 Updating room status in Supabase:', { code, status });
      
      const { error } = await supabase
        .from('room')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('code', code);

      if (error) {
        console.error('❌ Error updating room status in Supabase:', error);
        return false;
      }

      console.log('✅ Room status updated successfully in Supabase');
      return true;
    } catch (error) {
      console.error('❌ Failed to update room status in Supabase:', error);
      return false;
    }
  }

  /**
   * Get room by code from Supabase
   */
  static async getRoomByCode(code: string): Promise<RoomData | null> {
    try {
      console.log('🔍 Getting room from Supabase:', code);
      
      const { data, error } = await supabase
        .from('room')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        console.error('❌ Error getting room from Supabase:', error);
        return null;
      }

      console.log('✅ Room retrieved successfully from Supabase:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get room from Supabase:', error);
      return null;
    }
  }

  /**
   * Delete room from Supabase
   */
  static async deleteRoom(code: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting room from Supabase:', code);
      
      const { error } = await supabase
        .from('room')
        .delete()
        .eq('code', code);

      if (error) {
        console.error('❌ Error deleting room from Supabase:', error);
        return false;
      }

      console.log('✅ Room deleted successfully from Supabase');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete room from Supabase:', error);
      return false;
    }
  }
}
