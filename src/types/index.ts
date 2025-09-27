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
}

export interface Roommate {
  id: string;
  nickname: string;
  avatar: string;
  isOnline: boolean;
  joinedAt: Date;
}

export interface Rating {
  roommateId: string;
  apartmentId: string;
  stars: number;
  timestamp: Date;
}

export interface Veto {
  roommateId: string;
  apartmentId: string;
  timestamp: Date;
}

export interface HuntSession {
  id: string;
  code: string;
  roommates: Roommate[];
  currentApartmentIndex: number;
  ratings: Rating[];
  vetos: Veto[];
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
  'rate-apartment': { apartmentId: string; stars: number };
  'veto-apartment': { apartmentId: string };
  'next-apartment': { sessionId: string };
  'previous-apartment': { sessionId: string };
  
  // Server to client
  'session-joined': { session: HuntSession; currentUser: Roommate };
  'session-updated': { session: HuntSession };
  'roommate-joined': { roommate: Roommate };
  'roommate-left': { roommateId: string };
  'rating-added': { rating: Rating };
  'apartment-vetoed': { veto: Veto };
  'apartment-changed': { apartmentIndex: number };
  'error': { message: string };
}
