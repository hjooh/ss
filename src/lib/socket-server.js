const { Server: SocketIOServer } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables for socket server');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Helper function to save session to Supabase
const saveSessionToSupabase = async (session) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, skipping database save');
    return false;
  }

  try {
    console.log('🏠 Saving session to Supabase:', session.code);
    
    const roomData = {
      id: session.code, // Use code as the primary key
      'Room Name': session.name,
      Anon: !session.settings?.showIndividualRatings, // Use anonymous mode setting
      Rounds: session.settings?.numberOfApartments || 10 // Use numberOfApartments setting
    };

    const { data, error } = await supabase
      .from('room')
      .insert([roomData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving session to Supabase:', error);
      return false;
    }

    console.log('✅ Session saved successfully to Supabase:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to save session to Supabase:', error);
    return false;
  }
};

// Helper function to save room data to room table when voting starts
const saveRoomToRoom2 = async (session) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, skipping room save');
    return false;
  }

  try {
    console.log('🏠 Saving room data to room table:', session.code);
    
    // Extract player nicknames from roommates
    const players = session.roommates.map(roommate => roommate.nickname);
    
    // Get apartments from session settings (default to 10 if not set)
    const rounds = session.settings?.numberOfApartments || 10;
    
    // Determine if anonymous based on session settings
    const anon = !session.settings?.showIndividualRatings;
    
    const roomData = {
      id: session.code, // Use room code as UUID
      players: players, // Array of player nicknames
      rounds: rounds, // Number of rounds from settings
      anon: anon // Anonymous flag
    };

    console.log('📊 Room data to save:', roomData);

    const { data, error } = await supabase
      .from('room')
      .insert([roomData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving room to room table:', error);
      return false;
    }

    console.log('✅ Room saved successfully to room table:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to save room to room table:', error);
    return false;
  }
};

// Helper function to save comparison decision to Supabase
const saveComparisonToSupabase = async (sessionId, winningApartmentId, losingApartmentId) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, skipping comparison save');
    return false;
  }

  try {
    console.log('💾 Saving comparison to Supabase:', { sessionId, winningApartmentId, losingApartmentId });
    console.log('💾 Data types:', { 
      sessionId: typeof sessionId, 
      winningApartmentId: typeof winningApartmentId, 
      losingApartmentId: typeof losingApartmentId 
    });
    
    const comparisonData = {
      session_id: sessionId,
      winning_apartment_id: winningApartmentId,
      losing_apartment_id: losingApartmentId
    };

    const { data, error } = await supabase
      .from('comparisons')
      .insert([comparisonData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving comparison to Supabase:', error);
      return false;
    }

    console.log('✅ Comparison saved successfully to Supabase:', data);
    return true;
  } catch (error) {
    console.error('❌ Failed to save comparison to Supabase:', error);
    return false;
  }
};

// Helper function to update session settings in Supabase
const updateSessionSettingsInSupabase = async (code, settings) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, skipping database update');
    return false;
  }

  try {
    console.log('⚙️ Updating session settings in Supabase:', { code, settings });
    
    const updateData = {};

    // Update apartments if numberOfApartments is provided
    if (settings.numberOfApartments !== undefined) {
      updateData.Rounds = settings.numberOfApartments; // Keep Rounds field for backward compatibility
    }

    const { error } = await supabase
      .from('room')
      .update(updateData)
      .eq('id', code);

    if (error) {
      console.error('❌ Error updating session settings in Supabase:', error);
      return false;
    }

    console.log('✅ Session settings updated successfully in Supabase');
    return true;
  } catch (error) {
    console.error('❌ Failed to update session settings in Supabase:', error);
    return false;
  }
};

// Avatar generation function (inline since we can't import ES modules in CommonJS)
const generateRoommateAvatar = (nickname, size = 80) => {
  // Use a variety of pleasant background colors
  const backgroundColors = [
    ['fef3c7', 'fde68a'], // Yellow
    ['dbeafe', 'bfdbfe'], // Blue
    ['d1fae5', 'a7f3d0'], // Green
    ['fce7f3', 'fbcfe8'], // Pink
    ['e0e7ff', 'c7d2fe'], // Indigo
    ['fed7d7', 'fbb6ce'], // Rose
    ['f3e8ff', 'ddd6fe'], // Purple
    ['d1fae5', 'a7f3d0'], // Emerald
  ];
  
  // Select background color based on nickname hash
  const hash = nickname.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const colorIndex = Math.abs(hash) % backgroundColors.length;
  
  const params = new URLSearchParams();
  params.append('seed', nickname);
  params.append('size', size.toString());
  backgroundColors[colorIndex].forEach(color => {
    params.append('backgroundColor', color);
  });
  params.append('scale', '110');
  
  return `https://api.dicebear.com/9.x/thumbs/svg?${params.toString()}`;
};

// Server-side session storage
class ServerSessionStorage {
  constructor() {
    this.sessions = new Map();
  }

  createSession(session) {
    this.sessions.set(session.id, session);
    console.log('Server: Created session', session.code, 'Total sessions:', this.sessions.size);
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getSessionByCode(code) {
    console.log('Server: Looking for session with code:', code);
    const session = Array.from(this.sessions.values()).find(s => s.code === code);
    console.log('Server: Found session:', session ? 'YES' : 'NO');
    return session;
  }

  updateSession(session) {
    this.sessions.set(session.id, session);
  }

  deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    console.log('Server: Deleted session', sessionId, 'Total sessions:', this.sessions.size);
  }

  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

const serverSessionStorage = new ServerSessionStorage();

// Import apartments service
// Import sample apartments for hunt sessions
const sampleApartments = [
  {
    id: 'apt-1',
    name: 'The Mill',
    address: '123 Mill Street, Blacksburg, VA 24060',
    rent: 1200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 5-minute walk to Virginia Tech campus',
      '✓ Recently renovated kitchen with granite countertops',
      '✓ In-unit washer and dryer',
      '✓ Pet-friendly with no breed restrictions',
      '✓ Covered parking included'
    ],
    cons: [
      '✗ Higher rent compared to similar units',
      '✗ No central air conditioning',
      '✗ Limited storage space',
      '✗ Street parking can be difficult on game days'
    ],
    description: 'Modern 2-bedroom apartment in the heart of downtown Blacksburg, perfect for students who want to be close to campus and local amenities.'
  },
  {
    id: 'apt-2',
    name: 'Foxridge Apartments',
    address: '456 Foxridge Drive, Blacksburg, VA 24060',
    rent: 850,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    photos: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ Affordable rent with great value',
      '✓ Two full bathrooms - no sharing!',
      '✓ Large living room with fireplace',
      '✓ Balcony with mountain views',
      '✓ On-site fitness center'
    ],
    cons: [
      '✗ 15-minute drive to campus',
      '✗ Older building with some maintenance issues',
      '✗ Limited public transportation',
      '✗ No in-unit laundry'
    ],
    description: 'Spacious 2-bedroom, 2-bathroom apartment with stunning mountain views. Great for students with cars who don\'t mind the commute.'
  },
  {
    id: 'apt-4',
    name: 'The Mill',
    address: '123 Mill Street, Blacksburg, VA 24060',
    rent: 1200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 5-minute walk to Virginia Tech campus',
      '✓ Recently renovated kitchen with granite countertops',
      '✓ In-unit washer and dryer',
      '✓ Pet-friendly with no breed restrictions',
      '✓ Covered parking included'
    ],
    cons: [
      '✗ Higher rent compared to similar units',
      '✗ No central air conditioning',
      '✗ Limited storage space',
      '✗ Street parking can be difficult on game days'
    ],
    description: 'Modern 2-bedroom apartment in the heart of downtown Blacksburg, perfect for students who want to be close to campus and local amenities.'
  },
  {
    id: 'apt-3',
    name: 'The Mill',
    address: '123 Mill Street, Blacksburg, VA 24060',
    rent: 1200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop'
    ],
    pros: [
      '✓ 5-minute walk to Virginia Tech campus',
      '✓ Recently renovated kitchen with granite countertops',
      '✓ In-unit washer and dryer',
      '✓ Pet-friendly with no breed restrictions',
      '✓ Covered parking included'
    ],
    cons: [
      '✗ Higher rent compared to similar units',
      '✗ No central air conditioning',
      '✗ Limited storage space',
      '✗ Street parking can be difficult on game days'
    ],
    description: 'Modern 2-bedroom apartment in the heart of downtown Blacksburg, perfect for students who want to be close to campus and local amenities.'
  },
];

