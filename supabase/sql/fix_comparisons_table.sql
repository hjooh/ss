-- Fix comparisons table to use TEXT for apartment IDs instead of UUID
-- This handles the case where the table might have been created with wrong column types

-- Drop the table if it exists (since we're in development)
DROP TABLE IF EXISTS comparisons;

-- Recreate the table with correct column types
CREATE TABLE comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  winning_apartment_id TEXT NOT NULL,
  losing_apartment_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comparisons_session_id ON comparisons(session_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_winning_apartment_id ON comparisons(winning_apartment_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_losing_apartment_id ON comparisons(losing_apartment_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE comparisons ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comparisons (for analytics)
CREATE POLICY "Anyone can view comparisons" 
  ON comparisons FOR SELECT 
  USING (true);

-- Policy: Anyone can insert comparisons (for session data)
CREATE POLICY "Anyone can insert comparisons" 
  ON comparisons FOR INSERT 
  WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE comparisons IS 'User decisions in apartment comparison tournaments';
COMMENT ON COLUMN comparisons.session_id IS 'Session/room code where the comparison occurred';
COMMENT ON COLUMN comparisons.winning_apartment_id IS 'ID of the apartment that won the comparison';
COMMENT ON COLUMN comparisons.losing_apartment_id IS 'ID of the apartment that lost the comparison';
COMMENT ON COLUMN comparisons.created_at IS 'When the comparison decision was made';
