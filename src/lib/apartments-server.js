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
 * Parse price range string to get average price
 */
const parsePriceRange = (priceRange) => {
  if (!priceRange) return 1000; // Default price
  
  // Extract numbers from price range (e.g., "$800-$1200" -> 1000)
  const numbers = priceRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  
  return 1000; // Default
};

/**
 * Parse bedroom range string to get average bedrooms
 */
const parseBedroomRange = (bedroomRange) => {
  if (!bedroomRange) return 2; // Default bedrooms
  
  // Extract numbers from bedroom range (e.g., "1-3" -> 2)
  const numbers = bedroomRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  
  return 2; // Default
};

/**
 * Parse bathroom range string to get average bathrooms
 */
const parseBathroomRange = (bathroomRange) => {
  if (!bathroomRange) return 1; // Default bathrooms
  
  // Extract numbers from bathroom range (e.g., "1-2" -> 1.5 -> 2)
  const numbers = bathroomRange.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return Math.round((min + max) / 2);
  } else if (numbers && numbers.length === 1) {
    return parseInt(numbers[0]);
  }
  
  return 1; // Default
};

/**
 * Fetch apartments from Supabase complex table (server-side)
 */
const fetchApartmentsServer = async () => {
  try {
    console.log('🔍 Server: Fetching apartment complexes from Supabase...');
    console.log('Supabase URL:', supabaseUrl);
    
    const { data, error } = await supabase
      .from('complex')
      .select('*');

    console.log('📊 Server: Supabase response:', { dataLength: data?.length, error });

    if (error) {
      console.error('❌ Server: Error fetching apartment complexes:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Server: No apartment complexes found in database');
      return [];
    }

    console.log(`✅ Server: Found ${data.length} apartment complexes in database`);

    // Map Supabase complex data to our Apartment interface
    const apartments = data.map((complex) => ({
      id: complex.id || `complex-${Math.random().toString(36).substr(2, 9)}`,
      name: complex.name || 'Apartment Complex',
      address: complex.address || 'Address not available',
      rent: parsePriceRange(complex['price range']),
      bedrooms: parseBedroomRange(complex['bedroom range']),
      bathrooms: parseBathroomRange(complex['bathroom range']),
      sqft: 1000, // Default since not specified in database
      photos: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      pros: generatePros(complex),
      cons: generateCons(complex),
      description: generateDescription(complex)
    }));

    console.log(`✅ Server: Successfully mapped ${apartments.length} apartment complexes`);
    return apartments;
  } catch (error) {
    console.error('❌ Server: Failed to fetch apartment complexes:', error);
    return [];
  }
};

/**
 * Generate pros based on complex data
 */
const generatePros = (complex) => {
  const pros = [];
  
  // Add star rating as a pro if high
  if (complex.stars && complex.stars >= 4) {
    pros.push(`✓ High rating (${complex.stars}/5 stars)`);
  }
  
  // Add reviews as a pro if available
  if (complex.reviews && complex.reviews > 0) {
    pros.push(`✓ ${complex.reviews} reviews available`);
  }
  
  // Add price range as a pro if affordable
  const price = parsePriceRange(complex['price range']);
  if (price && price <= 2000) {
    pros.push(`✓ Affordable rent ($${price})`);
  }
  
  // Add bedroom range as a pro
  if (complex['bedroom range']) {
    pros.push(`✓ ${complex['bedroom range']} bedroom options`);
  }
  
  return pros;
};

/**
 * Generate cons based on complex data
 */
const generateCons = (complex) => {
  const cons = [];
  
  // Add star rating as a con if low
  if (complex.stars && complex.stars < 3) {
    cons.push(`✗ Lower rating (${complex.stars}/5 stars)`);
  }
  
  // Add price as a con if expensive
  const price = parsePriceRange(complex['price range']);
  if (price && price > 2500) {
    cons.push(`✗ Higher rent ($${price})`);
  }
  
  // Add reviews as a con if few reviews
  if (complex.reviews && complex.reviews < 5) {
    cons.push(`✗ Limited reviews (${complex.reviews})`);
  }
  
  // Add generic cons if no specific data
  if (cons.length === 0) {
    cons.push(`✗ Limited information available`);
  }
  
  return cons;
};

/**
 * Generate description based on complex data
 */
const generateDescription = (complex) => {
  let description = `${complex.name} apartment complex`;
  
  if (complex['bedroom range']) {
    description += ` offering ${complex['bedroom range']} bedroom options`;
  }
  
  if (complex['price range']) {
    description += ` with rent ranging from ${complex['price range']}`;
  }
  
  if (complex.stars) {
    description += ` (${complex.stars}/5 star rating)`;
  }
  
  if (complex.reviews) {
    description += ` with ${complex.reviews} reviews`;
  }
  
  return description;
};

module.exports = { fetchApartmentsServer };