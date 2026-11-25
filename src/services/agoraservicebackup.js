/**
 * Agora RTC Service - Working Audio Implementation (Functional)
 *
 * Based on the tested working implementation from agoraService2.jsx
 * Integrated with Firebase Realtime Database signaling (callSignaling.js)
 * Uses react-native-agora v4.x with proper joinChannel options for audio
 *
 * CONFIGURATION:
 * - AGORA_APP_ID from .env via react-native-config
 * - Uses Firebase RTDB for call signaling (not Agora RTM)
 * - Empty token for testing (no-token mode)
 *
 * KEY DIFFERENCES FROM OLD agoraService:
 * - joinChannel uses ChannelProfileType.ChannelProfileCommunication
 * - joinChannel uses ClientRoleType.ClientRoleBroadcaster
 * - publishMicrophoneTrack: true (critical for audio to work)
 * - autoSubscribeAudio: true (critical for remote audio to work)
 * - Audio route set to speakerphone after join
 */

import { createAgoraRtcEngine, RtcSurfaceView, RtcTextureView, ChannelProfileType, ClientRoleType } from 'react-native-agora';
import { callSignaling, CALL_STATUS } from './callSignaling';
import { navigate } from '../navigation/NavigationService';
import { Platform, PermissionsAndroid } from 'react-native';

// ==================== CONFIGURATION ====================
// Using the exact working App ID from tested agoraService2.jsx
// Using TOKENLESS mode (empty token) for dynamic channels/UIDs
// CRITICAL: Requires "App Certificate" DISABLED in Agora Console for this App ID
// Go to Agora Console → Project → App Certificate → Disable
export const AGORA_APP_ID = Config.AGORA_APP_ID;
export const AGORA_TOKEN = Config.AGORA_TOKEN; // Empty for tokenless mode - REQUIRED for dynamic channels
export const CALL_CHANNEL_PREFIX = Config.AGORA_CHANNEL_PREFIX;

// TEST MODE: Use fixed channel for audio testing
// Set to true to use fixed channel (estaty_call_ch_) instead of dynamic Firebase channels
export const USE_FIXED_TEST_CHANNEL = true;
export const FIXED_TEST_CHANNEL = CALL_CHANNEL_PREFIX; // 'estaty_call_ch_'

console.log('[AgoraRTCService] AGORA_APP_ID:', AGORA_APP_ID ? 'SET' : 'UNDEFINED');
console.log('[AgoraRTCService] Running in TOKENLESS mode - ENSURE App Certificate is DISABLED in Agora Console!');
console.log('[AgoraRTCService] If you see "App ID + Token required", disable App Certificate at console.agora.io');
console.log('[AgoraRTCService] TEST MODE - USE_FIXED_TEST_CHANNEL:', USE_FIXED_TEST_CHANNEL);

// Call types
export const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
};

// Call states (internal app states)
export const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
};

// ==================== MODULE STATE ====================
let engine = null;
let currentUserId = null;
let currentUserUid = 0; // Numeric UID for Agora (derived from userId)
let currentChannel = null;
let callType = null;
let callState = CALL_STATES.IDLE;
let remoteUserId = null;
let remoteUid = null; // Numeric Agora UID from UserJoined callback
let listeners = new Map();
let isInitialized = false;
let localVideoEnabled = true;
let localAudioEnabled = true;
let incomingCallUnsubscribe = null;
let activeCallId = null;
let activeCallUnsubscribe = null;

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert string userId to numeric Agora UID
 * Uses a stable hash to ensure same userId always maps to same UID
 */
function userIdToUid(userId) {
  if (!userId) return 0;
  // Simple hash to generate consistent numeric UID from string
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  // Ensure positive and within valid range (1 to 2^32-1)
  return Math.abs(hash) || 1;
}

/**
 * Emit event to all registered listeners
 */
function emit(event, data) {
  if (!listeners.has(event)) return;
  listeners.get(event).forEach(cb => {
    try {
      cb(data);
    } catch (e) {
      console.error(`[AgoraRTCService] Listener error for ${event}:`, e);
    }
  });
}

/**
 * Setup RTC engine event listeners
 * NOTE: react-native-agora v4.x uses camelCase event names for addListener()
 */
