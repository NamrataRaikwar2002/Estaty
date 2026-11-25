/**
 * Firebase Configuration for ESTATY
 *
 * IMPORTANT: For production, use environment variables or a secure config file.
 * Do not expose service-account credentials or private keys in the mobile app.
 *
 * The web API key (apiKey) is safe to include in the app - it's meant for client-side use.
 * Database Security Rules will protect your data.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import Config from 'react-native-config';

// Firebase configuration - loaded from .env via react-native-config
const firebaseConfig = {
  apiKey: Config.FIREBASE_API_KEY,
  authDomain: Config.FIREBASE_AUTH_DOMAIN,
  projectId: Config.FIREBASE_PROJECT_ID,
  storageBucket: Config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID,
  appId: Config.FIREBASE_APP_ID,
  // Realtime Database URL - get from Firebase Console > Realtime Database
  databaseURL: Config.FIREBASE_DATABASE_URL,
};

// Initialize Firebase (singleton)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Realtime Database (for call signaling)
export const rtdb = getDatabase(app);

// Initialize Firestore (for other data if needed)
export const db = getFirestore(app);

export default app;