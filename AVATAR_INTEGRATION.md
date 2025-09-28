# DiceBear Thumbs Avatar Integration

This document describes the integration of [DiceBear Thumbs](https://www.dicebear.com/styles/thumbs/) avatars throughout the PadMatch application.

## Overview

We've integrated DiceBear's Thumbs avatar style to provide consistent, deterministic profile pictures for all users. The Thumbs style features thumb-up/thumb-down hands with various expressions and backgrounds.

## Implementation

### Avatar Generator (`src/lib/avatar-generator.ts`)

```typescript
// Generate user avatar (profile pages)
const avatarUrl = generateUserAvatar(username, 200);

// Generate roommate avatar (session participants)
const avatarUrl = generateRoommateAvatar(nickname, 80);

// Generate random avatar (demos)
const avatarUrl = generateRandomAvatar(200);
```

### Key Features

1. **Deterministic Generation**: Same username/nickname always generates the same avatar
2. **Colorful Backgrounds**: Different users get different background color combinations
3. **Scalable**: SVG format works at any size
4. **Performance**: Direct API calls, no downloads required
5. **Consistent**: All avatars use the same Thumbs style

### Integration Points

#### 1. User Registration (`src/lib/auth.ts`)
- New users automatically get a DiceBear Thumbs avatar based on their username
- Avatar URL stored in user profile: `avatar_url: generateUserAvatar(username)`

#### 2. Session Participants (`src/lib/socket-server.js`)
- Roommates get colorful avatars based on their nickname
- Each nickname gets a consistent color scheme from predefined palette

#### 3. Profile Page (`src/app/profile/page.tsx`)
- Shows user's avatar with fallback to generated avatar
- Users can still upload custom avatars if desired

#### 4. Navigation Bar (`src/components/navbar.tsx`)
- Small avatar in top-right corner
- Fallback to generated avatar if no custom avatar set

#### 5. Session UI (`src/components/hunt-session.tsx`)
- Roommate avatars in header and participant lists
- Consistent across all session views

## Avatar Styles

### User Avatars (Profile/Navbar)
- Neutral gray backgrounds for professional appearance
- Size: 200px for profile, 32px for navbar
- Seed: Based on username for consistency

### Roommate Avatars (Sessions)
- Colorful backgrounds for visual distinction
- 8 different color combinations: Yellow, Blue, Green, Pink, Indigo, Rose, Purple, Emerald
- Size: 80px standard
- Seed: Based on nickname
- Scale: 110% for better visibility

### Color Palette
```javascript
const backgroundColors = [
  ['fef3c7', 'fde68a'], // Yellow gradient
  ['dbeafe', 'bfdbfe'], // Blue gradient
  ['d1fae5', 'a7f3d0'], // Green gradient
  ['fce7f3', 'fbcfe8'], // Pink gradient
  ['e0e7ff', 'c7d2fe'], // Indigo gradient
  ['fed7d7', 'fbb6ce'], // Rose gradient
  ['f3e8ff', 'ddd6fe'], // Purple gradient
  ['d1fae5', 'a7f3d0'], // Emerald gradient
];
```

## API Usage

All avatars use the DiceBear v9 API:
```
https://api.dicebear.com/9.x/thumbs/svg?seed=username&size=200&backgroundColor=f3f4f6
```

### Parameters Used
- `seed`: Username or nickname for deterministic generation
- `size`: Pixel dimensions (32, 80, 200)
- `backgroundColor`: Hex color arrays for backgrounds
- `scale`: 110% for roommate avatars for better visibility

## Benefits

1. **No Storage Required**: SVG generation via API, no file uploads needed
2. **Instant Availability**: Every user has an avatar immediately
3. **Visual Distinction**: Easy to identify different users in sessions
4. **Professional Appearance**: Consistent, clean design throughout app
5. **Accessibility**: Alt text and proper sizing for all contexts

## Fallback Strategy

1. **Custom Avatar**: If user uploads custom avatar, use that
2. **Generated Avatar**: If no custom avatar, generate DiceBear avatar
3. **Error Handling**: If DiceBear API fails, browser shows broken image (rare)

## Future Enhancements

1. **Avatar Selection**: Let users choose from multiple generated options
2. **Style Variations**: Option to switch between DiceBear styles
3. **Local Caching**: Cache generated avatars for performance
4. **Custom Seeds**: Allow users to regenerate with different seeds

## Example Usage

```typescript
import { generateUserAvatar, generateRoommateAvatar } from '@/lib/avatar-generator';

// In profile component
const profileAvatarUrl = generateUserAvatar(currentUser.username, 200);

// In session component
const sessionAvatarUrl = generateRoommateAvatar(roommate.nickname, 80);

// In JSX
<img 
  src={user.avatar_url || generateUserAvatar(user.username)} 
  alt={`${user.nickname}'s avatar`}
  className="w-8 h-8 rounded-full"
/>
```

## License

DiceBear Thumbs is licensed under CC0 1.0 (Public Domain), making it free for personal and commercial use.