function setupRtcListeners() {
  if (!engine) return;

  console.log('[AgoraRTCService][RTC] Setting up event listeners...');

  // User events - camelCase event names
  engine.addListener('userJoined', (uid) => {
    console.log('[AgoraRTCService][RTC] *** userJoined FIRED *** uid:', uid);
    remoteUid = uid; // Store numeric Agora UID for late-joining UI
    emit('userJoined', uid);
  });

  engine.addListener('userLeft', (uid, reason) => {
    console.log('[AgoraRTCService][RTC] userLeft:', uid, 'reason:', reason);
    emit('userLeft', { uid, reason });
  });

  engine.addListener('userInfoUpdated', (uid, userInfo) => {
    emit('userInfoUpdated', { uid, userInfo });
  });

  // Stats events
  engine.addListener('localVideoStats', (stats) => {
    emit('localVideoStats', stats);
  });

  engine.addListener('remoteVideoStats', (stats) => {
    emit('remoteVideoStats', stats);
  });

  engine.addListener('localAudioStats', (stats) => {
    console.log('[AgoraRTCService][RTC] LocalAudioStats:', JSON.stringify(stats));
    emit('localAudioStats', stats);
  });

  engine.addListener('remoteAudioStats', (stats) => {
    console.log('[AgoraRTCService][RTC] RemoteAudioStats:', JSON.stringify(stats));
    emit('remoteAudioStats', stats);
  });

  // Connection events
  engine.addListener('connectionStateChanged', (state, reason) => {
    const stateMap = {
      1: 'DISCONNECTED',
      2: 'CONNECTING',
      3: 'CONNECTED',
      4: 'RECONNECTING',
      5: 'FAILED',
    };
    console.log('[AgoraRTCService][RTC] connectionStateChanged:', stateMap[state] || state, 'reason:', reason);
    emit('connectionStateChanged', { state, reason });
  });

  engine.addListener('joinChannelSuccess', (channel, uid, elapsed) => {
    console.log('[AgoraRTCService][RTC] *** joinChannelSuccess FIRED ***', { channel, uid, elapsed });
    emit('joinChannelSuccess', { channel, uid, elapsed });
  });

  engine.addListener('leaveChannel', (stats) => {
    console.log('[AgoraRTCService][RTC] leaveChannel:', stats);
    emit('leaveChannel', stats);
  });

  engine.addListener('error', (err, msg) => {
    console.error('[AgoraRTCService][RTC] Error:', err, msg);
    emit('error', { code: err, message: msg });
  });

  // First frame events
  engine.addListener('firstRemoteVideoFrame', (uid, width, height, elapsed) => {
    console.log('[AgoraRTCService][RTC] *** firstRemoteVideoFrame FIRED ***', { uid, width, height, elapsed });
    emit('firstRemoteVideoFrame', { uid, width, height, elapsed });
  });

  engine.addListener('firstRemoteAudioFrame', (uid, elapsed) => {
    console.log('[AgoraRTCService][RTC] *** firstRemoteAudioFrame FIRED ***', { uid, elapsed });
    emit('firstRemoteAudioFrame', { uid, elapsed });
  });

  // Audio events
  engine.addListener('audioVolumeIndication', (speakers, totalVolume) => {
    console.log('[AgoraRTCService][RTC] audioVolumeIndication:', { speakersCount: speakers?.length, totalVolume });
    emit('audioVolumeIndication', { speakers, totalVolume });
  });

  engine.addListener('audioRouteChanged', (routing) => {
    const routeMap = {
      0: 'HEADSET',
      1: 'EARPIECE',
      2: 'LOUDSPEAKER',
      3: 'HEADSET_NO_MIC',
      4: 'HEADSET_WITH_MIC',
      5: 'BLUETOOTH',
    };
    console.log('[AgoraRTCService][RTC] audioRouteChanged:', routeMap[routing] || routing);
    emit('audioRouteChanged', { routing });
  });

  engine.addListener('remoteAudioStateChanged', (uid, state, reason, elapsed) => {
    const stateMap = {
      0: 'STOPPED',
      1: 'STARTING',
      2: 'DECODING',
      3: 'FROZEN',
      4: 'FAILED',
    };
    console.log('[AgoraRTCService][RTC] remoteAudioStateChanged:', { uid, state: stateMap[state] || state, reason, elapsed });
    emit('remoteAudioStateChanged', { uid, state, reason, elapsed });
  });

  engine.addListener('localAudioStateChanged', (state, reason) => {
    const stateMap = {
      0: 'STOPPED',
      1: 'RECORDING',
      2: 'ENCODING',
      3: 'FAILED',
    };
    console.log('[AgoraRTCService][RTC] localAudioStateChanged:', { state: stateMap[state] || state, reason });
    emit('localAudioStateChanged', { state, reason });
  });

  // Also register for remote video state changes - helps debug video issues
  engine.addListener('remoteVideoStateChanged', (uid, state, reason, elapsed) => {
    const stateMap = {
      0: 'STOPPED',
      1: 'STARTING',
      2: 'DECODING',
      3: 'FROZEN',
      4: 'FAILED',
    };
    console.log('[AgoraRTCService][RTC] *** remoteVideoStateChanged FIRED ***', { uid, state: stateMap[state] || state, reason, elapsed });
    emit('remoteVideoStateChanged', { uid, state, reason, elapsed });
  });

  engine.addListener('localVideoStateChanged', (state, reason) => {
    const stateMap = {
      0: 'STOPPED',
      1: 'CAPTURING',
      2: 'ENCODING',
      3: 'FAILED',
    };
    console.log('[AgoraRTCService][RTC] localVideoStateChanged:', { state: stateMap[state] || state, reason });
    emit('localVideoStateChanged', { state, reason });
  });

  // Catch-all for any other events we might have missed (debug)
  engine.addListener('*', (eventName, ...args) => {
    console.log('[AgoraRTCService][RTC] *** WILDCARD EVENT ***', eventName, args);
  });

  console.log('[AgoraRTCService][RTC] Event listeners registered');
}