// Cache for apartments - use sample apartments for hunt sessions
let cachedApartments = sampleApartments;

// Function to fetch apartments from Supabase database
const fetchApartmentsFromDatabase = async (numberOfApartments = 10) => {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured, using sample apartments');
    return getSessionApartments(sampleApartments, numberOfApartments);
  }

  try {
    console.log('🔍 Fetching apartments from Supabase database...');
    console.log(`📊 Requested apartments: ${numberOfApartments}`);
    
    // Calculate how many apartments we need
    const apartmentsNeeded = numberOfApartments;
    console.log(`📊 Apartments needed: ${apartmentsNeeded}`);
    
    // First, check how many apartments are available in the database
    const { count, error: countError } = await supabase
      .from('complex')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error checking apartment count:', countError);
    } else {
      console.log(`📊 Total apartments in database: ${count}`);
    }
    
    // Fetch apartments from the database with random ordering
    const { data, error } = await supabase
      .from('complex')
      .select('*')
      .limit(Math.max(apartmentsNeeded * 3, 50)); // Get more than needed to ensure we have enough
    
    if (error) {
      console.error('❌ Error fetching apartments from database:', error);
      console.log('🔄 Falling back to sample apartments');
      return getSessionApartments(sampleApartments, numberOfApartments);
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No apartments found in database, using sample apartments');
      return getSessionApartments(sampleApartments, numberOfApartments);
    }

    console.log(`✅ Found ${data.length} apartments in database`);

    // Map database data to apartment format
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

    console.log(`📊 Mapped ${apartments.length} apartments from database data`);
    console.log(`📊 Apartments needed: ${apartmentsNeeded}, Available: ${apartments.length}`);

    // Check if we have enough apartments
    if (apartments.length < apartmentsNeeded) {
      console.warn(`⚠️ Not enough apartments in database (${apartments.length} < ${apartmentsNeeded})`);
      console.log('🔄 Falling back to sample apartments');
      return getSessionApartments(sampleApartments, numberOfApartments);
    }

    // Shuffle and select the needed number
    const shuffled = [...apartments].sort(() => Math.random() - 0.5);
    const selectedApartments = shuffled.slice(0, apartmentsNeeded);
    
    console.log(`📊 Selected ${selectedApartments.length} apartments for ${numberOfApartments} rounds from database`);
    console.log(`📊 Selected apartment IDs: ${selectedApartments.map(apt => apt.id).join(', ')}`);
    return selectedApartments;
    
  } catch (error) {
    console.error('❌ Failed to fetch apartments from database:', error);
    console.log('🔄 Falling back to sample apartments');
    return getSessionApartments(sampleApartments, numberOfApartments);
  }
};

