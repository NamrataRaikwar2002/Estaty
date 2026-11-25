/**
 * Token Client Service - Requests Agora RTC tokens from the token server
 *
 * Place at: src/services/tokenClient.js
 *
 * This service handles fetching RTC tokens from our backend token server
 * before joining Agora channels. The token server keeps the App Certificate
 * secure and generates tokens per-user per-channel.
 */

import Config from 'react-native-config';
import { userIdToUid } from './agoraRTCService';

/**
 * Token server base URL
 * Uses LAN IP for physical device testing (not localhost)
 * Configure in .env: TOKEN_SERVER_URL=http://YOUR_LAN_IP:3001
 */
const TOKEN_SERVER_URL = Config.TOKEN_SERVER_URL || 'http://localhost:3001';

/**
 * Request an RTC token from the token server
 *
 * @param {string} channelName - Agora channel name
 * @param {number} uid - Numeric UID for the user (0 for auto-assign, but we use mapped UIDs)
 * @returns {Promise<{ token: string, expiresIn: number, expireTimestamp: number }>}
 */
export async function fetchRtcToken(channelName, uid) {
  if (!channelName || typeof channelName !== 'string') {
    throw new Error('Invalid channelName: must be a non-empty string');
  }

  if (uid === undefined || uid === null || !Number.isInteger(uid) || uid < 0 || uid > 4294967295) {
    throw new Error('Invalid uid: must be an integer between 0 and 4294967295');
  }

  const url = `${TOKEN_SERVER_URL}/token`;
  console.log('[TokenClient] Requesting token from:', url, { channelName, uid });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelName: channelName.trim(),
        uid,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[TokenClient] Token request failed:', response.status, data);
      throw new Error(data.error || `Token request failed with status ${response.status}`);
    }

    if (!data.token) {
      throw new Error('Token response missing token field');
    }

    console.log('[TokenClient] Token received successfully, expires in:', data.expiresIn, 'seconds');
    return {
      token: data.token,
      expiresIn: data.expiresIn,
      expireTimestamp: data.expireTimestamp,
    };
  } catch (error) {
    console.error('[TokenClient] Token request error:', error);
    throw error;
  }
}

/**
 * Fetch token for the current user's UID
 * Uses the same userIdToUid mapping as agoraRTCService
 *
 * @param {string} channelName - Agora channel name
 * @param {string} userId - Current user's string ID
 * @returns {Promise<{ token: string, expiresIn: number, expireTimestamp: number }>}
 */
export async function fetchRtcTokenForUser(channelName, userId) {
  const uid = userIdToUid(userId);
  return fetchRtcToken(channelName, uid);
}

/**
 * Health check for token server
 * @returns {Promise<boolean>} True if server is reachable
 */
export async function checkTokenServerHealth() {
  try {
    const response = await fetch(`${TOKEN_SERVER_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.warn('[TokenClient] Health check failed:', error.message);
    return false;
  }
}

/**
 * Get the configured token server URL
 * @returns {string}
 */
export function getTokenServerUrl() {
  return TOKEN_SERVER_URL;
}

export default {
  fetchRtcToken,
  fetchRtcTokenForUser,
  checkTokenServerHealth,
  getTokenServerUrl,
};