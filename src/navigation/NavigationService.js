/**
 * Navigation Service
 * Provides a way to navigate from outside React components (e.g., from services)
 * Uses a ref to the NavigationContainer
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigate to a screen
 * @param {string} name - Screen name
 * @param {Object} params - Route params
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

/**
 * Go back
 */
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/**
 * Reset navigation stack
 * @param {Array} routes - Array of route objects
 */
export function resetRoot(routes) {
  if (navigationRef.isReady()) {
    navigationRef.resetRoot(routes);
  }
}

export default {
  navigationRef,
  navigate,
  goBack,
  resetRoot,
};