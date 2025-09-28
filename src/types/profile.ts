export interface UserPreferences {
  budget: {
    min: number;
    max: number;
  };
  location: {
    maxDistanceFromCampus: number; // in minutes
    preferredNeighborhoods: string[];
  };
  accessibility: {
    wheelchairAccessible: boolean;
    elevatorRequired: boolean;
    groundFloorOnly: boolean;
  };
  amenities: {
    parking: boolean;
    laundry: boolean;
    dishwasher: boolean;
    airConditioning: boolean;
    heating: boolean;
    balcony: boolean;
    gym: boolean;
    pool: boolean;
  };
  roommates: {
    maxRoommates: number;
    petsAllowed: boolean;
    smokingAllowed: boolean;
  };
  lease: {
    preferredLeaseLength: number; // in months
    utilitiesIncluded: boolean;
    furnished: boolean;
  };
}

export interface UserProfile {
  id: string;
  user_id: string; // References auth.users.id
  username: string;
  nickname: string;
  avatar: string;
  email?: string;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export const defaultPreferences: UserPreferences = {
  budget: {
    min: 500,
    max: 2000,
  },
  location: {
    maxDistanceFromCampus: 30,
    preferredNeighborhoods: [],
  },
  accessibility: {
    wheelchairAccessible: false,
    elevatorRequired: false,
    groundFloorOnly: false,
  },
  amenities: {
    parking: false,
    laundry: false,
    dishwasher: false,
    airConditioning: false,
    heating: true,
    balcony: false,
    gym: false,
    pool: false,
  },
  roommates: {
    maxRoommates: 3,
    petsAllowed: false,
    smokingAllowed: false,
  },
  lease: {
    preferredLeaseLength: 12,
    utilitiesIncluded: false,
    furnished: false,
  },
};
