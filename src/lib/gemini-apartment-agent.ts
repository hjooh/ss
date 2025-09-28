import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { UserPreferences } from '@/types/profile';

// Use service role key for server-side operations (same as socket server)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Gemini AI using Supabase client with key type:', 
  process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

interface RoomData {
  id: string;
  players: string[];
  rounds: number;
  anon: boolean;
}

interface UserProfileWithPreferences {
  id: string;
  user_id: string;
  username: string;
  nickname: string;
  created_at: string;
  updated_at: string;
  'Preferred Commute Time (Walk)'?: string;
  'Preferred Commute Time (Drive)'?: string;
  'Amenities'?: string;
  'Culture'?: string;
  'DEI'?: string;
  ideal_apartment?: string;
  favorites?: string;
}

interface ApartmentUnit {
  uuid: string;
  name: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  photos: string[];
  pros: string[];
  cons: string[];
  description: string;
  btAccess?: boolean;
  distanceToVTCampus?: number | null;
}

/**
 * Get all users from a room by room code
 */
async function getUsersFromRoom(roomCode: string): Promise<string[]> {
  try {
    console.log(`🔍 Looking for room with ID: ${roomCode}`);
    
    // First, let's see what rooms exist for debugging
    const { data: allRooms, error: allRoomsError } = await supabase
      .from('room')
      .select('id, players')
      .order('id', { ascending: true });
    
    if (allRoomsError) {
      console.error('Error fetching all rooms:', allRoomsError);
    } else {
      console.log(`📋 Found ${allRooms?.length || 0} rooms in database:`, allRooms?.map(r => ({ id: r.id, players: r.players })));
    }
    
    // Try to find the specific room
    const { data, error } = await supabase
      .from('room')
      .select('players')
      .eq('id', roomCode)
      .single();

    if (error) {
      console.error('Error fetching room data:', error);
      console.error('Room code searched:', roomCode);
      console.error('Available room IDs:', allRooms?.map(r => r.id));
      
      // If room not found, this might be a timing issue - throw a more specific error
      if (error.code === 'PGRST116') {
        throw new Error(`Room ${roomCode} not found in database. This might be a timing issue - please try again.`);
      }
      throw error;
    }

    if (!data || !data.players) {
      throw new Error(`Room ${roomCode} found but has no players data`);
    }

    console.log(`✅ Found room data:`, data);
    return data.players;
  } catch (error) {
    console.error('Failed to get users from room:', error);
    throw error;
  }
}

/**
 * Get user profiles by nicknames
 */
async function getUserProfilesByNicknames(nicknames: string[]): Promise<UserProfileWithPreferences[]> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('nickname', nicknames);

    if (error) {
      console.error('Error fetching user profiles:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get user profiles:', error);
    throw error;
  }
}

/**
 * Get all apartments from the complex table
 */
async function getAllApartments(): Promise<ApartmentUnit[]> {
  try {
    const { data, error } = await supabase
      .from('complex')
      .select('*');

    if (error) {
      console.error('Error fetching apartments:', error);
      throw error;
    }

    // Map complex data to ApartmentUnit format
    const apartments = (data || []).map((complex) => ({
      uuid: complex['complex-id'], // Use complex-id as UUID
      name: complex.name || 'Apartment Complex',
      address: complex.address || 'Address not available',
      rent: parsePriceRange(complex['price range']),
      bedrooms: parseBedroomRange(complex['bedroom range']),
      bathrooms: parseBathroomRange(complex['bathroom range']),
      sqft: 1000, // Default since not specified
      photos: [], // Will be populated from external source
      pros: [],
      cons: [],
      description: `${complex.name} - ${complex.address}`,
      btAccess: complex['BT access'] === true || complex['BT access'] === 'true',
      distanceToVTCampus: complex['dist from VT in miles'] ? parseFloat(complex['dist from VT in miles']) : null
    }));

    return apartments;
  } catch (error) {
    console.error('Failed to get apartments:', error);
    throw error;
  }
}

// Helper functions to parse price and bedroom ranges
function parsePriceRange(priceRange: string): number {
  if (!priceRange) return 1000;
  const numbers = priceRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  return 1000;
}

function parseBedroomRange(bedroomRange: string): number {
  if (!bedroomRange) return 2;
  const numbers = bedroomRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  return 2;
}

function parseBathroomRange(bathroomRange: string): number {
  if (!bathroomRange) return 1;
  const numbers = bathroomRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  return 1;
}

