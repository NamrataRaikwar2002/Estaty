/**
 * ESTATY - Property Marketplace App
 * Main entry point with authentication and navigation
 */
import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
/**
 * Root App Component
 * Providers: SafeArea, Auth Context, Call Context
 * Navigation: AppNavigator (handles auth state switching)
 */
const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
          <SafeAreaView style={styles.container}>
            <AppNavigator />
          </SafeAreaView>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;