// Helper function to parse price range
const parsePriceRange = (priceRange) => {
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

// Helper function to parse bedroom range
const parseBedroomRange = (bedroomRange) => {
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

// Helper function to parse bathroom range
const parseBathroomRange = (bathroomRange) => {
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

// Helper function to generate pros
const generatePros = (complex) => {
  const pros = [];
  if (complex.amenities) pros.push(`✓ ${complex.amenities}`);
  if (complex.location) pros.push(`✓ ${complex.location}`);
  if (complex.features) pros.push(`✓ ${complex.features}`);
  return pros.length > 0 ? pros : ['✓ Good location', '✓ Affordable rent'];
};

// Helper function to generate cons
const generateCons = (complex) => {
  const cons = [];
  if (complex.issues) cons.push(`✗ ${complex.issues}`);
  if (complex.limitations) cons.push(`✗ ${complex.limitations}`);
  return cons.length > 0 ? cons : ['✗ Limited parking', '✗ Older building'];
};

// Helper function to generate description
const generateDescription = (complex) => {
  return complex.description || `${complex.name} - A great place to live with modern amenities and convenient location.`;
};

// Binary search ranking system functions
const initializeRankingSystem = (session) => {
  console.log('🔍 Initializing binary search ranking system...');
  
  // Move all apartments to unranked list
  session.rankingSystem.unrankedApartments = [...session.availableApartments];
  session.rankingSystem.rankedApartments = [];
  session.rankingSystem.isRanking = true;
  session.rankingSystem.rankingProgress = 0;
  
  console.log(`📊 Ranking system initialized with ${session.rankingSystem.unrankedApartments.length} apartments`);
  
  // Start with first two apartments for initial ranking
  if (session.rankingSystem.unrankedApartments.length >= 2) {
    const firstApartment = session.rankingSystem.unrankedApartments.shift();
    const secondApartment = session.rankingSystem.unrankedApartments.shift();
    
    // Create initial comparison
    session.currentMatchup = {
      id: `ranking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leftApartment: firstApartment,
      rightApartment: secondApartment,
      votes: [],
      status: 'active',
      createdAt: new Date(),
      isRankingComparison: true
    };
    
    console.log(`🏁 Initial ranking comparison: ${firstApartment.id} vs ${secondApartment.id}`);
  }
};

const binarySearchInsert = (apartment, rankedList) => {
  if (rankedList.length === 0) {
    return 0;
  }
  
  let left = 0;
  let right = rankedList.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    // For now, we'll use a simple comparison - in real implementation,
    // this would be based on the user's previous voting patterns
    // or we'd need to ask the user to compare with the middle element
    const midApartment = rankedList[mid];
    
    // This is a placeholder - in real implementation, we'd need user input
    // to determine if apartment should go before or after midApartment
    if (apartment.rent < midApartment.rent) {
      right = mid;
    } else {
      left = mid + 1;
    }
  }
  
  return left;
};

const processRankingVote = (session, winnerId) => {
  console.log('🔍 Processing ranking vote...');
  
  // Guard clauses to ensure session is valid
  if (!session) {
    console.error('❌ Session is undefined in processRankingVote');
    return;
  }
  if (!session.rankingSystem) {
    console.error('❌ rankingSystem is undefined in processRankingVote');
    return;
  }
  if (!session.currentMatchup) {
    console.error('❌ currentMatchup is undefined in processRankingVote');
    return;
  }
  
  const matchup = session.currentMatchup;
  const winner = winnerId === matchup.leftApartment.id ? matchup.leftApartment : matchup.rightApartment;
  const loser = winnerId === matchup.leftApartment.id ? matchup.rightApartment : matchup.leftApartment;
  
  // Save comparison decision to Supabase
  saveComparisonToSupabase(session.code, winnerId, loser.id).then(success => {
    if (success) {
      console.log('✅ Ranking comparison saved to Supabase');
    } else {
      console.warn('⚠️ Failed to save ranking comparison to Supabase, but ranking continues');
    }
  });
  
  // Track vote counts for each apartment
  if (!session.rankingSystem.apartmentVoteCounts[winner.id]) {
    session.rankingSystem.apartmentVoteCounts[winner.id] = 0;
  }
  if (!session.rankingSystem.apartmentVoteCounts[loser.id]) {
    session.rankingSystem.apartmentVoteCounts[loser.id] = 0;
  }
  
  // Add votes from this comparison
  const winnerVotes = matchup.votes.filter(v => v.apartmentId === winner.id).length;
  const loserVotes = matchup.votes.filter(v => v.apartmentId === loser.id).length;
  
  session.rankingSystem.apartmentVoteCounts[winner.id] += winnerVotes;
  session.rankingSystem.apartmentVoteCounts[loser.id] += loserVotes;
  
  // Track comparison history
  console.log('🔍 Debug: session.rankingSystem exists:', !!session.rankingSystem);
  console.log('🔍 Debug: comparisonHistory exists:', !!session.rankingSystem?.comparisonHistory);
  
  if (!session.rankingSystem) {
    console.error('❌ rankingSystem is undefined!');
    return;
  }
  if (!session.rankingSystem.comparisonHistory) {
    console.log('🔧 Initializing comparisonHistory array');
    session.rankingSystem.comparisonHistory = [];
  }
  session.rankingSystem.comparisonHistory.push({
    leftApartment: matchup.leftApartment,
    rightApartment: matchup.rightApartment,
    winner: winner,
    loser: loser,
    winnerVotes: winnerVotes,
    loserVotes: loserVotes,
    totalVotes: matchup.votes.length,
    timestamp: new Date()
  });
  
  // If this is the first comparison, just add both apartments in order
  if (session.rankingSystem.rankedApartments.length === 0) {
    session.rankingSystem.rankedApartments.push(winner);
    session.rankingSystem.rankedApartments.push(loser);
    console.log(`📊 Initial ranking: ${winner.id} (1st), ${loser.id} (2nd)`);
  } else {
    // Use binary search to find the right position for the winner
    // But first check if the winner is already in the ranked list
    const winnerAlreadyRanked = session.rankingSystem.rankedApartments.some(apt => apt.id === winner.id);
    if (!winnerAlreadyRanked) {
      const insertIndex = binarySearchInsert(winner, session.rankingSystem.rankedApartments);
      session.rankingSystem.rankedApartments.splice(insertIndex, 0, winner);
      console.log(`📊 Inserted ${winner.id} at position ${insertIndex + 1}`);
    } else {
      console.log(`📊 Winner ${winner.id} already ranked, skipping insertion`);
    }
  }
  
  session.rankingSystem.rankingProgress++;
  
  // Log the matchup (for ranking system, we track in comparisonHistory instead)
  // No need to push to matchupLog since we removed that property
  
  // Check if we have more apartments to rank
  if (session.rankingSystem.unrankedApartments.length > 0) {
    const nextApartment = session.rankingSystem.unrankedApartments.shift();
    
    // Use binary search to find the best comparison apartment
    const comparisonIndex = Math.floor(session.rankingSystem.rankedApartments.length / 2);
    const comparisonApartment = session.rankingSystem.rankedApartments[comparisonIndex];
    
    const nextMatchupId = `ranking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    session.currentMatchup = {
      id: nextMatchupId,
      leftApartment: nextApartment,
      rightApartment: comparisonApartment,
      votes: [],
      status: 'active',
      createdAt: new Date(),
      isRankingComparison: true
    };
    
    console.log(`🏁 Next ranking comparison: ${nextApartment.id} vs ${comparisonApartment.id} (position ${comparisonIndex + 1})`);
  } else {
    // Ranking complete - create comprehensive ranking results
    console.log('✅ Ranking complete! Creating final ranking with vote counts...');
    
    // Create final ranking with vote counts
    // First, deduplicate the ranked apartments to prevent duplicate keys
    const uniqueRankedApartments = [];
    const seenIds = new Set();
    
    for (const apartment of session.rankingSystem.rankedApartments) {
      if (!seenIds.has(apartment.id)) {
        uniqueRankedApartments.push(apartment);
        seenIds.add(apartment.id);
      }
    }
    
    const finalRanking = uniqueRankedApartments.map((apartment, index) => ({
      rank: index + 1,
      apartment: apartment,
      totalVotes: session.rankingSystem.apartmentVoteCounts[apartment.id] || 0,
      winPercentage: session.rankingSystem.comparisonHistory
        .filter(comp => comp.winner.id === apartment.id || comp.loser.id === apartment.id)
        .length > 0 ? 
        (session.rankingSystem.comparisonHistory
          .filter(comp => comp.winner.id === apartment.id).length / 
         session.rankingSystem.comparisonHistory
          .filter(comp => comp.winner.id === apartment.id || comp.loser.id === apartment.id).length) * 100 : 0
    }));
    
    console.log('📊 Final Ranking Results:');
    finalRanking.forEach(item => {
      console.log(`  ${item.rank}. ${item.apartment.name} - ${item.totalVotes} votes (${item.winPercentage.toFixed(1)}% win rate)`);
    });
    
    session.rankingSystem.isRanking = false;
    session.currentMatchup = null;
    session.championApartment = session.rankingSystem.rankedApartments[0];
    
    // Store the final ranking results
    session.rankingSystem.finalRanking = finalRanking;
    
    console.log(`🏆 Champion: ${session.championApartment.name} with ${finalRanking[0].totalVotes} votes`);
  }
};

// Function to get apartments for a session (fallback for sample data)
const getSessionApartments = (allApartments, numberOfApartments = 10) => {
  // Calculate how many apartments we need
  const apartmentsNeeded = numberOfApartments;
  
  if (allApartments.length <= apartmentsNeeded) {
    console.log(`📊 Using all ${allApartments.length} apartments for ranking`);
    return [...allApartments];
  }
  
  // Shuffle and take a random subset
  const shuffled = [...allApartments].sort(() => Math.random() - 0.5);
  const selectedApartments = shuffled.slice(0, apartmentsNeeded);
  
  console.log(`📊 Selected ${selectedApartments.length} apartments for ranking`);
  return selectedApartments;
};


function initializeSocketServer(io) {
  // Map socket IDs to user IDs
  const socketToUser = new Map();
  
  // Helper function to find user by socket in any session
  const findUserBySocket = (socket) => {
    const socketId = socket.id;
    const userId = socketToUser.get(socketId);
    if (userId) return userId;
    
    // Try to find user by checking all sessions for this socket's rooms
    const allSessions = serverSessionStorage.getAllSessions();
    for (const session of allSessions) {
      if (socket.rooms.has(session.id)) {
        const onlineUsers = session.roommates.filter(r => r.isOnline);
        if (onlineUsers.length === 1) {
          const foundUserId = onlineUsers[0].id;
          socketToUser.set(socketId, foundUserId);
          console.log('✅ Recovered user mapping for socket:', socketId, '-> user:', foundUserId);
          return foundUserId;
        }
      }
    }
    return null;
  };
  
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    console.log('🔌 Total connections:', io.engine.clientsCount);

    // Generate a unique session code
    const generateSessionCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Create a new session
    socket.on('create-session', ({ nickname }) => {
      console.log('🚀 Server: Creating session for', nickname);
      console.log('🚀 Socket ID:', socket.id);
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const code = generateSessionCode();
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const defaultSettings = {
          // Voting settings
          requireUnanimousVoting: false,
          allowVetoOverride: true,
          minimumRatingToPass: 3,
          
          // Session management
          allowMembersToControlNavigation: true,
          autoAdvanceOnConsensus: false,
          sessionTimeout: 60, // 1 hour
          
          // Filtering preferences
          maxRent: null,
          minBedrooms: null,
          maxCommute: null,
          
          // Privacy settings
          showIndividualRatings: true,
          allowGuestJoining: true,
          
          // Notification preferences
          notifyOnNewRatings: true,
        notifyOnVetos: true,
        
        // Ranking settings
        numberOfApartments: 10 // Number of apartments to rank (replaces numberOfRounds)
      };

      const session = {
        id: sessionId,
        code,
        name: `${nickname}'s Hunt`, // Default room name
        hostId: userId, // Track the host user ID
        roommates: [{
          id: userId,
          nickname,
          avatar: generateRoommateAvatar(nickname),
          isOnline: true,
          joinedAt: new Date()
        }],
        currentMatchup: null, // No matchup until host starts
        availableApartments: [], // Will be populated asynchronously
        championApartment: null,
        // Binary search ranking system
        rankingSystem: {
          rankedApartments: [], // Array of apartments in ranked order
          unrankedApartments: [], // Apartments not yet ranked
          currentComparison: null, // Current apartment being ranked
          isRanking: false, // Whether we're in ranking mode
          rankingProgress: 0, // How many apartments have been ranked
          apartmentVoteCounts: {}, // Track total votes for each apartment
          comparisonHistory: [], // Track all comparisons made
        },
        settings: defaultSettings,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      serverSessionStorage.createSession(session);
      socket.join(sessionId);
      
      // Map this socket to the user
      socketToUser.set(socket.id, userId);
      console.log('Server: Session created - mapped socket', socket.id, 'to user', userId);
      
      console.log('Server: Session created with code', code);
      
      // Fetch apartments from database asynchronously
      console.log(`🔍 Starting apartment fetch for session ${sessionId} with ${defaultSettings.numberOfApartments} apartments`);
      fetchApartmentsFromDatabase(defaultSettings.numberOfApartments).then(apartments => {
        // Update the session with fetched apartments
        const updatedSession = serverSessionStorage.getSession(sessionId);
        if (updatedSession) {
          updatedSession.availableApartments = apartments;
          serverSessionStorage.updateSession(updatedSession);
          console.log(`📊 Session ${sessionId} updated with ${apartments.length} apartments from database`);
          console.log(`📊 Available apartments: ${apartments.map(apt => apt.id).join(', ')}`);
          
          // Broadcast updated session to all clients
          io.to(sessionId).emit('session-updated', { session: updatedSession });
        } else {
          console.error(`❌ Session ${sessionId} not found when trying to update apartments`);
        }
      }).catch(error => {
        console.error('❌ Failed to fetch apartments from database:', error);
        // Fallback to sample apartments
        const updatedSession = serverSessionStorage.getSession(sessionId);
        if (updatedSession) {
          const fallbackApartments = getSessionApartments(sampleApartments, defaultSettings.numberOfApartments);
          updatedSession.availableApartments = fallbackApartments;
          serverSessionStorage.updateSession(updatedSession);
          console.log(`📊 Session ${sessionId} updated with ${fallbackApartments.length} sample apartments`);
          console.log(`📊 Fallback apartments: ${fallbackApartments.map(apt => apt.id).join(', ')}`);
          
          // Broadcast updated session to all clients
          io.to(sessionId).emit('session-updated', { session: updatedSession });
        } else {
          console.error(`❌ Session ${sessionId} not found when trying to update with fallback apartments`);
        }
      });
      
      // Save session to Supabase
      saveSessionToSupabase(session).then(success => {
        if (success) {
          console.log('✅ Session successfully saved to Supabase');
        } else {
          console.warn('⚠️ Failed to save session to Supabase, but session is still active');
        }
      });
      
      socket.emit('session-created', {
        session,
        currentUser: session.roommates[0]
      });
    });

    // Join an existing session
    socket.on('join-session', ({ code, nickname }) => {
      console.log('🔗 Server: Joining session with code', code);
      console.log('🔗 Socket ID:', socket.id);
      console.log('🔗 Nickname:', nickname);
      console.log('🔗 Available sessions:', serverSessionStorage.getAllSessions().map(s => ({ code: s.code, id: s.id, roommates: s.roommates.length })));
      
      const session = serverSessionStorage.getSessionByCode(code);
      
      if (!session) {
        console.error('🚫 Session not found for code:', code);
        console.log('📋 Available session codes:', serverSessionStorage.getAllSessions().map(s => s.code));
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      console.log('Server: Join session - found session:', session.id);
      
      // Reuse existing roommate if nickname matches (case-insensitive)
      const existing = session.roommates.find(
        r => r.nickname && r.nickname.toLowerCase() === String(nickname).toLowerCase()
      );

      let userId;
      let joinedRoommate;
      if (existing) {
        // Preserve the original user ID to maintain host status
        existing.isOnline = true;
        existing.joinedAt = existing.joinedAt || new Date();
        userId = existing.id; // Keep the original ID!
        joinedRoommate = existing;
        console.log('Server: Reusing existing roommate', existing.nickname, 'with ID', userId);
      } else {
        userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        joinedRoommate = {
        id: userId,
        nickname,
          avatar: generateRoommateAvatar(nickname),
        isOnline: true,
        joinedAt: new Date()
      };
        session.roommates.push(joinedRoommate);
        console.log('Server: Created new roommate', nickname, 'with ID', userId);
      }
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      socket.join(session.id);
      
      // Map socket to the (existing or new) user id
      socketToUser.set(socket.id, userId);
      console.log('Server: Session joined - mapped socket', socket.id, 'to user', userId);

      // Notify others only if this is a brand new roommate
      if (!existing) {
        socket.to(session.id).emit('roommate-joined', { roommate: joinedRoommate });
      }
      
      // Send session data to the joining client
      socket.emit('session-joined', {
        session,
        currentUser: joinedRoommate
      });
      
      console.log('Server: Join session - completed for user', userId);
      console.log('Server: Session host is', session.hostId, ', current user is', userId, ', is host?', session.hostId === userId);
    });

    // Vote for an apartment in the current matchup
    socket.on('vote-apartment', ({ apartmentId }) => {
      // Find which session this socket belongs to
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup) {
        socket.emit('error', { message: 'Not in an active session' });
        return;
      }

      // Add a guard to prevent infinite loops
      if (session.currentMatchup._processingVote) {
        console.log('Server: Vote already being processed, ignoring duplicate vote');
        return;
      }
      session.currentMatchup._processingVote = true;

      // Get the user ID from the socket mapping
      let userId = findUserBySocket(socket);
      console.log('Server: Vote - socket.id:', socket.id);
      console.log('Server: Vote - userId from mapping:', userId);
      console.log('Server: Vote - socketToUser map:', Array.from(socketToUser.entries()));
      
      if (!userId) {
        console.error('🚫 ERROR: Cannot determine user identity during vote');
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      console.log('Server: Vote - currentUser:', currentUser);
      
      if (!currentUser) {
        console.error('🚫 ERROR: User not found in session during vote');
        console.error('🚫 ERROR: userId:', userId, 'roommate IDs:', session.roommates.map(r => r.id));
        socket.emit('error', { message: 'User not found in session' });
        return;
      }

      // Check if apartment is in current matchup
      if (apartmentId !== session.currentMatchup.leftApartment.id && 
          apartmentId !== session.currentMatchup.rightApartment.id) {
        socket.emit('error', { message: 'Invalid apartment for current matchup' });
        return;
      }

      console.log('Server: Vote - before processing, votes:', session.currentMatchup.votes);
      
      // Check if user already voted for this apartment
      const existingVote = session.currentMatchup.votes.find(v => v.roommateId === currentUser.id);
      const isVotingForSameApartment = existingVote && existingVote.apartmentId === apartmentId;
      
      console.log('Server: Vote - existingVote:', existingVote);
      console.log('Server: Vote - isVotingForSameApartment:', isVotingForSameApartment);
      console.log('Server: Vote - currentUser.id:', currentUser.id);
      console.log('Server: Vote - apartmentId:', apartmentId);
      
      // Remove existing vote from this user
      session.currentMatchup.votes = session.currentMatchup.votes.filter(
        v => v.roommateId !== currentUser.id
      );
      
      console.log('Server: Vote - after removal, votes:', session.currentMatchup.votes);
      console.log('Server: Vote - isVotingForSameApartment:', isVotingForSameApartment);
      
      // Only add new vote if user is not clicking the same apartment (i.e., they want to remove their vote)
      if (!isVotingForSameApartment) {
        const vote = {
          roommateId: currentUser.id,
          apartmentId,
          timestamp: new Date()
        };
        session.currentMatchup.votes.push(vote);
        console.log('Server: Vote - added new vote for different apartment');
      } else {
        console.log('Server: Vote - removed vote (user clicked same apartment)');
      }
      
      session.updatedAt = new Date();
      
      console.log('Server: Vote - final votes:', session.currentMatchup.votes);
      
      serverSessionStorage.updateSession(session);
      
      // Check if all online users have voted
      const onlineUsers = session.roommates.filter(r => r.isOnline);
      const hasVoted = session.currentMatchup.votes.length === onlineUsers.length;
      
      // If countdown was running but now not all users have voted, cancel countdown
      if (session.currentMatchup.status === 'counting-down' && !hasVoted) {
        session.currentMatchup.status = 'active';
        session.currentMatchup.countdownSeconds = undefined;
        session.currentMatchup.countdownStartTime = undefined;
        
        // Clear any existing countdown interval
        if (session.countdownInterval) {
          clearInterval(session.countdownInterval);
          session.countdownInterval = undefined;
        }
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast countdown cancelled
        io.to(session.id).emit('countdown-cancelled', { 
          matchup: session.currentMatchup
        });
      }
      
      if (hasVoted && session.currentMatchup.status !== 'counting-down') {
        // Start countdown before ending round
        session.currentMatchup.status = 'counting-down';
        session.currentMatchup.countdownSeconds = 5;
        session.currentMatchup.countdownStartTime = new Date();
        
        // Broadcast countdown start
        io.to(session.id).emit('countdown-started', { 
          matchup: session.currentMatchup,
          secondsRemaining: 5 
        });
        
        // Start countdown timer
        session.countdownInterval = setInterval(() => {
          const currentSession = serverSessionStorage.getSession(session.id);
          if (!currentSession || !currentSession.currentMatchup || currentSession.currentMatchup.status !== 'counting-down') {
            clearInterval(session.countdownInterval);
            session.countdownInterval = undefined;
            return;
          }
          
          currentSession.currentMatchup.countdownSeconds--;
          
          // Broadcast countdown update
          io.to(session.id).emit('countdown-update', { 
            matchup: currentSession.currentMatchup,
            secondsRemaining: currentSession.currentMatchup.countdownSeconds 
          });
          
          if (currentSession.currentMatchup.countdownSeconds <= 0) {
            console.log('Server: Countdown reached 0, ending round');
            clearInterval(session.countdownInterval);
            session.countdownInterval = undefined;
            
            // Now actually end the round
            const leftVotes = currentSession.currentMatchup.votes.filter(v => v.apartmentId === currentSession.currentMatchup.leftApartment.id).length;
            const rightVotes = currentSession.currentMatchup.votes.filter(v => v.apartmentId === currentSession.currentMatchup.rightApartment.id).length;
            
            let winnerId;
            let status = 'completed';
            
            if (leftVotes > rightVotes) {
              winnerId = currentSession.currentMatchup.leftApartment.id;
            } else if (rightVotes > leftVotes) {
              winnerId = currentSession.currentMatchup.rightApartment.id;
            } else {
              status = 'tie';
            }
            
            currentSession.currentMatchup.winner = winnerId;
            currentSession.currentMatchup.status = status;
            currentSession.currentMatchup.completedAt = new Date();
            
            // Process ranking vote (binary search only)
            if (winnerId && currentSession.rankingSystem && currentSession.rankingSystem.isRanking) {
                console.log('🔍 Processing ranking vote...');
                processRankingVote(currentSession, winnerId);
            }
            
            serverSessionStorage.updateSession(currentSession);
            
            // Broadcast session update
            io.to(session.id).emit('session-updated', { session: currentSession });
            
            // If ranking is complete, broadcast ranking completion with full results
            if (!currentSession.rankingSystem.isRanking) {
              console.log('Server: Broadcasting ranking-completed with full ranking results');
              io.to(session.id).emit('tournament-completed', { 
                champion: currentSession.championApartment,
                ranking: currentSession.rankingSystem.rankedApartments,
                finalRanking: currentSession.rankingSystem.finalRanking,
                voteCounts: currentSession.rankingSystem.apartmentVoteCounts,
                comparisonHistory: currentSession.rankingSystem.comparisonHistory
              });
            }
          }
        }, 1000);
      }
      
      // Clear the processing guard
      session.currentMatchup._processingVote = false;
      
      // Broadcast session update with the updated session
      const updatedSession = serverSessionStorage.getSession(session.id);
      if (updatedSession) {
        io.to(session.id).emit('session-updated', { session: updatedSession });
      }
    });

    // Force end current round (host only)
    socket.on('force-end-round', () => {
      console.log('🛑 Server: Received force-end-round from socket', socket.id);
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup) {
        console.warn('🛑 Server: force-end-round failed: no active session/matchup. session?', !!session);
        socket.emit('error', { message: 'Not in an active session' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      console.log('🛑 Server: force-end-round userId from mapping:', userId, 'hostId:', session.hostId);
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      if (!currentUser || currentUser.id !== session.hostId) {
        console.warn('🛑 Server: force-end-round rejected: not host');
        socket.emit('error', { message: 'Only the host can force end rounds' });
        return;
      }

      // End current round with current votes
      const leftVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.leftApartment.id).length;
      const rightVotes = session.currentMatchup.votes.filter(v => v.apartmentId === session.currentMatchup.rightApartment.id).length;
      
      let winnerId;
      if (leftVotes > rightVotes) {
        winnerId = session.currentMatchup.leftApartment.id;
      } else if (rightVotes > leftVotes) {
        winnerId = session.currentMatchup.rightApartment.id;
      }
      
      session.currentMatchup.winner = winnerId;
      session.currentMatchup.status = winnerId ? 'completed' : 'tie';
      session.currentMatchup.completedAt = new Date();
      
      // Log the matchup (only if matchupLog exists)
      if (session.matchupLog) {
        const matchupLog = {
          matchupId: session.currentMatchup.id,
          leftApartmentId: session.currentMatchup.leftApartment.id,
          rightApartmentId: session.currentMatchup.rightApartment.id,
          winnerId,
          votes: [...session.currentMatchup.votes],
          createdAt: session.currentMatchup.createdAt
        };
        session.matchupLog.push(matchupLog);
      }
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast round force ended
      io.to(session.id).emit('round-force-ended', { matchup: session.currentMatchup });
      
      // Broadcast session update
      io.to(session.id).emit('session-updated', { session });
    });

    // Start session (host only)
    socket.on('start-session', () => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Not in a session' });
        return;
      }

      // Get the user ID from the socket mapping
      let userId = findUserBySocket(socket);
      console.log('🐛 DEBUG: Start session - socket.id:', socket.id);
      console.log('🐛 DEBUG: Start session - userId from mapping:', userId);
      console.log('🐛 DEBUG: Start session - socketToUser entries:', Array.from(socketToUser.entries()));
      console.log('🐛 DEBUG: Start session - session roommates:', session.roommates.map(r => ({ id: r.id, nickname: r.nickname, isOnline: r.isOnline })));
      
      if (!userId) {
        console.error('🚫 ERROR: Cannot determine user identity - multiple or no online users');
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      console.log('Server: Start session - currentUser:', currentUser);
      console.log('Server: Start session - session.hostId:', session.hostId);
      console.log('Server: Start session - all roommates:', session.roommates);
      
      if (!currentUser) {
        console.error('🚫 ERROR: User ID found in mapping but not in session roommates');
        console.error('🚫 ERROR: Looking for userId:', userId);
        console.error('🚫 ERROR: Available roommate IDs:', session.roommates.map(r => r.id));
        socket.emit('error', { message: 'User not found in session' });
        return;
      }
      
      if (currentUser.id !== session.hostId) {
        socket.emit('error', { message: 'Only the host can start the session' });
        return;
      }

      // Initialize binary search ranking system
      if (!session.currentMatchup && session.availableApartments.length >= 2) {
        console.log(`🔍 Starting binary search ranking with ${session.availableApartments.length} apartments`);
        console.log(`🔍 Available apartments: ${session.availableApartments.map(apt => apt.id).join(', ')}`);
        
        // Initialize the ranking system
        initializeRankingSystem(session);
        
        console.log(`Server: Binary search ranking started with ${session.availableApartments.length} apartments`);
        
        // Save room data to room table when voting officially starts
        console.log('🚀 Starting to save room data to room table...');
        console.log('📊 Session data:', {
          code: session.code,
          roommates: session.roommates.map(r => r.nickname),
          apartments: session.settings?.numberOfApartments || 10
        });
        
        saveRoomToRoom2(session).then(success => {
          if (success) {
            console.log('✅ Room data saved to room table successfully');
            
            // Trigger apartment list generation for the room
            console.log('🤖 Triggering apartment list generation...');
            
            // Emit AI loading state to all users in the room
            io.to(session.id).emit('ai-generating-apartments', {
              message: 'AI is curating your personalized apartment list...',
              roomCode: session.code
            });
            
            // Add a longer delay and retry logic to ensure room data is fully committed
            const triggerAIGeneration = async (retryCount = 0) => {
              const maxRetries = 3;
              const delay = 1000 + (retryCount * 500); // 1s, 1.5s, 2s
              
              console.log(`🤖 Attempting AI generation (attempt ${retryCount + 1}/${maxRetries + 1})...`);
              
              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-apartment-list`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ roomCode: session.code })
                });
                
                if (response.ok) {
                  console.log('✅ Apartment list generation triggered successfully');
                  
                  // Emit completion state
                  io.to(session.id).emit('ai-generation-complete', {
                    message: 'Your personalized apartment list is ready!',
                    roomCode: session.code
                  });
                  return; // Success, exit retry loop
                } else {
                  const errorText = await response.text();
                  console.error('❌ Failed to trigger apartment list generation:', response.status, response.statusText, errorText);
                  
                  if (retryCount < maxRetries) {
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    setTimeout(() => triggerAIGeneration(retryCount + 1), delay);
                    return;
                  } else {
                    // Final failure after all retries
                    io.to(session.id).emit('ai-generation-error', {
                      message: 'Failed to generate apartment list after multiple attempts. Please try again.',
                      roomCode: session.code
                    });
                  }
                }
              } catch (error) {
                console.error('❌ Error triggering apartment list generation:', error);
                
                if (retryCount < maxRetries) {
                  console.log(`⏳ Retrying in ${delay}ms due to error...`);
                  setTimeout(() => triggerAIGeneration(retryCount + 1), delay);
                  return;
                } else {
                  // Final failure after all retries
                  io.to(session.id).emit('ai-generation-error', {
                    message: 'Failed to generate apartment list after multiple attempts. Please try again.',
                    roomCode: session.code
                  });
                }
              }
            };
            
            // Start the AI generation process with initial delay
            setTimeout(() => triggerAIGeneration(), 1000);
          } else {
            console.warn('⚠️ Failed to save room data to room table');
          }
        }).catch(error => {
          console.error('❌ Error saving room data:', error);
        });
        
        serverSessionStorage.updateSession(session);
        
        // Broadcast session update
        io.to(session.id).emit('session-updated', { session });
      }
    });

    // Host tiebreak for tied rounds
    socket.on('host-tiebreak', ({ winnerId }) => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session || !session.currentMatchup || session.currentMatchup.status !== 'tie') {
        socket.emit('error', { message: 'No tie to break' });
        return;
      }

      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (!userId) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      if (!currentUser || currentUser.id !== session.hostId) {
        socket.emit('error', { message: 'Only the host can break ties' });
        return;
      }

      // Process ranking tiebreak (binary search only)
      console.log('🔍 Processing ranking tiebreak...');
      processRankingVote(session, winnerId);
      
      serverSessionStorage.updateSession(session);
      
      // Broadcast session update
      io.to(session.id).emit('session-updated', { session });
      
      // If ranking is complete, broadcast ranking completion with full results
      if (!session.rankingSystem.isRanking) {
        console.log('Server: Broadcasting ranking-completed with full ranking results');
        io.to(session.id).emit('tournament-completed', { 
          champion: session.championApartment,
          ranking: session.rankingSystem.rankedApartments,
          finalRanking: session.rankingSystem.finalRanking,
          voteCounts: session.rankingSystem.apartmentVoteCounts,
          comparisonHistory: session.rankingSystem.comparisonHistory
        });
      }
    });

    // Handle settings update
    socket.on('update-settings', ({ settings }) => {
      const session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Check if the user is the host
      const userId = socketToUser.get(socket.id);
      if (userId !== session.hostId) {
        socket.emit('error', { message: 'Only the host can update settings' });
        return;
      }

      // Update settings
      session.settings = { ...session.settings, ...settings };
      session.updatedAt = new Date();
      
      // If numberOfApartments changed and session hasn't started yet, refetch apartments
      if (settings.numberOfApartments !== undefined && 
          settings.numberOfApartments !== session.availableApartments.length &&
          !session.rankingSystem.isRanking) {
        console.log(`🔄 Refetching apartments due to numberOfApartments change: ${session.availableApartments.length} -> ${settings.numberOfApartments}`);
        
        // Refetch apartments with new number
        fetchApartmentsFromDatabase(settings.numberOfApartments).then(apartments => {
          const updatedSession = serverSessionStorage.getSession(session.id);
          if (updatedSession) {
            updatedSession.availableApartments = apartments;
            serverSessionStorage.updateSession(updatedSession);
            console.log(`📊 Session ${session.id} updated with ${apartments.length} apartments`);
            
            // Broadcast the updated session
            io.to(session.id).emit('session-updated', { session: updatedSession });
          }
        }).catch(error => {
          console.error('❌ Failed to refetch apartments:', error);
        });
      }
      
      serverSessionStorage.updateSession(session);
      
      // Save settings update to Supabase
      updateSessionSettingsInSupabase(session.code, settings).then(success => {
        if (success) {
          console.log('✅ Settings successfully updated in Supabase');
        } else {
          console.warn('⚠️ Failed to update settings in Supabase, but session is still updated');
        }
      });
      
      // Broadcast settings update to all clients in the session
      io.to(session.id).emit('settings-updated', { settings: session.settings });
      io.to(session.id).emit('session-updated', { session });
      
      console.log('Server: Settings updated for session', session.id);
    });

    // Update room name (host only)
    socket.on('update-room-name', ({ name }) => {
      console.log('🏠 UPDATE-ROOM-NAME: Received request to update room name to:', name);
      console.log('🏠 UPDATE-ROOM-NAME: Socket ID:', socket.id);
      console.log('🏠 UPDATE-ROOM-NAME: Socket rooms:', Array.from(socket.rooms));
      
      let session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      console.log('🏠 UPDATE-ROOM-NAME: Found session?', session ? `YES (${session.code})` : 'NO');
      
      if (!session) {
        console.error('🚫 UPDATE-ROOM-NAME: Session not found via room membership');
        console.warn('🔄 UPDATE-ROOM-NAME: Attempting fallback - find session by user mapping');
        
        // Fallback: try to find session by user mapping
        const userId = socketToUser.get(socket.id);
        if (userId) {
          const fallbackSession = Array.from(serverSessionStorage.getAllSessions()).find(s => 
            s.roommates.some(r => r.id === userId)
          );
          
          if (fallbackSession) {
            console.log('✅ UPDATE-ROOM-NAME: Found session via user mapping fallback:', fallbackSession.code);
            // Re-join the socket to the session room
            socket.join(fallbackSession.id);
            console.log('🔄 UPDATE-ROOM-NAME: Re-joined socket to room', fallbackSession.id);
            // Continue with this session
            session = fallbackSession;
          }
        }
        
        if (!session) {
          console.error('🚫 UPDATE-ROOM-NAME: No session found via fallback either');
          socket.emit('error', { message: 'Session not found' });
          return;
        }
      }

      // Get the user ID from the socket mapping
      let userId = socketToUser.get(socket.id);
      console.log('🏠 UPDATE-ROOM-NAME: User ID from mapping:', userId);
      console.log('🏠 UPDATE-ROOM-NAME: Socket to user mapping:', Array.from(socketToUser.entries()));
      
      if (!userId) {
        console.warn('⚠️ UPDATE-ROOM-NAME: Socket not mapped to user, trying to recover...');
        
        // Try to find an online user in this session that matches this socket
        const onlineUsers = session.roommates.filter(r => r.isOnline);
        if (onlineUsers.length === 1) {
          // If there's only one online user, assume it's this socket
          userId = onlineUsers[0].id;
          socketToUser.set(socket.id, userId);
          console.log('✅ UPDATE-ROOM-NAME: Recovered mapping - socket', socket.id, 'to user', userId);
        } else {
          console.error('🚫 UPDATE-ROOM-NAME: Cannot determine user identity - multiple or no online users');
          socket.emit('error', { message: 'User not found' });
          return;
        }
      }
      
      const currentUser = session.roommates.find(r => r.id === userId);
      console.log('🏠 UPDATE-ROOM-NAME: Current user:', currentUser);
      console.log('🏠 UPDATE-ROOM-NAME: Session host ID:', session.hostId);
      console.log('🏠 UPDATE-ROOM-NAME: Is user the host?', currentUser?.id === session.hostId);
      
      if (!currentUser || currentUser.id !== session.hostId) {
        console.error('🚫 UPDATE-ROOM-NAME: User is not the host');
        socket.emit('error', { message: 'Only the host can update the room name' });
        return;
      }

      // Validate and sanitize the room name
      const sanitizedName = name?.trim();
      console.log('🏠 UPDATE-ROOM-NAME: Sanitized name:', sanitizedName);
      
      if (!sanitizedName || sanitizedName.length === 0) {
        console.error('🚫 UPDATE-ROOM-NAME: Room name is empty');
        socket.emit('error', { message: 'Room name cannot be empty' });
        return;
      }
      
      if (sanitizedName.length > 50) {
        console.error('🚫 UPDATE-ROOM-NAME: Room name too long:', sanitizedName.length);
        socket.emit('error', { message: 'Room name must be 50 characters or less' });
        return;
      }

      // Update room name
      console.log('✅ UPDATE-ROOM-NAME: Updating room name from', session.name, 'to', sanitizedName);
      session.name = sanitizedName;
      session.updatedAt = new Date();
      
      serverSessionStorage.updateSession(session);
      
      console.log('Server: Room name updated to:', sanitizedName, 'by host:', currentUser.nickname);
      
      // Broadcast updated session to all clients
      io.to(session.id).emit('session-updated', { session });
      
      // Send confirmation to the host
      socket.emit('room-name-updated', { name: sanitizedName });

    });

    // Handle leave session
    socket.on('leave-session', ({ sessionId }) => {
      console.log('Client leaving session:', sessionId);
      
      let userId = socketToUser.get(socket.id);
      if (!userId) {
        console.log('⚠️ User not found in session mapping, attempting recovery...');
        
        // Try to find user by session and socket rooms
        const session = serverSessionStorage.getSession(sessionId);
        if (session) {
          // Find online users in this session
          const onlineUsers = session.roommates.filter(r => r.isOnline);
          if (onlineUsers.length === 1) {
            userId = onlineUsers[0].id;
            socketToUser.set(socket.id, userId);
            console.log('✅ Recovered user mapping:', userId);
          } else {
            console.log('❌ Cannot recover user mapping - multiple or no online users');
            // Don't return here, continue with cleanup even if we can't identify the user
          }
        } else {
          console.log('❌ Session not found for recovery');
          // Clean up socket mapping and room membership even if session is gone
          socketToUser.delete(socket.id);
          socket.leave(sessionId);
          return;
        }
      }

      const session = serverSessionStorage.getSession(sessionId);
      if (!session) {
        console.log('Session not found:', sessionId);
        // Clean up socket mapping and room membership
        socketToUser.delete(socket.id);
        socket.leave(sessionId);
        return;
      }

      // Only try to remove user if we have a valid userId
      if (userId) {
        // Remove user from session
        const userIndex = session.roommates.findIndex(r => r.id === userId);
        if (userIndex !== -1) {
          const user = session.roommates[userIndex];
          session.roommates.splice(userIndex, 1);
          
          // Update session
          serverSessionStorage.updateSession(session);
          
          // Notify other clients in the session
          socket.to(sessionId).emit('roommate-left', { roommateId: userId });
          
          console.log(`User ${user.nickname} left session ${session.code}`);
          
          // If no roommates left, delete the session
          if (session.roommates.length === 0) {
            serverSessionStorage.deleteSession(sessionId);
            console.log(`Session ${session.code} deleted - no roommates left`);
          }
        } else {
          console.log('⚠️ User not found in session roommates, but continuing cleanup');
        }
      } else {
        console.log('⚠️ No userId available, skipping user removal but continuing cleanup');
      }

      // Remove socket mapping
      socketToUser.delete(socket.id);
      
      // Leave the socket room
      socket.leave(sessionId);
    });

    // Handle adding apartments to ranking system
    socket.on('add-apartments-to-ranking', ({ apartments }) => {
      console.log('🏠 ADD-APARTMENTS-TO-RANKING: Adding apartments to ranking system');
      console.log('🏠 ADD-APARTMENTS-TO-RANKING: Apartments to add:', apartments.map(apt => apt.name));
      
      let session = Array.from(serverSessionStorage.getAllSessions()).find(s => 
        socket.rooms.has(s.id)
      );
      
      if (!session) {
        console.error('🚫 ADD-APARTMENTS-TO-RANKING: Session not found');
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      if (!session.rankingSystem) {
        console.error('🚫 ADD-APARTMENTS-TO-RANKING: Ranking system not initialized');
        socket.emit('error', { message: 'Ranking system not initialized' });
        return;
      }

      // Add new apartments to the unranked list
      session.rankingSystem.unrankedApartments.push(...apartments);
      session.availableApartments.push(...apartments);
      
      console.log(`✅ ADD-APARTMENTS-TO-RANKING: Added ${apartments.length} apartments to ranking system`);
      console.log(`📊 Total unranked apartments: ${session.rankingSystem.unrankedApartments.length}`);
      
      // Update session
      serverSessionStorage.updateSession(session);
      
      // Broadcast updated session to all clients
      io.to(session.id).emit('session-updated', { session });
      
      // If ranking is not currently active, start it
      if (!session.rankingSystem.isRanking && session.rankingSystem.unrankedApartments.length > 0) {
        console.log('🔄 ADD-APARTMENTS-TO-RANKING: Starting ranking process with new apartments');
        initializeRankingSystem(session);
        io.to(session.id).emit('session-updated', { session });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
      console.log('🔌 Remaining connections:', io.engine.clientsCount - 1);
      
      // Get the user ID from the socket mapping
      const userId = socketToUser.get(socket.id);
      if (userId) {
        // Mark user as offline in all sessions they're in
        const sessions = serverSessionStorage.getAllSessions();
        sessions.forEach(session => {
          const userInSession = session.roommates.find(r => r.id === userId);
          if (userInSession && userInSession.isOnline) {
            userInSession.isOnline = false;
            serverSessionStorage.updateSession(session);
            
            // Notify other clients in the session
            socket.to(session.id).emit('roommate-left', { roommateId: userId });
          }
        });
        
        // Remove socket mapping
        socketToUser.delete(socket.id);
      } else {
        console.log('⚠️ No user mapping found for disconnected socket:', socket.id);
        // Still clean up the socket mapping to prevent memory leaks
        socketToUser.delete(socket.id);
      }
    });
  });
}

module.exports = {
  initializeSocketServer,
  serverSessionStorage
};
