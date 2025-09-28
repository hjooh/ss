import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Create Supabase client with service role key for server-side access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables for API route');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate deterministic ID based on complex data
const generateDeterministicId = (complex: any): string => {
  if (complex.id) return complex.id;
  
  // Create a hash based on name and address for consistent IDs
  const dataString = `${complex.name}-${complex.address}`;
  const hash = crypto.createHash('md5').update(dataString).digest('hex');
  return `complex-${hash.substring(0, 12)}`;
};

// Helper functions
const parsePriceRange = (priceRange: string): number => {
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
};

const parseBedroomRange = (bedroomRange: string): number => {
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
};

const parseBathroomRange = (bathroomRange: string): number => {
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
};

const generatePros = (complex: any): string[] => {
  const pros: string[] = [];
  
  if (complex.stars && complex.stars >= 4) {
    pros.push(`✓ High rating (${complex.stars}/5 stars)`);
  }
  
  if (complex.reviews && complex.reviews > 0) {
    pros.push(`✓ ${complex.reviews} reviews available`);
  }
  
  const price = parsePriceRange(complex['price range']);
  if (price && price <= 2000) {
    pros.push(`✓ Affordable rent ($${price})`);
  }
  
  if (complex['bedroom range']) {
    pros.push(`✓ ${complex['bedroom range']} bedroom options`);
  }
  
  // Add VT-specific pros
  if (complex['BT access'] === true) {
    pros.push(`✓ BT Bus access available`);
  }
  
  if (complex['dist from VT in miles'] && complex['dist from VT in miles'] <= 1) {
    pros.push(`✓ Close to VT campus (${complex['dist from VT in miles']} miles)`);
  }
  
  return pros;
};

const generateCons = (complex: any): string[] => {
  const cons: string[] = [];
  
  if (complex.stars && complex.stars < 3) {
    cons.push(`✗ Lower rating (${complex.stars}/5 stars)`);
  }
  
  const price = parsePriceRange(complex['price range']);
  if (price && price > 2500) {
    cons.push(`✗ Higher rent ($${price})`);
  }
  
  if (complex.reviews && complex.reviews < 5) {
    cons.push(`✗ Limited reviews (${complex.reviews})`);
  }
  
  // Add VT-specific cons
  if (complex['BT access'] === false) {
    cons.push(`✗ No BT Bus access`);
  }
  
  if (complex['dist from VT in miles'] && complex['dist from VT in miles'] > 3) {
    cons.push(`✗ Far from VT campus (${complex['dist from VT in miles']} miles)`);
  }
  
  if (cons.length === 0) {
    cons.push(`✗ Limited information available`);
  }
  
  return cons;
};

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
  
  // Add VT-specific information
  if (complex['dist from VT in miles']) {
    description += `, ${complex['dist from VT in miles']} miles from VT campus`;
  }
  
  if (complex['BT access'] === true) {
    description += ` with BT Bus access`;
  }
  
  return description;
};

export async function GET() {
  try {
    console.log('🔍 API: Fetching apartments from Supabase...');
    
    const { data, error } = await supabase
      .from('complex')
      .select('*');

    if (error) {
      console.error('❌ API: Error fetching apartments:', error);
      return NextResponse.json({ error: 'Failed to fetch apartments' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ API: No apartments found in database');
      return NextResponse.json([]);
    }

    console.log(`✅ API: Found ${data.length} apartment complexes in database`);

    // Map Supabase complex data to our Apartment interface
    const apartments = data.map((complex: any) => ({
      id: complex['complex-id'] || complex.public_id || generateDeterministicId(complex),
      name: complex.name,
      address: complex.address,
      rent: parsePriceRange(complex['price range']),
      bedrooms: parseBedroomRange(complex['bedroom range']),
      bathrooms: parseBathroomRange(complex['bathroom range']),
      sqft: 1000,
      photos: [
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      pros: generatePros(complex),
      cons: generateCons(complex),
      description: generateDescription(complex),
      // VT-specific fields
      btAccess: complex['BT access'] || false,
      distanceToVTCampus: complex['dist from VT in miles'] || null
    }));

    console.log(`✅ API: Successfully mapped ${apartments.length} apartment complexes`);
    return NextResponse.json(apartments);

  } catch (error) {
    console.error('❌ API: Failed to fetch apartments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
