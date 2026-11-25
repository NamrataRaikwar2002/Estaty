/**
 * Divider component with optional label
 */
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';

const Divider = ({ label, style, orientation = 'horizontal' }) => {
  if (orientation === 'vertical') {
    return (
      <View style={[styles.vertical, style]} />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.md,
  },
  vertical: {
    width: 1,
    backgroundColor: Colors.border.light,
    height: '100%',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.light,
  },
  labelContainer: {
    paddingHorizontal: Spacing.sm,
  },
  label: {
    ...Typography.styles.caption,
    color: Colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default Divider;