/**
 * Request microphone permission on Android
 */
async function requestMicrophonePermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'ESTATY needs access to your microphone for voice and video calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    console.log('[AgoraRTCService][PERMISSION] Microphone permission:', granted === PermissionsAndroid.RESULTS.GRANTED ? 'GRANTED' : 'DENIED');
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[AgoraRTCService][PERMISSION] Microphone permission request error:', error);
    return false;
  }
}

/**
 * Request camera permission on Android
 */
async function requestCameraPermission() {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'ESTATY needs access to your camera for video calls.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    console.log('[AgoraRTCService][PERMISSION] Camera permission:', granted === PermissionsAndroid.RESULTS.GRANTED ? 'GRANTED' : 'DENIED');
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[AgoraRTCService][PERMISSION] Camera permission request error:', error);
    return false;
  }
}

/**
 * Handle incoming signaling messages from Firebase
 */
function handleSignalingMessage(signal) {
  console.log('[AgoraRTCService] handleSignalingMessage received:', signal);
  switch (signal.type) {
    case 'CALL_INVITE':
      const busyStates = [CALL_STATES.CALLING, CALL_STATES.CONNECTING, CALL_STATES.CONNECTED];
      if (!busyStates.includes(callState)) {
        console.log('[AgoraRTCService] Processing CALL_INVITE, navigating to IncomingCall', { currentState: callState });
        callState = CALL_STATES.INCOMING;
        activeCallId = signal.callId;
        remoteUserId = signal.callerId;
        callType = signal.callType;
        currentChannel = signal.channelName;

        subscribeToCallStatus(signal.callId);

        navigate('IncomingCall', {
          callId: signal.callId,
          callerId: signal.callerId,
          callerName: signal.callerName,
          callType: signal.callType,
          channelName: signal.channelName,
          propertyId: signal.propertyId,
        });
      } else {
        console.log('[AgoraRTCService] User busy, marking call as busy', { currentState: callState });
        callSignaling.markBusy(signal.callId, currentUserId);
      }
      break;

    case 'CALL_ACCEPTED':
      emit('callAccepted', {
        callId: signal.callId,
        from: signal.from,
        channelName: signal.channelName,
      });
      break;

    case 'CALL_REJECTED':
      emit('callRejected', {
        callId: signal.callId,
        from: signal.from,
        reason: signal.reason,
      });
      break;

    case 'USER_BUSY':
      emit('userBusy', {
        callId: signal.callId,
        from: signal.from,
      });
      break;

    case 'CALL_END':
      emit('callEndedByRemote', {
        callId: signal.callId,
        from: signal.from,
      });
      break;

    case 'CALL_CANCEL':
      if (signal.callId === activeCallId) {
        emit('callCancelled', {
          callId: signal.callId,
          from: signal.from,
        });
      } else {
        console.log('[AgoraRTCService] Ignoring CALL_CANCEL for different call:', { active: activeCallId, signal: signal.callId });
      }
      break;

    case 'CALL_MISSED':
      if (signal.callId === activeCallId) {
        emit('callMissed', {
          callId: signal.callId,
          from: signal.from,
        });
      } else {
        console.log('[AgoraRTCService] Ignoring CALL_MISSED for different call:', { active: activeCallId, signal: signal.callId });
      }
      break;

    case 'CALL_END':
      if (signal.callId === activeCallId) {
        emit('callEndedByRemote', {
          callId: signal.callId,
          from: signal.from,
        });
      } else {
        console.log('[AgoraRTCService] Ignoring CALL_END for different call:', { active: activeCallId, signal: signal.callId });
      }
      break;

    default:
      console.warn('[AgoraRTCService] Unknown signal type:', signal.type);
  }
}

