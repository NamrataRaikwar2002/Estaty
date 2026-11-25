/**
 * Typography scale for ESTATY app
 * Based on a 4px base unit system
 */

export const Typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    // For custom fonts, add here:
    // regular: 'Inter-Regular',
    // medium: 'Inter-Medium',
    // bold: 'Inter-Bold',
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },

  // Predefined text styles
  styles: {
    // Headings
    h1: {
      fontSize: 36,
      lineHeight: 44,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 30,
      lineHeight: 38,
      fontWeight: '700',
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '600',
    },
    h4: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
    },
    h5: {
      fontSize: 18,
      lineHeight: 26,
      fontWeight: '600',
    },
    h6: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },

    // Body text
    bodyLarge: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '400',
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
    },
    bodySmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400',
    },

    // UI elements
    button: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600',
    },
    buttonSmall: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '400',
    },
    overline: {
      fontSize: 10,
      lineHeight: 16,
      fontWeight: '500',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    label: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    input: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
    },
    link: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '500',
    },
  },
};

/**
 * Create a text style object with theme-aware colors
 * @param {string} styleKey - Key from Typography.styles
 * @param {string} color - Color value
 * @returns {Object} Complete text style
 */
export const createTextStyle = (styleKey, color) => {
  const baseStyle = Typography.styles[styleKey] || Typography.styles.body;
  return {
    ...baseStyle,
    color,
    fontFamily: Typography.fontFamily.regular,
  };
};

export default Typography;