import { supabase } from './supabase';
import { Apartment } from '@/types';

export interface SupabaseApartment {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  per_person_price: number;
  driving_time_to_vt: string;
  walking_time_to_vt: string;
  amenities: string[];
  culture_community_vibe: string;
  dei_features: string[];
  user_reviews_summary: string;
  star_rating: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch apartments from Supabase database
 */
export const fetchApartments = async (): Promise<Apartment[]> => {
  try {
    console.log('🔍 Fetching apartments from Supabase...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const { data, error } = await supabase
      .from('apartments')
      .select('*');

    console.log('📊 Supabase response:', { data, error });

    if (error) {
      console.error('❌ Error fetching apartments:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No apartments found in database');
      return [];
    }

    console.log(`✅ Found ${data.length} apartments in database`);

    // Map Supabase data to our Apartment interface
    const apartments: Apartment[] = data.map((apt: SupabaseApartment) => ({
      id: apt.id,
      name: apt.address.split(',')[0] || apt.address, // Use first part of address as name
      address: apt.address,
      rent: apt.price,
      bedrooms: apt.bedrooms,
      bathrooms: apt.bathrooms,
      sqft: apt.square_feet,
      photos: [
        // Generate placeholder images based on apartment features
        `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80`,
        `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80`
      ],
      pros: generatePros(apt),
      cons: generateCons(apt),
      description: generateDescription(apt)
    }));

    console.log(`Successfully fetched ${apartments.length} apartments from database`);
    return apartments;
  } catch (error) {
    console.error('Failed to fetch apartments:', error);
    // Return empty array on error to prevent app crash
    return [];
  }
};

/**
 * Generate pros based on apartment data
 */
const generatePros = (apt: SupabaseApartment): string[] => {
  const pros: string[] = [];
  
  // Parse walking time (e.g., "32 min" -> 32)
  const walkingTime = parseInt(apt.walking_time_to_vt?.replace(/\D/g, '') || '0');
  const drivingTime = parseInt(apt.driving_time_to_vt?.replace(/\D/g, '') || '0');
  
  if (walkingTime && walkingTime <= 10) {
    pros.push(`✓ ${apt.walking_time_to_vt} walk to Virginia Tech campus`);
  } else if (drivingTime && drivingTime <= 5) {
    pros.push(`✓ ${apt.driving_time_to_vt} drive to Virginia Tech campus`);
  }
  
  if (apt.star_rating && apt.star_rating >= 4) {
    pros.push(`✓ High rating (${apt.star_rating}/5 stars)`);
  }
  
  if (apt.amenities && Array.isArray(apt.amenities)) {
    apt.amenities.slice(0, 2).forEach(amenity => {
      pros.push(`✓ ${amenity}`);
    });
  }
  
  if (apt.per_person_price && apt.per_person_price <= 500) {
    pros.push(`✓ Affordable per-person cost ($${apt.per_person_price})`);
  }
  
  return pros;
};

/**
 * Generate cons based on apartment data
 */
const generateCons = (apt: SupabaseApartment): string[] => {
  const cons: string[] = [];
  
  // Parse walking time (e.g., "32 min" -> 32)
  const walkingTime = parseInt(apt.walking_time_to_vt?.replace(/\D/g, '') || '0');
  
  if (walkingTime && walkingTime > 15) {
    cons.push(`✗ ${apt.walking_time_to_vt} walk to campus`);
  }
  
  if (apt.star_rating && apt.star_rating < 3) {
    cons.push(`✗ Lower rating (${apt.star_rating}/5 stars)`);
  }
  
  if (apt.per_person_price && apt.per_person_price > 800) {
    cons.push(`✗ Higher per-person cost ($${apt.per_person_price})`);
  }
  
  if (apt.square_feet && apt.square_feet < 800) {
    cons.push(`✗ Smaller space (${apt.square_feet} sq ft)`);
  }
  
  return cons;
};

/**
 * Generate description based on apartment data
 */
const generateDescription = (apt: SupabaseApartment): string => {
  let description = `${apt.bedrooms}-bedroom, ${apt.bathrooms}-bathroom apartment`;
  
  if (apt.culture_community_vibe) {
    description += ` with a ${apt.culture_community_vibe.toLowerCase()} vibe`;
  }
  
  if (apt.user_reviews_summary) {
    description += `. ${apt.user_reviews_summary}`;
  }
  
  if (apt.amenities && Array.isArray(apt.amenities)) {
    const topAmenities = apt.amenities.slice(0, 2);
    description += ` Features include ${topAmenities.join(' and ')}.`;
  }
  
  return description;
};