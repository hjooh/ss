/**
 * Avatar Generator using DiceBear Thumbs style
 * Documentation: https://www.dicebear.com/styles/thumbs/
 */

export interface AvatarOptions {
  seed?: string;
  size?: number;
  backgroundColor?: string[];
  flip?: boolean;
  rotate?: number;
  scale?: number;
}

/**
 * Generate a DiceBear Thumbs avatar URL
 * Uses the DiceBear API to generate consistent, unique avatars
 * 
 * @param seed - Unique identifier (username, email, etc.) to ensure consistent avatars
 * @param options - Avatar customization options
 * @returns SVG avatar URL
 */
export const generateAvatarUrl = (seed: string, options: AvatarOptions = {}): string => {
  const {
    size = 200,
    backgroundColor = [],
    flip = false,
    rotate = 0,
    scale = 100
  } = options;

  // Base URL for DiceBear Thumbs API
  const baseUrl = 'https://api.dicebear.com/9.x/thumbs/svg';
  
  // Build query parameters
  const params = new URLSearchParams();
  
  // Required seed parameter
  params.append('seed', seed);
  
  // Size parameter
  params.append('size', size.toString());
  
  // Background colors (if provided)
  if (backgroundColor.length > 0) {
    backgroundColor.forEach(color => {
      params.append('backgroundColor', color);
    });
  }
  
  // Transformation options
  if (flip) params.append('flip', 'true');
  if (rotate > 0) params.append('rotate', rotate.toString());
  if (scale !== 100) params.append('scale', scale.toString());
  
  return `${baseUrl}?${params.toString()}`;
};

/**
 * Generate avatar URL using username as seed
 */
export const generateUserAvatar = (username: string, size: number = 200): string => {
  return generateAvatarUrl(username, {
    size,
    backgroundColor: ['f3f4f6', 'e5e7eb', 'd1d5db'], // Gray shades
  });
};

/**
 * Generate avatar URL using nickname as seed with colorful backgrounds
 */
export const generateRoommateAvatar = (nickname: string, size: number = 80): string => {
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
  
  return generateAvatarUrl(nickname, {
    size,
    backgroundColor: backgroundColors[colorIndex],
    scale: 110, // Slightly larger scale for better visibility
  });
};

/**
 * Generate a random avatar for demo purposes
 */
export const generateRandomAvatar = (size: number = 200): string => {
  const randomSeed = Math.random().toString(36).substring(7);
  return generateAvatarUrl(randomSeed, {
    size,
    backgroundColor: ['f9fafb'],
    flip: Math.random() > 0.5,
    rotate: Math.floor(Math.random() * 360),
  });
};

/**
 * Extract seed from existing DiceBear URL
 */
export const extractSeedFromAvatarUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('seed');
  } catch {
    return null;
  }
};

/**
 * Check if URL is a DiceBear avatar
 */
export const isDiceBearAvatar = (url: string): boolean => {
  return url.includes('api.dicebear.com') || url.includes('dicebear');
};
