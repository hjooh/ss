-- Create rooms table for storing session data
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 10,
  settings JSONB NOT NULL DEFAULT '{
    "requireUnanimousVoting": false,
    "allowVetoOverride": true,
    "minimumRatingToPass": 3,
    "allowMembersToControlNavigation": true,
    "autoAdvanceOnConsensus": false,
    "sessionTimeout": 60,
    "maxRent": null,
    "minBedrooms": null,
    "maxCommute": null,
    "showIndividualRatings": true,
    "allowGuestJoining": true,
    "notifyOnNewRatings": true,
    "notifyOnVetos": true
  }'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);

-- Create updated_at trigger
CREATE TRIGGER update_rooms_updated_at 
  BEFORE UPDATE ON rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view rooms (for joining)
CREATE POLICY "Anyone can view rooms" 
  ON rooms FOR SELECT 
  USING (true);

-- Policy: Only the host can update their room
CREATE POLICY "Host can update their room" 
  ON rooms FOR UPDATE 
  USING (true); -- We'll check host_id in the application logic

-- Policy: Only the host can delete their room
CREATE POLICY "Host can delete their room" 
  ON rooms FOR DELETE 
  USING (true); -- We'll check host_id in the application logic

-- Add comments for documentation
COMMENT ON TABLE rooms IS 'Rooms/sessions for apartment hunting tournaments';
COMMENT ON COLUMN rooms.code IS 'Unique room code for joining';
COMMENT ON COLUMN rooms.host_id IS 'User ID of the room host';
COMMENT ON COLUMN rooms.rounds IS 'Number of rounds for the tournament';
COMMENT ON COLUMN rooms.settings IS 'JSON object containing room settings';
COMMENT ON COLUMN rooms.status IS 'Current status of the room: waiting, active, or completed';

