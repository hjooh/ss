// Server-side apartments service for socket server
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Create Supabase client for server-side use
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for server

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables for server-side apartments');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
  console.error('Service Key:', supabaseServiceKey ? 'Set' : 'Not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Fetch apartments from Supabase database (server-side)
 */
const fetchApartmentsServer = async () => {
  try {
    console.log('🔍 Server: Fetching apartments from Supabase...');
    console.log('Supabase URL:', supabaseUrl);
    
    const { data, error } = await supabase
      .from('apartments')
      .select('*');

    console.log('📊 Server: Supabase response:', { dataLength: data?.length, error });

    if (error) {
      console.error('❌ Server: Error fetching apartments:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Server: No apartments found in database');
      return [];
    }

    console.log(`✅ Server: Found ${data.length} apartments in database`);

    // Map Supabase data to our Apartment interface
    const apartments = data.map((apt) => ({
      id: apt.id,
      name: apt.address ? apt.address.split(',')[0] : `Apartment ${apt.id}`,
      address: apt.address || 'Address not available',
      rent: apt.price || 0,
      bedrooms: apt.bedrooms || 0,
      bathrooms: apt.bathrooms || 0,
      sqft: apt.square_feet || 0,
      photos: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      pros: generatePros(apt),
      cons: generateCons(apt),
      description: generateDescription(apt)
    }));

    console.log(`✅ Server: Successfully mapped ${apartments.length} apartments`);
    return apartments;
  } catch (error) {
    console.error('❌ Server: Failed to fetch apartments:', error);
    return [];
  }
};

/**
 * Generate pros based on apartment data
 */
const generatePros = (apt) => {
  const pros = [];
  
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
const generateCons = (apt) => {
  const cons = [];
  
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
const generateDescription = (apt) => {
  let description = `${apt.bedrooms || 0}-bedroom, ${apt.bathrooms || 0}-bathroom apartment`;
  
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

module.exports = { fetchApartmentsServer };