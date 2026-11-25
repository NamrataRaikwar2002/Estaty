/**
 * Agora RTC Token Server for ESTATY
 * Generates RTC tokens for authenticated call participants
 *
 * Security Notes:
 * - App Certificate never exposed to client
 * - Tokens generated per-user per-channel with matching UID
 * - Token lifetime: 1 hour (development)
 * - For production: use HTTPS, add authentication, rate limiting
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { RtcTokenBuilder, RtcRole } = require('agora-token');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agora-token-server' });
});

/**
 * POST /token
 * Generate an RTC token for a channel and UID
 *
 * Request body:
 * {
 *   "channelName": "string",
 *   "uid": number
 * }
 *
 * Response:
 * {
 *   "token": "string",
 *   "expiresIn": number,
 *   "expireTimestamp": number
 * }
 */
app.post('/token', (req, res) => {
  const { channelName, uid } = req.body;

  // Validate required fields
  if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
    console.warn('[TokenServer] Invalid channelName:', channelName);
    return res.status(400).json({ error: 'channelName is required and must be a non-empty string' });
  }

  if (uid === undefined || uid === null || !Number.isInteger(uid) || uid < 0 || uid > 4294967295) {
    console.warn('[TokenServer] Invalid uid:', uid);
    return res.status(400).json({ error: 'uid is required and must be an integer between 0 and 4294967295' });
  }

  // Get credentials from environment
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId) {
    console.error('[TokenServer] AGORA_APP_ID not configured');
    return res.status(500).json({ error: 'Server configuration error: App ID missing' });
  }

  if (!appCertificate) {
    console.error('[TokenServer] AGORA_APP_CERTIFICATE not configured');
    return res.status(500).json({ error: 'Server configuration error: App Certificate missing' });
  }

  // Token expiration: 1 hour (3600 seconds) for development
  // Max allowed by Agora is 24 hours (86400 seconds)
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expirationTimeInSeconds;

  try {
    // Generate token using RtcTokenBuilder with numeric UID
    // Both buyer and seller use PUBLISHER role for 1-to-1 calls
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName.trim(),
      uid,
      RtcRole.PUBLISHER,
      privilegeExpireTime
    );

    console.log('[TokenServer] Generated token for channel:', channelName, 'uid:', uid, 'expiresIn:', expirationTimeInSeconds, 's');

    res.json({
      token,
      expiresIn: expirationTimeInSeconds,
      expireTimestamp: privilegeExpireTime,
    });
  } catch (error) {
    console.error('[TokenServer] Token generation error:', error.message);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[TokenServer] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TokenServer] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[TokenServer] Token endpoint: POST http://<LAN_IP>:${PORT}/token`);
  console.log(`[TokenServer] Health check: GET http://<LAN_IP>:${PORT}/health`);
  console.log(`[TokenServer] AGORA_APP_ID:`, process.env.AGORA_APP_ID ? 'CONFIGURED' : 'MISSING');
  console.log(`[TokenServer] AGORA_APP_CERTIFICATE:`, process.env.AGORA_APP_CERTIFICATE ? 'CONFIGURED' : 'MISSING');
});

module.exports = app;