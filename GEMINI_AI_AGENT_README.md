# Gemini AI Apartment Agent

This document describes the AI agent that automatically generates apartment lists for room swiping sessions using Google's Gemini 2.5 Flash model.

## Overview

The AI agent is triggered when a room host starts the swiping session. It:

1. **Gets all users** from the room using the `room` table in Supabase
2. **Matches users** with their profiles using nicknames from the `user_profiles` table
3. **Extracts preferences** from all users (excluding bedrooms and bathrooms)
4. **Filters apartments** to only include units with a minimum bedroom count equal to the room size
5. **Includes favorite apartments** from user profiles by default
6. **Uses Gemini AI** to intelligently select the best apartments based on combined user preferences
7. **Generates a list** of exactly `(num_rounds / 2) + 1` apartments
8. **Updates the room** with the apartment list in the `apt_list` column

## Files Created

### Core AI Agent
- `src/lib/gemini-apartment-agent.ts` - Main AI agent service
- `src/app/api/generate-apartment-list/route.ts` - API endpoint to trigger generation

### Database Schema
- `supabase/sql/setup_room_table.sql` - Creates the `room` table with `apt_list` column
- `supabase/sql/add_apt_list_to_room.sql` - Migration script to add `apt_list` column

### Integration
- Modified `src/lib/socket-server.js` to trigger AI agent when swiping starts

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @google/generative-ai
```

### 2. Environment Variables
Ensure you have the following in your `.env.local`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### 3. Database Setup
Run the SQL scripts in your Supabase database:
```sql
-- Create the room table
\i supabase/sql/setup_room_table.sql

-- Or if room table already exists, just add the apt_list column
\i supabase/sql/add_apt_list_to_room.sql
```

## How It Works

### 1. Trigger Point
The AI agent is automatically triggered when:
- A room host clicks "Start Session" 
- The socket server calls `start-session` event
- Room data is successfully saved to the database

### 2. Data Flow
```
Room Host Starts Session
    ↓
Socket Server Saves Room Data
    ↓
Triggers API Call to /api/generate-apartment-list
    ↓
AI Agent Gets Users from Room
    ↓
Matches Users with Profiles by Nickname
    ↓
Extracts All User Preferences
    ↓
Filters Apartments by Minimum Bedrooms
    ↓
Gets Favorite Apartments from Users
    ↓
Uses Gemini AI to Select Best Apartments
    ↓
Updates Room with apt_list Column
```

### 3. AI Selection Criteria
The Gemini AI considers:
- **Budget preferences** (min/max rent)
- **Location preferences** (distance from campus, neighborhoods)
- **Accessibility needs** (wheelchair accessible, elevator, ground floor)
- **Amenities** (parking, laundry, dishwasher, AC, heating, etc.)
- **Roommate preferences** (max roommates, pets, smoking)
- **Lease preferences** (length, utilities, furnished)

### 4. List Size Calculation
The apartment list size is calculated as:
```
target_count = Math.floor(num_rounds / 2) + 1
```

For example:
- 10 rounds → 6 apartments
- 8 rounds → 5 apartments
- 6 rounds → 4 apartments

## API Usage

### Generate Apartment List
```bash
POST /api/generate-apartment-list
Content-Type: application/json

{
  "roomCode": "ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "apartmentList": ["apt-uuid-1", "apt-uuid-2", "apt-uuid-3"],
  "message": "Successfully generated apartment list with 3 apartments"
}
```

## Database Schema

### Room Table
```sql
-- Your existing room table structure:
id, players, rounds, anon, apt list
```

### Complex Table  
```sql
-- Your existing complex table structure:
name, address, price range, bedroom range, bathroom range, dist from VT in miles, BT access, complex-id
```

### User Profiles Table
```sql
-- Your existing user_profiles table structure:
id, user_id, username, nickname, created_at, updated_at, Preferred Commute Time (Walk), Preferred Commute Time (Drive), Amenities, Culture, DEI, ideal_apartment, favorites
```

## Error Handling

The AI agent includes comprehensive error handling:

1. **Fallback Selection**: If AI fails, uses simple criteria-based selection
2. **Validation**: Checks for minimum apartment count, user profiles, etc.
3. **Logging**: Detailed console logging for debugging
4. **Graceful Degradation**: System continues to work even if AI fails

## Testing

Use the test script to verify the integration:
```bash
node test-gemini-agent.js
```

## Troubleshooting

### Common Issues

1. **"No users found in room"**
   - Check that the room code exists in the `room` table
   - Verify the `players` column has data

2. **"No user profiles found"**
   - Ensure user profiles exist in `user_profiles` table
   - Check that nicknames match between room and profiles

3. **"No apartments available"**
   - Verify apartments exist in the `apartments` table
   - Check that apartments have UUIDs in the `uuid` column

4. **"AI selection failed"**
   - Check your `GEMINI_API_KEY` is valid
   - Verify internet connectivity
   - Check API quotas/limits

### Debug Mode
Enable detailed logging by checking the console output when the AI agent runs. All major steps are logged with emojis for easy identification.

## Future Enhancements

Potential improvements:
- **Caching**: Cache AI responses for similar preference combinations
- **Learning**: Track which apartments users actually prefer to improve future selections
- **Batch Processing**: Generate lists for multiple rooms simultaneously
- **Custom Prompts**: Allow hosts to specify additional criteria
- **Analytics**: Track AI selection accuracy and user satisfaction
