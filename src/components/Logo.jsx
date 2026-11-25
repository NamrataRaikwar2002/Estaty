/**
 * ESTATY Logo component
 * Scalable logo with text, icon, or both
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';

const Logo = ({
  variant = 'full', // 'full' | 'icon' | 'text'
  size = 'lg', // 'sm' | 'md' | 'lg' | 'xl'
  style,
  color,
}) => {
  const sizeStyles = styles.sizes[size] || styles.sizes.lg;
  const iconSize = sizeStyles.iconSize;
  const fontSize = sizeStyles.fontSize;

  return (
    <View style={[styles.container, style]}>
      {variant !== 'text' && (
        <View style={[styles.iconWrapper, { width: iconSize, height: iconSize }]}>
          {/* Using a text-based logo icon - replace with Image for actual logo */}
          <Text style={[styles.iconText, { fontSize: iconSize * 0.6 }, { color: color || Colors.primary[500] }]}>
            E
          </Text>
        </View>
      )}
      {variant !== 'icon' && (
        <Text
          style={[
            styles.logoText,
            { fontSize, color: color || Colors.text.primary.light },
            sizeStyles.text,
          ]}
        >
          ESTATY
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  iconWrapper: {
    borderRadius: 16,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoText: {
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.text.primary.light,
  },
  sizes: {
    sm: {
      iconSize: 32,
      fontSize: 18,
      text: {},
    },
    md: {
      iconSize: 40,
      fontSize: 22,
      text: {},
    },
    lg: {
      iconSize: 48,
      fontSize: 28,
      text: {},
    },
    xl: {
      iconSize: 64,
      fontSize: 36,
      text: {},
    },
  },
});

export default Logo;