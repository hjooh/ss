-- Create user_profiles table with preferences support
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT DEFAULT '',
  email TEXT,
  preferences JSONB NOT NULL DEFAULT '{
    "budget": {"min": 500, "max": 2000},
    "location": {"maxDistanceFromCampus": 30, "preferredNeighborhoods": []},
    "accessibility": {"wheelchairAccessible": false, "elevatorRequired": false, "groundFloorOnly": false},
    "amenities": {"parking": false, "laundry": false, "dishwasher": false, "airConditioning": false, "heating": true, "balcony": false, "gym": false, "pool": false},
    "roommates": {"maxRoommates": 3, "petsAllowed": false, "smokingAllowed": false},
    "lease": {"preferredLeaseLength": 12, "utilitiesIncluded": false, "furnished": false}
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences ON user_profiles USING GIN(preferences);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and modify their own profile
CREATE POLICY "Users can view their own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
  ON user_profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_profiles IS 'User profiles with preferences for apartment search';
COMMENT ON COLUMN user_profiles.user_id IS 'References auth.users.id';
COMMENT ON COLUMN user_profiles.preferences IS 'JSON object containing user preferences for apartment search';
COMMENT ON COLUMN user_profiles.preferences IS 'User preferences including budget, location, amenities, etc.';

-- Example of how to query preferences
-- SELECT preferences->'budget'->>'min' as min_budget FROM user_profiles WHERE user_id = 'user-uuid';
-- SELECT preferences->'amenities'->>'parking' as wants_parking FROM user_profiles WHERE user_id = 'user-uuid';