/**
 * Get favorite apartments from user profiles
 */
function getFavoriteApartments(userProfiles: UserProfileWithPreferences[]): string[] {
  const favorites: string[] = [];
  
  userProfiles.forEach(profile => {
    // Check if user has favorites stored
    if (profile.favorites) {
      try {
        // If favorites is already an array, use it directly
        if (Array.isArray(profile.favorites)) {
          favorites.push(...profile.favorites);
        } else if (typeof profile.favorites === 'string') {
          // If favorites is a JSON string, parse it
          const userFavorites = JSON.parse(profile.favorites);
          if (Array.isArray(userFavorites)) {
            favorites.push(...userFavorites);
          }
        } else {
          console.warn('Unexpected favorites type:', typeof profile.favorites, profile.favorites);
        }
      } catch (parseError) {
        // If not JSON, treat as comma-separated string
        if (typeof profile.favorites === 'string') {
          const userFavorites = profile.favorites.split(',').map(f => f.trim()).filter(f => f);
          favorites.push(...userFavorites);
        } else {
          console.warn('Failed to parse favorites:', profile.favorites, parseError);
        }
      }
    }
  });

  return [...new Set(favorites)]; // Remove duplicates
}

/**
 * Filter apartments based on minimum bedroom count
 */
function filterApartmentsByBedrooms(apartments: ApartmentUnit[], minBedrooms: number): ApartmentUnit[] {
  return apartments.filter(apt => apt.bedrooms >= minBedrooms);
}

/**
 * Use Gemini AI to select the best apartments based on user preferences
 */
