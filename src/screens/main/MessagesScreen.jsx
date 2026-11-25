/**
 * Messages Screen
 * Chat and messaging interface
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const MessagesScreen = () => (
  <View style={styles.screenContainer}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Messages</Text>
    </View>
    <View style={styles.content}>
      <Text style={styles.placeholderText}>Messages screen - Coming soon</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    paddingHorizontal: Spacing.screenPaddingHorizontal,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    ...Typography.styles.h3,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: Spacing.screenPaddingHorizontal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...Typography.styles.body,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});

export default MessagesScreen;