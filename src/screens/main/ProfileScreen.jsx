/**
 * Profile Screen
 * User profile and account settings
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/borders';

const ProfileScreen = () => {
  const { user, role, logout } = useAuth();

  return (
    <View style={styles.screenContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{role?.charAt(0).toUpperCase() + role?.slice(1)}</Text>
          </View>
        </View>
        <Button
          title="Logout"
          onPress={logout}
          variant="outline"
          size="md"
          testID="profile-logout-button"
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
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface.light,
    borderRadius: 16,
    marginBottom: Spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileName: {
    ...Typography.styles.h4,
    color: Colors.text.primary.light,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    marginBottom: Spacing.md,
  },
  roleBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[100],
  },
  roleBadgeText: {
    ...Typography.styles.label,
    color: Colors.primary[700],
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default ProfileScreen;