async function selectApartmentsWithAI(
  apartments: ApartmentUnit[],
  userProfiles: UserProfileWithPreferences[],
  targetCount: number,
  favoriteApartments: string[]
): Promise<string[]> {
  try {
    // Prepare user preferences summary (excluding bedrooms and bathrooms)
    const preferencesSummary = userProfiles.map(profile => ({
      nickname: profile.nickname,
      walkCommute: profile['Preferred Commute Time (Walk)'],
      driveCommute: profile['Preferred Commute Time (Drive)'],
      amenities: profile.Amenities,
      culture: profile.Culture,
      dei: profile.DEI,
      idealApartment: profile.ideal_apartment
    }));

    // Prepare apartments summary
    const apartmentsSummary = apartments.map(apt => ({
      uuid: apt.uuid,
      name: apt.name,
      address: apt.address,
      rent: apt.rent,
      bedrooms: apt.bedrooms,
      bathrooms: apt.bathrooms,
      sqft: apt.sqft,
      pros: apt.pros,
      cons: apt.cons,
      description: apt.description,
      btAccess: apt.btAccess,
      distanceToVTCampus: apt.distanceToVTCampus
    }));

    const prompt = `
You are an AI apartment selection agent. Your task is to select exactly ${targetCount} apartments from the available options that best match the combined preferences of all users in the room.

USER PREFERENCES SUMMARY:
${JSON.stringify(preferencesSummary, null, 2)}

FAVORITE APARTMENTS (must be included):
${JSON.stringify(favoriteApartments, null, 2)}

AVAILABLE APARTMENTS:
${JSON.stringify(apartmentsSummary, null, 2)}

INSTRUCTIONS:
1. You MUST include all favorite apartments in your selection
2. Select exactly ${targetCount} apartments total
3. Prioritize apartments that match the most user preferences
4. Consider commute preferences (walk/drive time), amenities, culture, and DEI factors
5. Look for apartments that match users' ideal apartment descriptions
6. Ensure variety in the selection (different price ranges, locations, etc.)
7. Return ONLY the complex-id values of the selected apartments in a JSON array

Return your selection as a JSON array of apartment complex-id values:
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      const selectedUUIDs = JSON.parse(text);
      if (Array.isArray(selectedUUIDs)) {
        return selectedUUIDs;
      } else {
        throw new Error('AI response is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response:', text);
      
      // Fallback: select apartments based on simple criteria
      return selectApartmentsFallback(apartments, favoriteApartments, targetCount);
    }
  } catch (error) {
    console.error('AI selection failed, using fallback:', error);
    return selectApartmentsFallback(apartments, favoriteApartments, targetCount);
  }
}

/**
 * Fallback apartment selection when AI fails
 */
function selectApartmentsFallback(
  apartments: ApartmentUnit[],
  favoriteApartments: string[],
  targetCount: number
): string[] {
  const selected: string[] = [...favoriteApartments];
  
  // Add apartments that aren't favorites until we reach target count
  const remaining = apartments.filter(apt => !selected.includes(apt.uuid));
  
  // Sort by rent (ascending) to prioritize affordable options
  remaining.sort((a, b) => a.rent - b.rent);
  
  // Add apartments until we reach target count
  for (const apt of remaining) {
    if (selected.length >= targetCount) break;
    selected.push(apt.uuid);
  }
  
  return selected.slice(0, targetCount);
}

/**
 * Update room with apartment list
 */
async function updateRoomApartmentList(roomCode: string, apartmentList: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('room')
      .update({ 'apt list': apartmentList }) // Note: column name has a space
      .eq('id', roomCode);

    if (error) {
      console.error('Error updating room apartment list:', error);
      return false;
    }

    console.log('Successfully updated room apartment list:', apartmentList);
    return true;
  } catch (error) {
    console.error('Failed to update room apartment list:', error);
    return false;
  }
}

/**
 * Main function to generate apartment list for a room
 */
export async function generateApartmentListForRoom(roomCode: string): Promise<{
  success: boolean;
  apartmentList?: string[];
  error?: string;
}> {
  try {
    console.log(`🏠 Generating apartment list for room: ${roomCode}`);

    // 1. Get all users from the room
    const userNicknames = await getUsersFromRoom(roomCode);
    console.log(`👥 Found ${userNicknames.length} users in room:`, userNicknames);

    if (userNicknames.length === 0) {
      return { success: false, error: 'No users found in room' };
    }

    // 2. Get user profiles with preferences
    const userProfiles = await getUserProfilesByNicknames(userNicknames);
    console.log(`📋 Retrieved ${userProfiles.length} user profiles`);

    if (userProfiles.length === 0) {
      return { success: false, error: 'No user profiles found' };
    }

    // 3. Get room data to determine rounds
    const { data: roomData, error: roomError } = await supabase
      .from('room')
      .select('rounds')
      .eq('id', roomCode)
      .single();

    if (roomError || !roomData) {
      return { success: false, error: 'Failed to get room data' };
    }

    const numRounds = roomData.rounds || 10;
    const targetCount = Math.floor(numRounds / 2) + 1;
    console.log(`🎯 Target apartment count: ${targetCount} (based on ${numRounds} rounds)`);

    // 4. Get all apartments
    const allApartments = await getAllApartments();
    console.log(`🏢 Retrieved ${allApartments.length} total apartments`);

    if (allApartments.length === 0) {
      return { success: false, error: 'No apartments available' };
    }

    // 5. Filter apartments by minimum bedroom count (room size)
    const minBedrooms = userNicknames.length;
    const filteredApartments = filterApartmentsByBedrooms(allApartments, minBedrooms);
    console.log(`🛏️ Filtered to ${filteredApartments.length} apartments with ≥${minBedrooms} bedrooms`);

    if (filteredApartments.length === 0) {
      return { success: false, error: `No apartments found with ${minBedrooms}+ bedrooms` };
    }

    // 6. Get favorite apartments from users
    const favoriteApartments = getFavoriteApartments(userProfiles);
    console.log(`❤️ Found ${favoriteApartments.length} favorite apartments:`, favoriteApartments);

    // 7. Use AI to select the best apartments
    const selectedApartments = await selectApartmentsWithAI(
      filteredApartments,
      userProfiles,
      targetCount,
      favoriteApartments
    );
    console.log(`🤖 AI selected ${selectedApartments.length} apartments:`, selectedApartments);

    // 8. Update room with apartment list
    const updateSuccess = await updateRoomApartmentList(roomCode, selectedApartments);
    
    if (!updateSuccess) {
      return { success: false, error: 'Failed to update room with apartment list' };
    }

    return {
      success: true,
      apartmentList: selectedApartments
    };

  } catch (error) {
    console.error('Error generating apartment list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Trigger apartment list generation when swiping starts
 */
export async function triggerApartmentListGeneration(roomCode: string): Promise<void> {
  try {
    console.log(`🚀 Triggering apartment list generation for room: ${roomCode}`);
    
    const result = await generateApartmentListForRoom(roomCode);
    
    if (result.success) {
      console.log('✅ Apartment list generated successfully:', result.apartmentList);
    } else {
      console.error('❌ Failed to generate apartment list:', result.error);
    }
  } catch (error) {
    console.error('❌ Error triggering apartment list generation:', error);
  }
}
