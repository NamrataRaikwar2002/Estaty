/**
 * Authentication Navigator
 * Stack navigator for auth screens (Login, Signup)
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

const Stack = createNativeStackNavigator();

/**
 * Auth Navigator Component
 * Handles navigation between login and signup
 */
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#ffffff' },
        transitionSpec: {
          open: {
            animation: 'spring',
            config: { stiffness: 1000, damping: 500, mass: 3 },
          },
          close: {
            animation: 'timing',
            config: { duration: 200 },
          },
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;