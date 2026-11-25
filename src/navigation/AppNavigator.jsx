/**
 * Root App Navigator
 * Switches between Auth and Main navigators based on authentication state
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import IncomingCallScreen from '../screens/call/IncomingCallScreen';
import ActiveCallScreen from '../screens/call/ActiveCallScreen';
import { Colors } from '../constants/colors';
import { navigationRef } from './NavigationService';

const Stack = createNativeStackNavigator();

/**
 * Loading Screen shown during auth initialization
 */
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary[500]} />
  </View>
);

/**
 * Root Navigator Component
 * Handles auth state and renders appropriate navigator
 */
const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading screen while initializing auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: Colors.background.light },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="IncomingCall"
              component={IncomingCallScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ActiveCall"
              component={ActiveCallScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.light,
  },
});

export default AppNavigator;