export interface Apartment {
  id: string;
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
  // VT-specific fields
  btAccess?: boolean;
  distanceToVTCampus?: number | null;
}

export interface Complex {
  id?: string;
  name: string;
  address: string;
  price_range: string;
  bedroom_range: string;
  // Optional fields that might exist
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  website?: string;
  description?: string;
  amenities?: string[];
  pet_policy?: string;
  parking_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Roommate {
  id: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  joinedAt: Date;
}

export interface Vote {
  roommateId: string;
  apartmentId: string;
  timestamp: Date;
}

export interface Matchup {
  id: string;
  leftApartment: Apartment;
  rightApartment: Apartment;
  votes: Vote[];
  winner?: string; // apartment ID
  status: 'active' | 'completed' | 'tie' | 'counting-down';
  createdAt: Date;
  completedAt?: Date;
  countdownSeconds?: number;
  countdownStartTime?: Date;
  isRankingComparison?: boolean; // Flag to indicate this is a ranking comparison
}

export interface MatchupLog {
  matchupId: string;
  leftApartmentId: string;
  rightApartmentId: string;
  winnerId?: string;
  votes: Vote[];
  createdAt: Date;
}

export interface LobbySettings {
  // Voting settings
  requireUnanimousVoting: boolean;
  minimumRatingToPass: number; // 1-5 stars
  
  // Session management
  autoAdvanceOnConsensus: boolean;
  numberOfRounds: number; // number of rounds to play
  
  // Filtering preferences
  maxRent: number | null;
  minBedrooms: number | null;
  maxCommute: number | null; // minutes
  
  // Privacy settings
  showIndividualRatings: boolean;
  allowGuestJoining: boolean;
  
  // Notification preferences
  notifyOnNewRatings: boolean;
  
  // Ranking settings
  numberOfApartments: number;
}

export interface RankingResult {
  rank: number;
  apartment: Apartment;
  totalVotes: number;
  winPercentage: number;
}

export interface ComparisonHistory {
  leftApartment: Apartment;
  rightApartment: Apartment;
  winner: Apartment;
  loser: Apartment;
  winnerVotes: number;
  loserVotes: number;
  totalVotes: number;
  timestamp: Date;
}

export interface RankingSystem {
  rankedApartments: Apartment[];
  unrankedApartments: Apartment[];
  currentComparison: Apartment | null;
  isRanking: boolean;
  rankingProgress: number;
  apartmentVoteCounts: Record<string, number>;
  comparisonHistory: ComparisonHistory[];
  finalRanking?: RankingResult[];
}

export interface HuntSession {
  id: string;
  code: string;
  name: string;
  hostId: string;
  roommates: Roommate[];
  currentMatchup: Matchup | null;
  availableApartments: Apartment[];
  championApartment: Apartment | null;
  rankingSystem: RankingSystem;
  settings: LobbySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionState {
  session: HuntSession | null;
  currentUser: Roommate | null;
  apartments: Apartment[];
  isConnected: boolean;
}

// WebSocket event types
export interface SocketEvents {
  // Client to server
  'join-session': { code: string; nickname: string };
  'leave-session': { sessionId: string };
  'vote-apartment': { apartmentId: string };
  'force-end-round': {};
  'host-tiebreak': { winnerId: string };
  'update-settings': { settings: Partial<LobbySettings> };
  
  // Server to client
  'session-joined': { session: HuntSession; currentUser: Roommate };
  'session-updated': { session: HuntSession };
  'roommate-joined': { roommate: Roommate };
  'roommate-left': { roommateId: string };
  'vote-added': { vote: Vote };
  'matchup-completed': { matchup: Matchup };
  'round-force-ended': { matchup: Matchup };
  'countdown-started': { matchup: Matchup; secondsRemaining: number };
  'countdown-update': { matchup: Matchup; secondsRemaining: number };
  'countdown-cancelled': { matchup: Matchup };
  'tournament-completed': { champion: Apartment };
  'settings-updated': { settings: LobbySettings };
  'error': { message: string };
}





// Aprartment scraping types
export interface SearchParameters {
  keyword: string;
  type: 'forRent' | 'forSale';
  sort?:
  | "priceLowToHigh"
  | "paymentHighToLow"
  | "paymentLowToHigh"
  | "newest"
  | "bedrooms"
  | "bathrooms"
  | "squareFeet"
  | "lotSize";
}

export interface PricingOptions {
  price?: {
    min?: number; 
    max?: number; 
  };
}


export type HomeType =
  | "house"
  | "townhome"
  | "multiFamily"
  | "condo"
  | "lot"
  | "apartment"
  | "manufactured";

export interface HomeTypesOption {
  /**
   * An array of home types to filter the listings.
   * Example: ["apartment", "condo"]
   */
  homeTypes?: HomeType[];
}

// --- Size Specifications ---
export interface SizeSpecificationsOption {
  beds?: {
    min?: number; 
    max?: number; 
  };
  baths?: {
    min?: number; 
    max?: number; 
  };
  yearBuilt?: {
    min?: number;
    max?: number;
  };
  lotSize?: {
    min?: number; 
    max?: number; 
  };
  squareFeet?: {
    min?: number; 
    max?: number; 
  };
}



