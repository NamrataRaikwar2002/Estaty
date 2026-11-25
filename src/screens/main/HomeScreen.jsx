/**
 * Home Screen
 * Role-based home screen for authenticated users
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

const HomeScreen = () => {
  const { user, role, logout } = useAuth();

  const roleConfig = {
    buyer: { title: 'Browse Properties', icon: '🏠', color: '#3b82f6' },
    seller: { title: 'My Listings', icon: '🏘️', color: '#22c55e' },
    broker: { title: 'Dashboard', icon: '🤝', color: '#f59e0b' },
  };

  const config = roleConfig[role] || roleConfig.buyer;

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: config.color }]}>{config.icon} {config.title}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name || 'User'}!
        </Text>
        <Text style={styles.roleText}>Role: {role}</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title="Logout"
          onPress={logout}
          variant="outline"
          size="md"
          testID="home-logout-button"
        />
      </View>
    </View>
  );
};

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
  welcomeText: {
    ...Typography.styles.h4,
    color: Colors.text.primary.light,
    marginBottom: Spacing.md,
  },
  roleText: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    marginBottom: Spacing.xs,
  },
  emailText: {
    ...Typography.styles.bodySmall,
    color: Colors.neutral[500],
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    padding: Spacing.screenPaddingHorizontal,
    paddingBottom: Spacing.xl,
  },
});

export default HomeScreen;