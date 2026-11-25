/**
 * Authentication Context
 * Global state management for user authentication
 * Uses local mock users and AsyncStorage for persistence
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authStorage } from '../utils/storage';
import { MOCK_USERS } from '../constants/mockUsers';
import agoraRTCService from '../services/agoraRTCService';
const agoraService = agoraRTCService;

// Auth context with default values
const AuthContext = createContext({
  user: null,
  role: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  signup: async () => false,
  logout: async () => {},
  updateProfile: async () => {},
  setError: () => {},
});

/**
 * Auth Provider component
 * Wraps app and provides auth state/actions
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize mock users and auth from storage on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setIsLoading(true);

        // Initialize mock users in storage
        await authStorage.initMockUsers(MOCK_USERS);

        // Restore session if exists
        const session = await authStorage.getSession();

        if (mounted && session) {
          setUser(session.user);
          setRole(session.role);
          setToken(session.token);
          setIsAuthenticated(true);

          // Initialize Agora for calling functionality
          try {
            await agoraService.initialize(session.user.id);
            if (__DEV__) {
              console.log('Agora initialized for restored session:', session.user.id);
            }
          } catch (err) {
            if (__DEV__) {
              console.error('Agora initialization failed:', err);
            }
            // Don't fail auth if Agora init fails
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.error('Auth initialization error:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Authenticate user against mock users
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {boolean} rememberMe - Persist session
   * @returns {Promise<boolean>} Success status
   */
  const login = useCallback(async (email, password, rememberMe = false) => {
    setError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Validation
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Find user by credentials in mock users
    const foundUser = await authStorage.findUserByCredentials(email, password);

    if (!foundUser) {
      setError('Invalid email or password');
      return false;
    }

    // Create user object without password
    const userData = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      createdAt: foundUser.createdAt,
    };

    const authToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Save to state
    setUser(userData);
    setRole(foundUser.role);
    setToken(authToken);
    setIsAuthenticated(true);

    // Persist to storage
    await authStorage.saveSession({
      token: authToken,
      user: userData,
      role: foundUser.role,
      rememberMe,
    });

    // Initialize Agora for calling functionality
    try {
      await agoraService.initialize(foundUser.id);
      if (__DEV__) {
        console.log('Agora initialized for user:', foundUser.id);
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Agora initialization failed:', err);
      }
      // Don't fail login if Agora init fails
    }

    return true;
  }, []);

  /**
   * Register new user
   * @param {Object} userData - { email, password, name, role }
   * @returns {Promise<boolean>} Success status
   */
  const signup = useCallback(async ({ email, password, name, role: userRole }) => {
    setError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Validation
    if (!email || !password || !name || !userRole) {
      setError('All fields are required');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return false;
    }

    const validRoles = ['buyer', 'seller', 'broker'];
    if (!validRoles.includes(userRole)) {
      setError('Invalid role selected');
      return false;
    }

    // Register user (handles duplicate email check)
    const result = await authStorage.registerUser({
      email,
      password,
      name: name.trim(),
      role: userRole,
    });

    if (!result.success) {
      setError(result.error);
      return false;
    }

    const newUser = result.user;
    const userData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    const authToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Save to state
    setUser(userData);
    setRole(newUser.role);
    setToken(authToken);
    setIsAuthenticated(true);

    // Persist to storage
    await authStorage.saveSession({
      token: authToken,
      user: userData,
      role: newUser.role,
      rememberMe: true,
    });

    return true;
  }, []);

  /**
   * Logout user and clear session
   */
  const logout = useCallback(async () => {
    // Destroy Agora service
    try {
      await agoraService.destroy();
      if (__DEV__) {
        console.log('Agora destroyed on logout');
      }
    } catch (err) {
      if (__DEV__) {
        console.error('Agora destroy failed:', err);
      }
    }

    setUser(null);
    setRole(null);
    setToken(null);
    setIsAuthenticated(false);
    setError(null);
    await authStorage.clearSession();
  }, []);

  /**
   * Update user profile
   * @param {Object} updates - Partial user data to update
   */
  const updateProfile = useCallback(async (updates) => {
    if (!user) return false;

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);

    // Update storage
    await authStorage.saveSession({
      token,
      user: updatedUser,
      role,
      rememberMe: true,
    });

    return true;
  }, [user, token, role]);

  const value = {
    user,
    role,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    signup,
    logout,
    updateProfile,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;