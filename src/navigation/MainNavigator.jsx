/**
 * Main App Navigator
 * Tab navigator for authenticated screens based on user role
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { BorderRadius } from '../constants/borders';

// Import screens from separate files
import HomeScreen from '../screens/main/HomeScreen';
import ListingsScreen from '../screens/main/ListingsScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

// Import call screens
import OutgoingCallScreen from '../screens/call/OutgoingCallScreen';
import ActiveCallScreen from '../screens/call/ActiveCallScreen';

// Stack navigator for each tab (allows nested navigation)
const Stack = createNativeStackNavigator();

const createStackScreen = (screenName, component, title) => () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name={screenName} component={component} options={{ title }} />
  </Stack.Navigator>
);

// Use unique screen names to avoid "nested screens with same name" warning
const HomeStack = createStackScreen('HomeScreen', HomeScreen, 'Home');

// ListingsStack with call screens for nested navigation
const ListingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
    }}
  >
    <Stack.Screen name="ListingsScreen" component={ListingsScreen} options={{ title: 'Listings' }} />
    <Stack.Screen name="OutgoingCall" component={OutgoingCallScreen} />
    <Stack.Screen name="ActiveCall" component={ActiveCallScreen} />
  </Stack.Navigator>
);

const MessagesStack = createStackScreen('MessagesScreen', MessagesScreen, 'Messages');
const ProfileStack = createStackScreen('ProfileScreen', ProfileScreen, 'Profile');

const Tab = createBottomTabNavigator();

/**
 * Main Navigator Component
 * Bottom tab navigation for authenticated users
 * Tabs vary slightly based on user role
 */
const MainNavigator = () => {
  // useAuth is imported for potential future role-based tab customization

  // Define tabs based on role
  const getTabs = () => {
    const baseTabs = [
      { name: 'Home', component: HomeStack, label: 'Home', icon: '🏠' },
      { name: 'Listings', component: ListingsStack, label: 'Listings', icon: '📋' },
      { name: 'Messages', component: MessagesStack, label: 'Messages', icon: '💬' },
      { name: 'Profile', component: ProfileStack, label: 'Profile', icon: '👤' },
    ];

    // Could customize tabs per role here
    return baseTabs;
  };

  const tabs = getTabs();

  return (
    <Tab.Navigator
      screenOptions={() => ({
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
        gestureEnabled: true,
      })}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            // tabBarIcon would use actual icons in production
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface.light,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    height: 80,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  tabLabel: {
    ...Typography.styles.caption,
    fontWeight: '500',
    marginTop: 2,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    paddingHorizontal: Spacing.screenPaddingHorizontal,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl + 20, // Account for status bar
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
  logoutButton: {
    ...Typography.styles.button,
    color: Colors.error,
    textAlign: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.error + '15',
    borderRadius: 12,
  },
  placeholderText: {
    ...Typography.styles.body,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  profileCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface.light,
    borderRadius: 16,
    marginBottom: Spacing.xl,
    width: '100%',
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
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

export default MainNavigator;