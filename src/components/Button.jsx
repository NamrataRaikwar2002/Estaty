/**
 * Reusable Button component
 * Supports variants, sizes, loading state, and full width
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';
import { BorderRadius, Shadows } from '../constants/borders';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  testID,
  accessibilityLabel,
}) => {
  const baseStyles = styles.base;
  const variantStyles = styles.variants[variant] || styles.variants.primary;
  const sizeStyles = styles.sizes[size] || styles.sizes.md;
  const widthStyle = fullWidth ? styles.fullWidth : {};

  const content = loading ? (
    <ActivityIndicator
      size="small"
      color={variantStyles.textColor}
      style={styles.spinner}
    />
  ) : (
    <View style={styles.content}>
      {leftIcon && (
        <View style={styles.iconLeft}>
          <Text>{leftIcon}</Text>
        </View>
      )}
      <Text style={[variantStyles.text, sizeStyles.text, styles.text]}>{title}</Text>
      {rightIcon && (
        <View style={styles.iconRight}>
          <Text>{rightIcon}</Text>
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      style={[
        baseStyles,
        variantStyles.container,
        sizeStyles.container,
        widthStyle,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={disabled || loading ? 1 : 0.85}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.button,
    ...Shadows.button,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  spinner: {
    // Spinner centered automatically
  },
  text: {
    fontFamily: Typography.fontFamily.bold,
  },
  variants: {
    primary: {
      container: {
        backgroundColor: Colors.primary[500],
      },
      text: {
        color: Colors.text.inverse.light,
      },
      textColor: Colors.text.inverse.light,
    },
    secondary: {
      container: {
        backgroundColor: Colors.neutral[100],
        borderWidth: 1,
        borderColor: Colors.border.light,
      },
      text: {
        color: Colors.text.primary.light,
      },
      textColor: Colors.text.primary.light,
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary[500],
      },
      text: {
        color: Colors.primary[500],
      },
      textColor: Colors.primary[500],
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: Colors.primary[500],
      },
      textColor: Colors.primary[500],
    },
    danger: {
      container: {
        backgroundColor: Colors.error,
      },
      text: {
        color: Colors.text.inverse.light,
      },
      textColor: Colors.text.inverse.light,
    },
  },
  sizes: {
    sm: {
      container: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        minHeight: 36,
      },
      text: Typography.styles.buttonSmall,
    },
    md: {
      container: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        minHeight: 48,
      },
      text: Typography.styles.button,
    },
    lg: {
      container: {
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing.md,
        minHeight: 56,
      },
      text: {
        ...Typography.styles.button,
        fontSize: 18,
      },
    },
  },
});

export default Button;