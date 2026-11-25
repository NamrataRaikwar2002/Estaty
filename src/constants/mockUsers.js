/**
 * Mock Users Data
 * Predefined dummy accounts for local authentication
 * Passwords are for prototype/demo purposes only
 */

export const MOCK_USERS = [
  {
    id: 'user_101',
    name: 'John Buyer',
    email: 'buyer@estaty.com',
    password: 'Buyer@123',
    role: 'buyer',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'user_202',
    name: 'Jane Seller',
    email: 'seller@estaty.com',
    password: 'Seller@123',
    role: 'seller',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'user_303',
    name: 'Bob Broker',
    email: 'broker@estaty.com',
    password: 'Broker@123',
    role: 'broker',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
];

export const STORAGE_KEYS = {
  USERS: '@estaty:mock_users',
  SESSION: '@estaty:auth_session',
};

export default MOCK_USERS;