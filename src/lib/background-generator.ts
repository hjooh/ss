/**
 * Background generator for room images
 * Generates random color backgrounds based on room code or session data
 */

export interface BackgroundConfig {
  primaryColor: string;
}

/**
 * Generate a random color in hex format
 */
const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#FADBD8', '#D5DBDB', '#AED6F1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};


/**
 * Simple seeded random number generator
 */
const seededRandom = (seed: number): () => number => {
  let currentSeed = seed;
  return () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
};

/**
 * Generate a background configuration based on room code
 */
export const generateRoomBackground = (roomCode: string): BackgroundConfig => {
  // Use room code as seed for consistent colors
  const seed = roomCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seed);
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#FADBD8', '#D5DBDB', '#AED6F1'
  ];
  
  const primaryColor = colors[Math.floor(random() * colors.length)];
  
  return {
    primaryColor
  };
};

/**
 * Generate a random background configuration
 */
export const generateRandomBackground = (): BackgroundConfig => {
  const primaryColor = generateRandomColor();
  
  return {
    primaryColor
  };
};

/**
 * Generate a simple solid color background
 */
export const generateSVGBackground = (config: BackgroundConfig, width: number = 800, height: number = 600): string => {
  const { primaryColor } = config;
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${primaryColor}"/>
    </svg>
  `;
};

/**
 * Generate a data URL for the SVG background
 */
export const generateBackgroundDataURL = (config: BackgroundConfig, width: number = 800, height: number = 600): string => {
  const svg = generateSVGBackground(config, width, height);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
};
