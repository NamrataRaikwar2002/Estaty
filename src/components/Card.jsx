/**
 * Reusable Card component
 * Container with elevation, padding, and optional press handling
 */
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { BorderRadius, Shadows } from '../constants/borders';

const Card = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
  onPress,
  disabled = false,
  testID,
  accessibilityRole,
  accessibilityLabel,
}) => {
  const variantStyles = styles.variants[variant] || styles.variants.elevated;
  const paddingStyles = styles.paddings[padding] || styles.paddings.md;

  const Content = onPress ? Pressable : View;
  const pressProps = onPress
    ? {
        onPress,
        disabled,
        android_ripple: { color: Colors.primary[100] },
        accessibilityRole: accessibilityRole || 'button',
        accessibilityLabel,
        accessibilityState: { disabled },
        testID,
      }
    : { testID };

  return (
    <Content
      style={[
        styles.base,
        variantStyles,
        paddingStyles,
        style,
        disabled && styles.disabled,
      ]}
      {...pressProps}
    >
      {children}
    </Content>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface.light,
    borderRadius: BorderRadius.card,
  },
  variants: {
    elevated: {
      ...Shadows.card,
    },
    outlined: {
      borderWidth: 1,
      borderColor: Colors.border.light,
    },
    filled: {
      backgroundColor: Colors.neutral[50],
    },
    flat: {
      backgroundColor: 'transparent',
    },
  },
  paddings: {
    none: { padding: 0 },
    xs: { padding: Spacing.xs },
    sm: { padding: Spacing.sm },
    md: { padding: Spacing.md },
    lg: { padding: Spacing.lg },
    xl: { padding: Spacing.xl },
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Card;