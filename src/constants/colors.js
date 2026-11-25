/**
 * Color palette for ESTATY app
 * Supports both light and dark modes
 */

export const Colors = {
  // Primary brand colors
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Secondary colors
  secondary: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  // Neutral grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Background
  background: {
    light: '#ffffff',
    dark: '#171717',
  },

  // Surface (cards, inputs)
  surface: {
    light: '#ffffff',
    dark: '#262626',
  },

  // Text
  text: {
    primary: {
      light: '#171717',
      dark: '#fafafa',
    },
    secondary: {
      light: '#525252',
      dark: '#a3a3a3',
    },
    inverse: {
      light: '#ffffff',
      dark: '#171717',
    },
  },

  // Border
  border: {
    light: '#e5e5e5',
    dark: '#404040',
  },

  // Overlay
  overlay: {
    light: 'rgba(0, 0, 0, 0.5)',
    dark: 'rgba(0, 0, 0, 0.7)',
  },
};

/**
 * Get color value for current theme
 * @param {string} colorKey - Dot notation color key (e.g., 'primary.500')
 * @param {boolean} isDark - Whether dark mode is active
 * @returns {string} Resolved color value
 */
export const getColor = (colorKey, isDark = false) => {
  const keys = colorKey.split('.');
  let value = Colors;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return colorKey; // fallback
  }
  // Handle theme-aware objects
  if (typeof value === 'object' && value.light !== undefined) {
    return isDark ? value.dark : value.light;
  }
  return value;
};

export default Colors;