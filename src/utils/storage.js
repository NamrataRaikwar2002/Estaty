/**
 * AsyncStorage wrapper for ESTATY app
 * Provides type-safe storage operations with error handling
 * Includes in-memory fallback for when native module isn't linked
 */
let AsyncStorage;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  if (__DEV__) {
    console.warn('AsyncStorage native module not available, using in-memory fallback');
  }
  AsyncStorage = null;
}

// In-memory fallback storage
const memoryStorage = new Map();

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@estaty:auth_token',
  USER_DATA: '@estaty:user_data',
  USER_ROLE: '@estaty:user_role',
  REMEMBER_ME: '@estaty:remember_me',
  ONBOARDING_COMPLETE: '@estaty:onboarding_complete',
  PREFERENCES: '@estaty:preferences',
  MOCK_USERS: '@estaty:mock_users',
};

/**
 * Generic storage functions with fallback to in-memory storage
 */
const isNativeAvailable = () => AsyncStorage !== null;

export const storage = {
  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {Promise<boolean>} Success status
   */
  setItem: async (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      if (isNativeAvailable()) {
        await AsyncStorage.setItem(key, jsonValue);
      } else {
        memoryStorage.set(key, jsonValue);
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error(`Storage setItem error for key "${key}":`, error);
      }
      // Fallback to memory
      try {
        memoryStorage.set(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  },

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {Promise<*>} Parsed value or default
   */
  getItem: async (key, defaultValue = null) => {
    try {
      let jsonValue;
      if (isNativeAvailable()) {
        jsonValue = await AsyncStorage.getItem(key);
      } else {
        jsonValue = memoryStorage.get(key) || null;
      }
      return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
    } catch (error) {
      if (__DEV__) {
        console.error(`Storage getItem error for key "${key}":`, error);
      }
      return defaultValue;
    }
  },

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  removeItem: async (key) => {
    try {
      if (isNativeAvailable()) {
        await AsyncStorage.removeItem(key);
      } else {
        memoryStorage.delete(key);
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error(`Storage removeItem error for key "${key}":`, error);
      }
      memoryStorage.delete(key);
      return true;
    }
  },

  /**
   * Clear all app storage
   * @returns {Promise<boolean>} Success status
   */
  clear: async () => {
    try {
      const keys = Object.values(STORAGE_KEYS);
      if (isNativeAvailable()) {
        await AsyncStorage.multiRemove(keys);
      } else {
        keys.forEach(key => memoryStorage.delete(key));
      }
      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('Storage clear error:', error);
      }
      return false;
    }
  },

  /**
   * Get multiple items at once
   * @param {string[]} keys - Array of storage keys
   * @returns {Promise<Object>} Key-value pairs
   */
  getMultiple: async (keys) => {
    try {
      let result;
      if (isNativeAvailable()) {
        result = await AsyncStorage.multiGet(keys);
      } else {
        result = keys.map(key => [key, memoryStorage.get(key) || null]);
      }
      return result.reduce((acc, [key, value]) => {
        acc[key] = value ? JSON.parse(value) : null;
        return acc;
      }, {});
    } catch (error) {
      if (__DEV__) {
        console.error('Storage getMultiple error:', error);
      }
      return {};
    }
  },
};

/**
 * Auth-specific storage functions
 */
export const authStorage = {
  /**
   * Save auth session
   * @param {Object} session - { token, user, role, rememberMe }
   * @returns {Promise<boolean>}
   */
  saveSession: async ({ token, user, role, rememberMe = false }) => {
    const promises = [
      storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
      storage.setItem(STORAGE_KEYS.USER_DATA, user),
      storage.setItem(STORAGE_KEYS.USER_ROLE, role),
      storage.setItem(STORAGE_KEYS.REMEMBER_ME, rememberMe),
    ];
    const results = await Promise.all(promises);
    return results.every((r) => r === true);
  },

  /**
   * Get auth session
   * @returns {Promise<Object|null>} Session object or null
   */
  getSession: async () => {
    const [token, user, role, rememberMe] = await Promise.all([
      storage.getItem(STORAGE_KEYS.AUTH_TOKEN),
      storage.getItem(STORAGE_KEYS.USER_DATA),
      storage.getItem(STORAGE_KEYS.USER_ROLE),
      storage.getItem(STORAGE_KEYS.REMEMBER_ME),
    ]);

    if (!token || !user || !role) {
      return null;
    }

    return { token, user, role, rememberMe };
  },

  /**
   * Clear auth session
   * @returns {Promise<boolean>}
   */
  clearSession: async () => {
    const promises = [
      storage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      storage.removeItem(STORAGE_KEYS.USER_DATA),
      storage.removeItem(STORAGE_KEYS.USER_ROLE),
      storage.removeItem(STORAGE_KEYS.REMEMBER_ME),
    ];
    const results = await Promise.all(promises);
    return results.every((r) => r === true);
  },

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  isLoggedIn: async () => {
    const token = await storage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    return !!token;
  },

  /**
   * Get user role
   * @returns {Promise<string|null>}
   */
  getUserRole: async () => {
    return storage.getItem(STORAGE_KEYS.USER_ROLE);
  },

  /**
   * Get user data
   * @returns {Promise<Object|null>}
   */
  getUserData: async () => {
    return storage.getItem(STORAGE_KEYS.USER_DATA);
  },

  /**
   * Initialize mock users in storage if not already present
   * @param {Array} defaultUsers - Default mock users array
   * @returns {Promise<Array>} All users (default + registered)
   */
  initMockUsers: async (defaultUsers) => {
    const existingUsers = await storage.getItem(STORAGE_KEYS.MOCK_USERS);
    if (!existingUsers) {
      await storage.setItem(STORAGE_KEYS.MOCK_USERS, defaultUsers);
      return defaultUsers;
    }
    return existingUsers;
  },

  /**
   * Get all users (mock + registered)
   * @returns {Promise<Array>} All users
   */
  getAllUsers: async () => {
    return storage.getItem(STORAGE_KEYS.MOCK_USERS, []);
  },

  /**
   * Save all users array
   * @param {Array} users - Users array to save
   * @returns {Promise<boolean>}
   */
  saveAllUsers: async (users) => {
    return storage.setItem(STORAGE_KEYS.MOCK_USERS, users);
  },

  /**
   * Find user by email
   * @param {string} email - Email to search
   * @returns {Promise<Object|null>} User object or null
   */
  findUserByEmail: async (email) => {
    const users = await authStorage.getAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  /**
   * Find user by credentials
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object|null>} User object or null
   */
  findUserByCredentials: async (email, password) => {
    const users = await authStorage.getAllUsers();
    return users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) || null;
  },

  /**
   * Register new user
   * @param {Object} userData - { email, password, name, role }
   * @returns {Promise<Object>} Result { success, user, error }
   */
  registerUser: async (userData) => {
    const users = await authStorage.getAllUsers();

    // Check for duplicate email
    const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      email: userData.email,
      password: userData.password,
      name: userData.name,
      role: userData.role,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const saved = await authStorage.saveAllUsers(users);

    if (saved) {
      return { success: true, user: newUser };
    }
    return { success: false, error: 'Failed to register user' };
  },
};

export default storage;