/**
 * Subscribe to call status changes for an active call
 * @param {string} callId - Call ID
 */
function subscribeToCallStatus(callId) {
  if (activeCallUnsubscribe) {
    activeCallUnsubscribe();
  }

  activeCallUnsubscribe = callSignaling.onCallStatusChange(callId, (callData) => {
    if (!callData) return;

    switch (callData.status) {
      case CALL_STATUS.ACCEPTED:
        if (callData.callerId === currentUserId) {
          callState = CALL_STATES.CONNECTED;
          emit('callStateChanged', callState);
        }
        break;

      case CALL_STATUS.REJECTED:
        if (callData.callerId === currentUserId) {
          resetCallState();
          emit('callRejected', { reason: callData.rejectReason || 'Call rejected' });
        }
        break;

      case CALL_STATUS.BUSY:
        if (callData.callerId === currentUserId) {
          resetCallState();
          emit('userBusy');
        }
        break;

      case CALL_STATUS.ENDED:
        resetCallState();
        emit('callEndedByRemote', { from: callData.callerId === currentUserId ? callData.receiverId : callData.callerId });
        break;

      case CALL_STATUS.CANCELLED:
        if (callData.receiverId === currentUserId) {
          resetCallState();
          emit('callCancelled');
        }
        break;

      case CALL_STATUS.MISSED:
        if (callData.receiverId === currentUserId) {
          resetCallState();
          emit('callMissed');
        }
        break;
    }
  });
}

// ==================== PUBLIC API ====================

/**
 * Initialize Agora RTC Engine and Firebase Signaling
 * @param {string} userId - Current user's unique ID
 * @returns {Promise<boolean>} Success status
 */
