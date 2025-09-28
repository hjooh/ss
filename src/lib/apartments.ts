import { supabase } from './supabase';
import { Apartment, Complex } from '@/types';

/**
 * Fetch apartments from Supabase complex table
 */
export const fetchApartments = async (): Promise<Apartment[]> => {
  try {
    console.log('🔍 Fetching apartment complexes from Supabase...');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    const { data, error } = await supabase
      .from('complex')
      .select('*');

    console.log('📊 Supabase response:', { data, error });

    if (error) {
      console.error('❌ Error fetching apartment complexes:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No apartment complexes found in database');
      return [];
    }

    console.log(`✅ Found ${data.length} apartment complexes in database`);

    // Map Supabase complex data to our Apartment interface
    const apartments: Apartment[] = data.map((complex: any) => ({
      id: complex.id || `complex-${Math.random().toString(36).substr(2, 9)}`,
      name: complex.name,
      address: complex.address,
      rent: parsePriceRange(complex['price range']),
      bedrooms: parseBedroomRange(complex['bedroom range']),
      bathrooms: parseBathroomRange(complex['bathroom range']),
      sqft: 1000, // Default since not specified in database
      photos: [
        // Generate placeholder images
        `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80`,
        `https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80`
      ],
      pros: generatePros(complex),
      cons: generateCons(complex),
      description: generateDescription(complex)
    }));

    console.log(`Successfully fetched ${apartments.length} apartment complexes from database`);
    return apartments;
  } catch (error) {
    console.error('Failed to fetch apartment complexes:', error);
    // Return empty array on error to prevent app crash
    return [];
  }
};

/**
 * Parse price range string to get average price
 */
const parsePriceRange = (priceRange: string): number => {
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
const parseBedroomRange = (bedroomRange: string): number => {
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
const parseBathroomRange = (bathroomRange: string): number => {
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
 * Generate pros based on complex data
 */
const generatePros = (complex: any): string[] => {
  const pros: string[] = [];
  
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
const generateCons = (complex: any): string[] => {
  const cons: string[] = [];
  
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
const generateDescription = (complex: any): string => {
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