export async function initialize(userId) {
  const initStart = Date.now();
  console.log('[AgoraRTCService][INIT] initialize called:', {
    userId,
    isInitialized,
    currentUserId,
    AGORA_APP_ID: AGORA_APP_ID ? 'SET' : 'UNDEFINED'
  });

  if (isInitialized && currentUserId === userId) {
    console.log('[AgoraRTCService][INIT] Already initialized for this user');
    return true;
  }

  if (!AGORA_APP_ID) {
    console.error('[AgoraRTCService][INIT] AGORA_APP_ID is not set! Check your .env file');
    return false;
  }

  try {
    currentUserId = String(userId);
    currentUserUid = userIdToUid(currentUserId);
    console.log('[AgoraRTCService][INIT] User ID:', currentUserId, '→ Agora UID:', currentUserUid);

    // Request microphone permission on Android
    if (Platform.OS === 'android') {
      await requestMicrophonePermission();
      await requestCameraPermission();
    }

    // Create RTC Engine using new 4.x API
    console.log('[AgoraRTCService][INIT] Creating RTC Engine...');
    const engineStart = Date.now();
    engine = createAgoraRtcEngine();
    const initResult = engine.initialize({ appId: AGORA_APP_ID });
    if (initResult && typeof initResult.then === 'function') {
      await initResult;
    }
    console.log('[AgoraRTCService][INIT] Engine initialized in', Date.now() - engineStart, 'ms');

    // Enable audio (required for audio calls)
    const enableAudioStart = Date.now();
    const enableAudioResult = engine.enableAudio();
    if (enableAudioResult && typeof enableAudioResult.then === 'function') {
      await enableAudioResult;
    }
    console.log('[AgoraRTCService][INIT] Audio enabled in', Date.now() - enableAudioStart, 'ms');

    // Verify audio is enabled
    try {
      const audioEnabled = await engine.isAudioEnabled?.();
      console.log('[AgoraRTCService][INIT] Audio enabled verification:', audioEnabled);
    } catch (e) {
      console.log('[AgoraRTCService][INIT] Could not verify audio enabled:', e);
    }

    // Set audio profile for better quality
    try {
      const audioProfileResult = engine.setAudioProfile({
        profile: 'music_high_quality',
        scenario: 'chat_room_entertainment',
      });
      if (audioProfileResult && typeof audioProfileResult.then === 'function') {
        await audioProfileResult;
      }
      console.log('[AgoraRTCService][INIT] Audio profile set: music_high_quality');
    } catch (audioProfileError) {
      console.warn('[AgoraRTCService][INIT] setAudioProfile failed (may not be supported):', audioProfileError);
    }

    // Configure video encoder
    const videoConfigResult = engine.setVideoEncoderConfiguration({
      dimensions: { width: 720, height: 1280 },
      frameRate: 15,
      bitrate: 1200,
      orientationMode: 'adaptative',
    });
    if (videoConfigResult && typeof videoConfigResult.then === 'function') {
      await videoConfigResult;
    }

    // Start local camera preview FIRST (SDK requirement: startPreview before enableVideo when not joined)
    try {
      const startPreviewResult = engine.startPreview();
      if (startPreviewResult && typeof startPreviewResult.then === 'function') {
        await startPreviewResult;
      }
      console.log('[AgoraRTCService][INIT] Camera preview started successfully');
    } catch (e) {
      console.error('[AgoraRTCService][INIT] startPreview failed:', e);
    }

    // Enable video AFTER startPreview
    const enableVideoResult = engine.enableVideo();
    if (enableVideoResult && typeof enableVideoResult.then === 'function') {
      await enableVideoResult;
    }

    // Set default audio route to speaker
    const audioRouteResult = engine.setDefaultAudioRouteToSpeakerphone(true);
    if (audioRouteResult && typeof audioRouteResult.then === 'function') {
      await audioRouteResult;
    }
    console.log('[AgoraRTCService][INIT] Audio route set to speakerphone');

    // Verify speakerphone setting
    try {
      const isSpeaker = await engine.isSpeakerphoneEnabled?.();
      console.log('[AgoraRTCService][INIT] Speakerphone enabled verification:', isSpeaker);
    } catch (e) {
      console.log('[AgoraRTCService][INIT] Could not verify speakerphone:', e);
    }

    // Setup RTC event listeners
    setupRtcListeners();

    // Initialize Firebase Call Signaling
    console.log('[AgoraRTCService][INIT] Initializing Firebase signaling...');
    const signalingStart = Date.now();
    const signalingInitialized = await callSignaling.initialize(currentUserId);
    console.log('[AgoraRTCService][INIT] Signaling initialized in', Date.now() - signalingStart, 'ms');
    if (!signalingInitialized) {
      console.warn('[AgoraRTCService][INIT] Firebase signaling initialization failed');
      return false;
    }

    // Setup signaling listener for incoming calls
    incomingCallUnsubscribe = callSignaling.listenForIncomingCalls(handleSignalingMessage);

    isInitialized = true;
    console.log('[AgoraRTCService][INIT] Service initialized for user:', currentUserId, 'total time:', Date.now() - initStart, 'ms');
    return true;
  } catch (error) {
    console.error('[AgoraRTCService][INIT] Initialization error:', error);
    return false;
  }
}

/**
 * Start an outgoing call
 * @param {string} targetUserId - User ID to call
 * @param {string} callType_ - 'audio' or 'video'
 * @param {string} callerName - Caller's display name
 * @param {string} receiverName - Receiver's display name (optional)
 * @param {string} propertyId - Property ID (optional)
 * @returns {Promise<{ success: boolean, channelName?: string, callId?: string, error?: string }>}
 */
export async function startCall(targetUserId, callType_, callerName, receiverName = '', propertyId = null) {
  const startCallStart = Date.now();
  console.log('[AgoraRTCService][START_CALL] startCall called:', { targetUserId, callType: callType_, callerName, receiverName, propertyId, currentUserId, callState });

  if (callState !== CALL_STATES.IDLE) {
    console.log('[AgoraRTCService][START_CALL] Already in a call, rejecting:', callState);
    return { success: false, error: 'Already in a call' };
  }

  if (!engine) {
    console.error('[AgoraRTCService][START_CALL] Engine not initialized!');
    return { success: false, error: 'Agora engine not initialized' };
  }

  remoteUserId = String(targetUserId);
  callType = callType_;
  callState = CALL_STATES.CALLING;

  try {
    // Create call invitation in Realtime Database
    console.log('[AgoraRTCService][START_CALL] Calling sendCallInvitation...');
    const inviteStart = Date.now();
    const callInfo = await callSignaling.sendCallInvitation({
      callerId: currentUserId,
      callerName,
      receiverId: remoteUserId,
      receiverName,
      callType,
      propertyId,
    });
    console.log('[AgoraRTCService][START_CALL] sendCallInvitation succeeded in', Date.now() - inviteStart, 'ms:', callInfo);

    activeCallId = callInfo.callId;
    currentChannel = callInfo.channelName;

    // Join RTC channel with working options (from tested implementation)
    console.log('[AgoraRTCService][START_CALL] Joining RTC channel:', callInfo.channelName);
    const joinStart = Date.now();
    await joinChannel(callInfo.channelName);
    console.log('[AgoraRTCService][START_CALL] Joined RTC channel successfully in', Date.now() - joinStart, 'ms');

    // Subscribe to call status changes
    subscribeToCallStatus(callInfo.callId);

    emit('callStateChanged', callState);
    console.log('[AgoraRTCService][START_CALL] Total time:', Date.now() - startCallStart, 'ms');
    return { success: true, channelName: callInfo.channelName, callId: callInfo.callId };
  } catch (error) {
    console.error('[AgoraRTCService][START_CALL] Start call error:', error);
    callState = CALL_STATES.IDLE;
    await leaveChannel();
    emit('callFailed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Accept an incoming call
 * @param {string} callId - Call ID
 * @param {string} channelName - Channel to join
 * @param {string} callerId - Caller's user ID
 * @param {string} callType_ - Call type: 'audio' or 'video'
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function acceptCall(callId, channelName, callerId, callType_) {
  const acceptStart = Date.now();
  console.log('[AgoraRTCService][ACCEPT] acceptCall called:', { callId, channelName, callerId, callType: callType_, callState });

  if (callState !== CALL_STATES.INCOMING) {
    console.log('[AgoraRTCService][ACCEPT] Not in INCOMING state:', callState);
    return { success: false, error: 'No incoming call to accept' };
  }

  currentChannel = channelName;
  remoteUserId = callerId;
  callType = callType_; // Explicitly set callType from parameter
  callState = CALL_STATES.CONNECTING;

  try {
    // Accept call in Firestore (updates status to ACCEPTED)
    console.log('[AgoraRTCService][ACCEPT] Calling callSignaling.acceptCall...');
    const signalingStart = Date.now();
    await callSignaling.acceptCall(callId, currentUserId);
    console.log('[AgoraRTCService][ACCEPT] Signaling accept in', Date.now() - signalingStart, 'ms');

    // Join RTC channel with working options (from tested implementation)
    console.log('[AgoraRTCService][ACCEPT] Joining RTC channel...');
    const joinStart = Date.now();
    await joinChannel(channelName);
    console.log('[AgoraRTCService][ACCEPT] Joined channel in', Date.now() - joinStart, 'ms');

    callState = CALL_STATES.CONNECTED;
    emit('callStateChanged', callState);
    console.log('[AgoraRTCService][ACCEPT] Total time:', Date.now() - acceptStart, 'ms');
    return { success: true };
  } catch (error) {
    console.error('[AgoraRTCService][ACCEPT] Accept call error:', error);
    callState = CALL_STATES.FAILED;
    await leaveChannel();
    emit('callFailed', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Reject an incoming call
 * @param {string} callId - Call ID
 * @param {string} reason - Rejection reason
 */
export async function rejectCall(callId, reason = 'Call rejected') {
  if (callState !== CALL_STATES.INCOMING) return;

  try {
    await callSignaling.rejectCall(callId, currentUserId, reason);
  } catch (error) {
    console.error('Reject call error:', error);
  }

  resetCallState();
}

/**
 * End current call
 * @returns {Promise<void>}
 */
export async function endCall() {
  console.log('[AgoraRTCService][END_CALL] endCall called:', { callState, activeCallId, currentUserId });

  if (callState === CALL_STATES.IDLE) {
    console.log('[AgoraRTCService][END_CALL] Already IDLE, skipping');
    return;
  }

  const callId = activeCallId;

  try {
    if (callId) {
      console.log('[AgoraRTCService][END_CALL] Calling callSignaling.endCall for:', callId);
      await callSignaling.endCall(callId, currentUserId);
      console.log('[AgoraRTCService][END_CALL] callSignaling.endCall completed');
    }
  } catch (error) {
    console.error('[AgoraRTCService][END_CALL] Error ending call in signaling:', error);
  }

  console.log('[AgoraRTCService][END_CALL] Leaving channel...');
  await leaveChannel();
  console.log('[AgoraRTCService][END_CALL] Resetting call state...');
  resetCallState();
  console.log('[AgoraRTCService][END_CALL] End call completed');
}

/**
 * Cancel outgoing call (caller cancels before receiver answers)
 * @returns {Promise<void>}
 */
export async function cancelCall() {
  if (callState !== CALL_STATES.CALLING) return;

  const callId = activeCallId;

  try {
    if (callId) {
      callSignaling.cancelCall(callId, currentUserId);
    }
  } catch (error) {
    console.error('Cancel call error:', error);
  }

  await leaveChannel();
  resetCallState();
}

/**
 * Join RTC channel - WORKING IMPLEMENTATION from tested agoraService2.jsx
 * Critical: Uses ChannelProfileCommunication + Broadcaster + publishMicrophoneTrack + autoSubscribeAudio
 */
export async function joinChannel(channelName) {
  const joinStart = Date.now();

  // TEST MODE: Use fixed channel for audio testing
  const effectiveChannelName = USE_FIXED_TEST_CHANNEL ? FIXED_TEST_CHANNEL : channelName;

  console.log('[AgoraRTCService][JOIN_CHANNEL] joinChannel called:', {
    requestedChannel: channelName,
    effectiveChannel: effectiveChannelName,
    currentUserId,
    hasEngine: !!engine,
    callType,
    localAudioEnabled,
    testMode: USE_FIXED_TEST_CHANNEL
  });

  if (!engine) throw new Error('Engine not initialized');

  // Ensure audio is enabled before joining
  if (localAudioEnabled) {
    try {
      const muteResult = engine.muteLocalAudioStream(false);
      if (muteResult && typeof muteResult.then === 'function') {
        await muteResult;
      }
      console.log('[AgoraRTCService][JOIN_CHANNEL] Local audio unmuted (pre-join)');
    } catch (muteError) {
      console.warn('[AgoraRTCService][JOIN_CHANNEL] Failed to unmute local audio (pre-join):', muteError);
    }
  }

  // Use tokenless mode (empty string) for dynamic channels/UIDs
  // CRITICAL: Requires App Certificate DISABLED in Agora Console
  const token = AGORA_TOKEN; // Empty string for tokenless mode

  // WORKING IMPLEMENTATION: Use the same options as tested agoraService2.jsx
  // - ChannelProfileCommunication (not LiveBroadcasting)
  // - ClientRoleBroadcaster (publishes audio/video)
  // - publishMicrophoneTrack: true (CRITICAL for audio to work)
  // - autoSubscribeAudio: true (CRITICAL for remote audio to work)
  const joinOptions = {
    channelProfile: ChannelProfileType.ChannelProfileCommunication,
    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    publishMicrophoneTrack: true,
    autoSubscribeAudio: true,
  };

  // For video calls, also publish camera track
  if (callType === CALL_TYPES.VIDEO) {
    joinOptions.publishCameraTrack = true;
    joinOptions.autoSubscribeVideo = true;
  }

  console.log('[AgoraRTCService][JOIN_CHANNEL] Joining with UID:', currentUserUid, 'channel:', effectiveChannelName, 'options:', joinOptions);

  // Use numeric UID (not string userId) - required by Agora
  const joinResult = engine.joinChannel(token, effectiveChannelName, currentUserUid, joinOptions);
  if (joinResult && typeof joinResult.then === 'function') {
    await joinResult;
  }
  console.log('[AgoraRTCService][JOIN_CHANNEL] joinChannel completed successfully in', Date.now() - joinStart, 'ms');

  // Post-join audio configuration - critical for audio to work
  try {
    // Ensure audio is enabled on the engine
    const enableAudioResult = engine.enableAudio();
    if (enableAudioResult && typeof enableAudioResult.then === 'function') {
      await enableAudioResult;
    }
    console.log('[AgoraRTCService][JOIN_CHANNEL] Audio enabled (post-join)');

    // Set speakerphone on (not earpiece)
    const speakerResult = engine.setEnableSpeakerphone(true);
    if (speakerResult && typeof speakerResult.then === 'function') {
      await speakerResult;
    }
    console.log('[AgoraRTCService][JOIN_CHANNEL] Speakerphone enabled');

    // Verify local audio is not muted
    const muteResult2 = engine.muteLocalAudioStream(false);
    if (muteResult2 && typeof muteResult2.then === 'function') {
      await muteResult2;
    }
    console.log('[AgoraRTCService][JOIN_CHANNEL] Local audio unmuted (post-join)');

    // Verify audio state after joining
    const isMuted = await engine.isLocalAudioMuted?.();
    console.log('[AgoraRTCService][JOIN_CHANNEL] Local audio muted state after join:', isMuted);
  } catch (e) {
    console.error('[AgoraRTCService][JOIN_CHANNEL] Post-join audio config error:', e);
  }
}

/**
 * Leave RTC channel
 */
export async function leaveChannel() {
  console.log('[AgoraRTCService][LEAVE_CHANNEL] leaveChannel called:', { currentChannel, hasEngine: !!engine });

  if (!engine || !currentChannel) {
    console.log('[AgoraRTCService][LEAVE_CHANNEL] No channel to leave');
    return;
  }

  try {
    const leaveResult = engine.leaveChannel();
    if (leaveResult && typeof leaveResult.then === 'function') {
      await leaveResult;
    }
    console.log('[AgoraRTCService][LEAVE_CHANNEL] Channel left successfully');
  } catch (error) {
    console.error('[AgoraRTCService][LEAVE_CHANNEL] Leave channel error:', error);
  }
  currentChannel = null;
}

/**
 * Toggle local video
 */
export async function toggleVideo() {
  if (!engine) return;

  localVideoEnabled = !localVideoEnabled;
  const result = engine.muteLocalVideoStream(!localVideoEnabled);
  if (result && typeof result.then === 'function') {
    await result;
  }
  emit('localVideoToggled', localVideoEnabled);
}

/**
 * Toggle local audio
 */
export async function toggleAudio() {
  if (!engine) return;

  localAudioEnabled = !localAudioEnabled;
  const result = engine.muteLocalAudioStream(!localAudioEnabled);
  if (result && typeof result.then === 'function') {
    await result;
  }
  emit('localAudioToggled', localAudioEnabled);
}

/**
 * Switch camera (front/back)
 */
export async function switchCamera() {
  if (!engine) return;
  const result = engine.switchCamera();
  if (result && typeof result.then === 'function') {
    await result;
  }
}

/**
 * Enable/disable speakerphone
 */
export async function setSpeakerphone(enabled) {
  if (!engine) return;
  const result = engine.setEnableSpeakerphone(enabled);
  if (result && typeof result.then === 'function') {
    await result;
  }
}

/**
 * Reset call state
 */
export function resetCallState() {
  // Clean up call subscription
  if (activeCallUnsubscribe) {
    activeCallUnsubscribe();
    activeCallUnsubscribe = null;
  }

  // Emit ENDED state first so UI can react (navigate back)
  callState = CALL_STATES.ENDED;
  emit('callStateChanged', callState);

  // Then reset to IDLE
  callState = CALL_STATES.IDLE;
  currentChannel = null;
  remoteUserId = null;
  remoteUid = null;
  callType = null;
  activeCallId = null;
  localVideoEnabled = true;
  localAudioEnabled = true;
  emit('callStateChanged', callState);
}

/**
 * Get current call state
 */
export function getCallState() {
  return callState;
}

/**
 * Get current call info
 */
export function getCallInfo() {
  return {
    state: callState,
    type: callType,
    channel: currentChannel,
    remoteUserId,
    localVideoEnabled,
    localAudioEnabled,
  };
}

/**
 * Event emitter methods
 */
export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event).push(callback);
}

export function off(event, callback) {
  if (!listeners.has(event)) return;
  const callbacks = listeners.get(event);
  const index = callbacks.indexOf(callback);
  if (index > -1) callbacks.splice(index, 1);
}

/**
 * Cleanup resources
 */
export async function destroy() {
  // Clean up incoming call listener
  if (incomingCallUnsubscribe) {
    incomingCallUnsubscribe();
    incomingCallUnsubscribe = null;
  }

  // Clean up active call listener
  if (activeCallUnsubscribe) {
    activeCallUnsubscribe();
    activeCallUnsubscribe = null;
  }

  // Destroy Firebase signaling
  await callSignaling.destroy();

  if (engine) {
    try {
      await leaveChannel();
      const destroyResult = engine.destroy();
      if (destroyResult && typeof destroyResult.then === 'function') {
        await destroyResult;
      }
    } catch (error) {
      console.error('RTC destroy error:', error);
    }
    engine = null;
  }

  listeners.clear();
  isInitialized = false;
  currentUserId = null;
}

// Export components for direct use
export { RtcSurfaceView, RtcTextureView };

// Export UID conversion utility
export { userIdToUid };

// Getter for current user's numeric Agora UID
export function getCurrentUserUid() {
  return currentUserUid;
}

// Getter for remote user's numeric Agora UID (from UserJoined callback)
export function getRemoteUid() {
  return remoteUid;
}

// Default export for convenience
const agoraRTCService = {
  initialize,
  startCall,
  acceptCall,
  rejectCall,
  endCall,
  cancelCall,
  joinChannel,
  leaveChannel,
  toggleVideo,
  toggleAudio,
  switchCamera,
  setSpeakerphone,
  resetCallState,
  getCallState,
  getCallInfo,
  on,
  off,
  destroy,
  getCurrentUserUid,
  userIdToUid,
};

export default agoraRTCService;