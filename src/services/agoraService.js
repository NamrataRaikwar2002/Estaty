/**
 * Agora RTC Service with Firebase Firestore Signaling
 *
 * Handles real-time audio/video calling using Agora RTC SDK.
 * Uses Firebase Firestore for real-time call signaling.
 *
 * CONFIGURATION:
 * - Replace AGORA_APP_ID with your actual Agora App ID from Agora Console
 * - Configure Firebase in src/services/firebaseConfig.js
 * - Set up Firestore Security Rules (see FIRESTORE_RULES.md)
 *
 * ARCHITECTURE:
 * - RTC Engine: Handles audio/video streams via react-native-agora v4.x
 * - Signaling: Firebase Firestore realtime listeners for cross-device signaling
 * - Event listeners for call state management
 */

import { createAgoraRtcEngine, RtcSurfaceView, RtcTextureView } from 'react-native-agora';
import { callSignaling, CALL_STATUS } from './callSignaling';
import { navigate } from '../navigation/NavigationService';
import Config from 'react-native-config';
import { Platform, PermissionsAndroid } from 'react-native';

// ==================== CONFIGURATION ====================
// IMPORTANT: Replace YOUR_AGORA_APP_ID_HERE with your actual Agora App ID from https://console.agora.io
// Loaded from .env via react-native-config
export const AGORA_APP_ID = Config.AGORA_APP_ID;
console.log('[AgoraService] AGORA_APP_ID:', AGORA_APP_ID ? 'SET' : 'UNDEFINED');
// Channel name prefix for calls
export const CALL_CHANNEL_PREFIX = 'estaty_call_ch_';

// ==================== DIAGNOSTIC HELPERS ====================
const getTimestamp = () => Date.now();
const logTiming = (label, startTime) => {
  const elapsed = getTimestamp() - startTime;
  console.log(`[AgoraService][TIMING] ${label}: ${elapsed}ms`);
};

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

// ==================== AGORA SERVICE CLASS ====================
class AgoraService {
  constructor() {
    this.engine = null;
    this.currentUserId = null;
    this.currentChannel = null;
    this.callType = null;
    this.callState = CALL_STATES.IDLE;
    this.remoteUserId = null;
    this.listeners = new Map();
    this.isInitialized = false;
    this.localVideoEnabled = true;
    this.localAudioEnabled = true;
    this.incomingCallUnsubscribe = null;
    this.activeCallId = null;
    this.activeCallUnsubscribe = null;
  }

  /**
   * Initialize Agora RTC Engine and Firebase Signaling
   * @param {string} userId - Current user's unique ID
   * @returns {Promise<boolean>} Success status
   */
  async initialize(userId) {
    const initStart = getTimestamp();
    console.log('[AgoraService][INIT] initialize called:', { userId, isInitialized: this.isInitialized, currentUserId: this.currentUserId, AGORA_APP_ID: AGORA_APP_ID ? 'SET' : 'UNDEFINED', AGORA_APP_ID_LENGTH: AGORA_APP_ID?.length });

    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[AgoraService][INIT] Already initialized for this user');
      return true;
    }

    if (!AGORA_APP_ID) {
      console.error('[AgoraService][INIT] AGORA_APP_ID is not set! Check your .env file');
      return false;
    }

    // Validate App ID format (should be 32 chars)
    if (AGORA_APP_ID.length !== 32) {
      console.warn('[AgoraService][INIT] AGORA_APP_ID length unusual:', AGORA_APP_ID.length, '(expected 32)');
    }

    try {
      this.currentUserId = String(userId);

      // Request microphone permission on Android
      if (Platform.OS === 'android') {
        await this.requestMicrophonePermission();
      }

      // Create RTC Engine using new 4.x API
      console.log('[AgoraService][INIT] Creating RTC Engine...');
      const engineStart = getTimestamp();
      this.engine = createAgoraRtcEngine();
      const initResult = this.engine.initialize({ appId: AGORA_APP_ID });
      if (initResult && typeof initResult.then === 'function') {
        await initResult;
      }
      logTiming('engine.initialize', engineStart);
      console.log('[AgoraService][INIT] RTC Engine initialized');

      // Enable audio (required for audio calls)
      const enableAudioStart = getTimestamp();
      const enableAudioResult = this.engine.enableAudio();
      if (enableAudioResult && typeof enableAudioResult.then === 'function') {
        await enableAudioResult;
      }
      logTiming('enableAudio', enableAudioStart);
      console.log('[AgoraService][INIT] Audio enabled');

      // Verify audio is enabled
      try {
        const audioEnabled = await this.engine.isAudioEnabled?.();
        console.log('[AgoraService][INIT] Audio enabled verification:', audioEnabled);
      } catch (e) {
        console.log('[AgoraService][INIT] Could not verify audio enabled:', e);
      }

      // Set audio profile for better quality
      const audioProfileStart = getTimestamp();
      try {
        const audioProfileResult = this.engine.setAudioProfile({
          profile: 'music_high_quality', // High quality audio profile
          scenario: 'chat_room_entertainment', // Optimized for real-time communication
        });
        if (audioProfileResult && typeof audioProfileResult.then === 'function') {
          await audioProfileResult;
        }
        logTiming('setAudioProfile', audioProfileStart);
        console.log('[AgoraService][INIT] Audio profile set: music_high_quality');
      } catch (audioProfileError) {
        console.warn('[AgoraService][INIT] setAudioProfile failed (may not be supported):', audioProfileError);
      }

      // Configure video encoder
      const videoStart = getTimestamp();
      const videoConfigResult = this.engine.setVideoEncoderConfiguration({
        dimensions: { width: 720, height: 1280 },
        frameRate: 15,
        bitrate: 1200,
        orientationMode: 'adaptative',
      });
      if (videoConfigResult && typeof videoConfigResult.then === 'function') {
        await videoConfigResult;
      }
      logTiming('video config', videoStart);

      // Enable video
      const enableVideoStart = getTimestamp();
      const enableVideoResult = this.engine.enableVideo();
      if (enableVideoResult && typeof enableVideoResult.then === 'function') {
        await enableVideoResult;
      }
      logTiming('enableVideo', enableVideoStart);

      // Set default audio route to speaker
      const audioStart = getTimestamp();
      const audioRouteResult = this.engine.setDefaultAudioRouteToSpeakerphone(true);
      if (audioRouteResult && typeof audioRouteResult.then === 'function') {
        await audioRouteResult;
      }
      logTiming('audio route', audioStart);
      console.log('[AgoraService][INIT] Audio route set to speakerphone');

      // Verify speakerphone setting
      try {
        const isSpeaker = await this.engine.isSpeakerphoneEnabled?.();
        console.log('[AgoraService][INIT] Speakerphone enabled verification:', isSpeaker);
      } catch (e) {
        console.log('[AgoraService][INIT] Could not verify speakerphone:', e);
      }

      // Setup RTC event listeners
      this.setupRtcListeners();

      // Initialize Firebase Call Signaling
      console.log('[AgoraService][INIT] Initializing Firebase signaling...');
      const signalingStart = getTimestamp();
      const signalingInitialized = await callSignaling.initialize(this.currentUserId);
      logTiming('callSignaling.initialize', signalingStart);
      if (!signalingInitialized) {
        console.warn('[AgoraService][INIT] Firebase signaling initialization failed');
        return false;
      }

      // Setup signaling listener for incoming calls
      this.incomingCallUnsubscribe = callSignaling.listenForIncomingCalls((signal) => {
        this.handleSignalingMessage(signal);
      });

      this.isInitialized = true;
      logTiming('initialize total', initStart);
      console.log('[AgoraService][INIT] Service initialized for user:', this.currentUserId);
      return true;
    } catch (error) {
      logTiming('initialize FAILED', initStart);
      console.error('[AgoraService][INIT] Initialization error:', error);
      return false;
    }
  }

  /**
   * Request microphone permission on Android
   */
  async requestMicrophonePermission() {
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
      console.log('[AgoraService][PERMISSION] Microphone permission:', granted === PermissionsAndroid.RESULTS.GRANTED ? 'GRANTED' : 'DENIED');
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('[AgoraService][PERMISSION] Microphone permission request error:', error);
      return false;
    }
  }

  /**
   * Setup RTC engine event listeners
   */
  setupRtcListeners() {
    if (!this.engine) return;

    this.engine.addListener('UserJoined', (uid) => {
      console.log('[AgoraService][RTC] UserJoined:', uid);
      this.emit('userJoined', uid);
    });

    this.engine.addListener('UserLeft', (uid, reason) => {
      console.log('[AgoraService][RTC] UserLeft:', uid, 'reason:', reason);
      this.emit('userLeft', { uid, reason });
    });

    this.engine.addListener('UserInfoUpdated', (uid, userInfo) => {
      this.emit('userInfoUpdated', { uid, userInfo });
    });

    this.engine.addListener('LocalVideoStats', (stats) => {
      this.emit('localVideoStats', stats);
    });

    this.engine.addListener('RemoteVideoStats', (stats) => {
      this.emit('remoteVideoStats', stats);
    });

    this.engine.addListener('LocalAudioStats', (stats) => {
      console.log('[AgoraService][RTC] LocalAudioStats:', JSON.stringify(stats));
      this.emit('localAudioStats', stats);
    });

    this.engine.addListener('RemoteAudioStats', (stats) => {
      console.log('[AgoraService][RTC] RemoteAudioStats:', JSON.stringify(stats));
      this.emit('remoteAudioStats', stats);
    });

    this.engine.addListener('ConnectionStateChanged', (state, reason) => {
      const stateMap = {
        1: 'DISCONNECTED',
        2: 'CONNECTING',
        3: 'CONNECTED',
        4: 'RECONNECTING',
        5: 'FAILED',
      };
      console.log('[AgoraService][RTC] ConnectionStateChanged:', stateMap[state] || state, 'reason:', reason);
      this.emit('connectionStateChanged', { state, reason });
    });

    this.engine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      console.log('[AgoraService][RTC] JoinChannelSuccess:', { channel, uid, elapsed });
      this.emit('joinChannelSuccess', { channel, uid, elapsed });
    });

    this.engine.addListener('LeaveChannel', (stats) => {
      console.log('[AgoraService][RTC] LeaveChannel:', stats);
      this.emit('leaveChannel', stats);
    });

    this.engine.addListener('Error', (err, msg) => {
      console.error('[AgoraService][RTC] Error:', err, msg);
      this.emit('error', { code: err, message: msg });
    });

    this.engine.addListener('FirstRemoteVideoFrame', (uid, width, height, elapsed) => {
      console.log('[AgoraService][RTC] FirstRemoteVideoFrame:', { uid, width, height, elapsed });
      this.emit('firstRemoteVideoFrame', { uid, width, height, elapsed });
    });

    this.engine.addListener('FirstRemoteAudioFrame', (uid, elapsed) => {
      console.log('[AgoraService][RTC] FirstRemoteAudioFrame:', { uid, elapsed });
      this.emit('firstRemoteAudioFrame', { uid, elapsed });
    });

    // Audio volume indication
    this.engine.addListener('AudioVolumeIndication', (speakers, totalVolume) => {
      console.log('[AgoraService][RTC] AudioVolumeIndication:', { speakersCount: speakers?.length, totalVolume });
      this.emit('audioVolumeIndication', { speakers, totalVolume });
    });

    // Audio route changed
    this.engine.addListener('AudioRouteChanged', (routing) => {
      const routeMap = {
        0: 'HEADSET',
        1: 'EARPIECE',
        2: 'LOUDSPEAKER',
        3: 'HEADSET_NO_MIC',
        4: 'HEADSET_WITH_MIC',
        5: 'BLUETOOTH',
      };
      console.log('[AgoraService][RTC] AudioRouteChanged:', routeMap[routing] || routing);
      this.emit('audioRouteChanged', { routing });
    });

    // Remote audio state
    this.engine.addListener('RemoteAudioStateChanged', (uid, state, reason, elapsed) => {
      const stateMap = {
        0: 'STOPPED',
        1: 'STARTING',
        2: 'DECODING',
        3: 'FROZEN',
        4: 'FAILED',
      };
      console.log('[AgoraService][RTC] RemoteAudioStateChanged:', { uid, state: stateMap[state] || state, reason, elapsed });
      this.emit('remoteAudioStateChanged', { uid, state, reason, elapsed });
    });

    // Local audio state
    this.engine.addListener('LocalAudioStateChanged', (state, reason) => {
      const stateMap = {
        0: 'STOPPED',
        1: 'RECORDING',
        2: 'ENCODING',
        3: 'FAILED',
      };
      console.log('[AgoraService][RTC] LocalAudioStateChanged:', { state: stateMap[state] || state, reason });
      this.emit('localAudioStateChanged', { state, reason });
    });
  }

  /**
   * Handle incoming signaling messages from Firebase
   */
  handleSignalingMessage(signal) {
    console.log('[AgoraService] handleSignalingMessage received:', signal);
    switch (signal.type) {
      case 'CALL_INVITE':
        // Only process if we're not already in a call
        // Allow INCOMING state too (in case of rapid re-call after missed)
        const busyStates = [CALL_STATES.CALLING, CALL_STATES.CONNECTING, CALL_STATES.CONNECTED];
        if (!busyStates.includes(this.callState)) {
          console.log('[AgoraService] Processing CALL_INVITE, navigating to IncomingCall', { currentState: this.callState });
          this.callState = CALL_STATES.INCOMING;
          this.activeCallId = signal.callId;
          this.remoteUserId = signal.callerId;
          this.callType = signal.callType;
          this.currentChannel = signal.channelName;

          // Subscribe to call status changes
          this.subscribeToCallStatus(signal.callId);

          // Navigate to IncomingCallScreen
          navigate('IncomingCall', {
            callId: signal.callId,
            callerId: signal.callerId,
            callerName: signal.callerName,
            callType: signal.callType,
            channelName: signal.channelName,
            propertyId: signal.propertyId,
          });
        } else {
          console.log('[AgoraService] User busy, marking call as busy', { currentState: this.callState });
          // User is busy - mark call as busy
          callSignaling.markBusy(signal.callId, this.currentUserId);
        }
        break;

      case 'CALL_ACCEPTED':
        this.emit('callAccepted', {
          callId: signal.callId,
          from: signal.from,
          channelName: signal.channelName,
        });
        break;

      case 'CALL_REJECTED':
        this.emit('callRejected', {
          callId: signal.callId,
          from: signal.from,
          reason: signal.reason,
        });
        break;

      case 'USER_BUSY':
        this.emit('userBusy', {
          callId: signal.callId,
          from: signal.from,
        });
        break;

      case 'CALL_END':
        this.emit('callEndedByRemote', {
          callId: signal.callId,
          from: signal.from,
        });
        break;

      case 'CALL_CANCEL':
        // Only process if it matches our active call
        if (signal.callId === this.activeCallId) {
          this.emit('callCancelled', {
            callId: signal.callId,
            from: signal.from,
          });
        } else {
          console.log('[AgoraService] Ignoring CALL_CANCEL for different call:', { active: this.activeCallId, signal: signal.callId });
        }
        break;

      case 'CALL_MISSED':
        // Only process if it matches our active call
        if (signal.callId === this.activeCallId) {
          this.emit('callMissed', {
            callId: signal.callId,
            from: signal.from,
          });
        } else {
          console.log('[AgoraService] Ignoring CALL_MISSED for different call:', { active: this.activeCallId, signal: signal.callId });
        }
        break;

      case 'CALL_END':
        // Only process if it matches our active call
        if (signal.callId === this.activeCallId) {
          this.emit('callEndedByRemote', {
            callId: signal.callId,
            from: signal.from,
          });
        } else {
          console.log('[AgoraService] Ignoring CALL_END for different call:', { active: this.activeCallId, signal: signal.callId });
        }
        break;

      default:
        console.warn('[Agora] Unknown signal type:', signal.type);
    }
  }

  /**
   * Subscribe to call status changes for an active call
   * @param {string} callId - Call ID
   */
  subscribeToCallStatus(callId) {
    // Clean up previous subscription
    if (this.activeCallUnsubscribe) {
      this.activeCallUnsubscribe();
    }

    this.activeCallUnsubscribe = callSignaling.onCallStatusChange(callId, (callData) => {
      if (!callData) return;

      switch (callData.status) {
        case CALL_STATUS.ACCEPTED:
          // Call was accepted by receiver
          if (callData.callerId === this.currentUserId) {
            this.callState = CALL_STATES.CONNECTED;
            this.emit('callStateChanged', this.callState);
          }
          break;

        case CALL_STATUS.REJECTED:
          // Call was rejected
          if (callData.callerId === this.currentUserId) {
            this.resetCallState();
            this.emit('callRejected', { reason: callData.rejectReason || 'Call rejected' });
          }
          break;

        case CALL_STATUS.BUSY:
          // Receiver is busy
          if (callData.callerId === this.currentUserId) {
            this.resetCallState();
            this.emit('userBusy');
          }
          break;

        case CALL_STATUS.ENDED:
          // Call ended by either party
          this.resetCallState();
          this.emit('callEndedByRemote', { from: callData.callerId === this.currentUserId ? callData.receiverId : callData.callerId });
          break;

        case CALL_STATUS.CANCELLED:
          // Call cancelled by caller
          if (callData.receiverId === this.currentUserId) {
            this.resetCallState();
            this.emit('callCancelled');
          }
          break;

        case CALL_STATUS.MISSED:
          // Call timed out (missed)
          if (callData.receiverId === this.currentUserId) {
            this.resetCallState();
            this.emit('callMissed');
          }
          break;
      }
    });
  }

  /**
   * Start an outgoing call
   * @param {string} targetUserId - User ID to call
   * @param {string} callType - 'audio' or 'video'
   * @param {string} callerName - Caller's display name
   * @param {string} receiverName - Receiver's display name (optional)
   * @param {string} propertyId - Property ID (optional)
   * @returns {Promise<{ success: boolean, channelName?: string, callId?: string, error?: string }>}
   */
  async startCall(targetUserId, callType, callerName, receiverName = '', propertyId = null) {
    const startCallStart = getTimestamp();
    console.log('[AgoraService][START_CALL] startCall called:', { targetUserId, callType, callerName, receiverName, propertyId, currentUserId: this.currentUserId, callState: this.callState });

    if (this.callState !== CALL_STATES.IDLE) {
      console.log('[AgoraService][START_CALL] Already in a call, rejecting:', this.callState);
      return { success: false, error: 'Already in a call' };
    }

    if (!this.engine) {
      console.error('[AgoraService][START_CALL] Engine not initialized!');
      return { success: false, error: 'Agora engine not initialized' };
    }

    this.remoteUserId = String(targetUserId);
    this.callType = callType;
    this.callState = CALL_STATES.CALLING;

    try {
      // Create call invitation in Realtime Database
      console.log('[AgoraService][START_CALL] Calling sendCallInvitation...');
      const inviteStart = getTimestamp();
      const callInfo = await callSignaling.sendCallInvitation({
        callerId: this.currentUserId,
        callerName,
        receiverId: this.remoteUserId,
        receiverName,
        callType,
        propertyId,
      });
      logTiming('sendCallInvitation', inviteStart);

      console.log('[AgoraService][START_CALL] sendCallInvitation succeeded:', callInfo);

      this.activeCallId = callInfo.callId;
      this.currentChannel = callInfo.channelName;

      // Join RTC channel
      console.log('[AgoraService][START_CALL] Joining RTC channel:', callInfo.channelName);
      const joinStart = getTimestamp();
      await this.joinChannel(callInfo.channelName);
      logTiming('joinChannel', joinStart);
      console.log('[AgoraService][START_CALL] Joined RTC channel successfully');

      // Subscribe to call status changes
      this.subscribeToCallStatus(callInfo.callId);

      this.emit('callStateChanged', this.callState);
      logTiming('startCall total', startCallStart);
      return { success: true, channelName: callInfo.channelName, callId: callInfo.callId };
    } catch (error) {
      logTiming('startCall FAILED', startCallStart);
      console.error('[AgoraService][START_CALL] Start call error:', error);
      this.callState = CALL_STATES.IDLE;
      await this.leaveChannel();
      this.emit('callFailed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Accept an incoming call
   * @param {string} callId - Call ID
   * @param {string} channelName - Channel to join
   * @param {string} callerId - Caller's user ID
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async acceptCall(callId, channelName, callerId) {
    const acceptStart = getTimestamp();
    console.log('[AgoraService][ACCEPT] acceptCall called:', { callId, channelName, callerId, callState: this.callState });

    if (this.callState !== CALL_STATES.INCOMING) {
      console.log('[AgoraService][ACCEPT] Not in INCOMING state:', this.callState);
      return { success: false, error: 'No incoming call to accept' };
    }

    this.currentChannel = channelName;
    this.remoteUserId = callerId;
    this.callState = CALL_STATES.CONNECTING;

    try {
      // Accept call in Firestore (updates status to ACCEPTED)
      console.log('[AgoraService][ACCEPT] Calling callSignaling.acceptCall...');
      const signalingStart = getTimestamp();
      await callSignaling.acceptCall(callId, this.currentUserId);
      logTiming('callSignaling.acceptCall', signalingStart);

      // Join RTC channel
      console.log('[AgoraService][ACCEPT] Joining RTC channel...');
      const joinStart = getTimestamp();
      await this.joinChannel(channelName);
      logTiming('joinChannel after accept', joinStart);

      this.callState = CALL_STATES.CONNECTED;
      this.emit('callStateChanged', this.callState);
      logTiming('acceptCall total', acceptStart);
      return { success: true };
    } catch (error) {
      logTiming('acceptCall FAILED', acceptStart);
      console.error('[AgoraService][ACCEPT] Accept call error:', error);
      this.callState = CALL_STATES.FAILED;
      await this.leaveChannel();
      this.emit('callFailed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Reject an incoming call
   * @param {string} callId - Call ID
   * @param {string} reason - Rejection reason
   */
  async rejectCall(callId, reason = 'Call rejected') {
    if (this.callState !== CALL_STATES.INCOMING) return;

    try {
      await callSignaling.rejectCall(callId, this.currentUserId, reason);
    } catch (error) {
      console.error('Reject call error:', error);
    }

    this.resetCallState();
  }

  /**
   * End current call
   * @returns {Promise<void>}
   */
  async endCall() {
    console.log('[AgoraService][END_CALL] endCall called:', { callState: this.callState, activeCallId: this.activeCallId, currentUserId: this.currentUserId });

    if (this.callState === CALL_STATES.IDLE) {
      console.log('[AgoraService][END_CALL] Already IDLE, skipping');
      return;
    }

    const callId = this.activeCallId;

    try {
      if (callId) {
        // End call in Firestore (updates status to ENDED)
        console.log('[AgoraService][END_CALL] Calling callSignaling.endCall for:', callId);
        await callSignaling.endCall(callId, this.currentUserId);
        console.log('[AgoraService][END_CALL] callSignaling.endCall completed');
      }
    } catch (error) {
      console.error('[AgoraService][END_CALL] Error ending call in signaling:', error);
    }

    console.log('[AgoraService][END_CALL] Leaving channel...');
    await this.leaveChannel();
    console.log('[AgoraService][END_CALL] Resetting call state...');
    this.resetCallState();
    console.log('[AgoraService][END_CALL] End call completed');
  }

  /**
   * Cancel outgoing call (caller cancels before receiver answers)
   * @returns {Promise<void>}
   */
  async cancelCall() {
    if (this.callState !== CALL_STATES.CALLING) return;

    const callId = this.activeCallId;

    try {
      if (callId) {
        callSignaling.cancelCall(callId, this.currentUserId);
      }
    } catch (error) {
      console.error('Cancel call error:', error);
    }

    await this.leaveChannel();
    this.resetCallState();
  }

  /**
   * Join RTC channel
   */
  async joinChannel(channelName) {
    const joinStart = getTimestamp();
    console.log('[AgoraService][JOIN_CHANNEL] joinChannel called:', { channelName, currentUserId: this.currentUserId, hasEngine: !!this.engine, callType: this.callType, localAudioEnabled: this.localAudioEnabled });

    if (!this.engine) throw new Error('Engine not initialized');

    // Ensure audio is enabled before joining
    if (this.localAudioEnabled) {
      try {
        const muteResult = this.engine.muteLocalAudioStream(false);
        if (muteResult && typeof muteResult.then === 'function') {
          await muteResult;
        }
        console.log('[AgoraService][JOIN_CHANNEL] Local audio unmuted (pre-join)');
      } catch (muteError) {
        console.warn('[AgoraService][JOIN_CHANNEL] Failed to unmute local audio (pre-join):', muteError);
      }
    }

    // Empty token for no-token mode (testing only)
    // For production, generate RTC tokens on your server
    const token = Config.AGORA_TOKEN;
    const joinResult = this.engine.joinChannel(token, channelName, this.currentUserId);
    if (joinResult && typeof joinResult.then === 'function') {
      await joinResult;
    }
    logTiming('joinChannel engine.joinChannel', joinStart);
    console.log('[AgoraService][JOIN_CHANNEL] joinChannel completed successfully');

    // Post-join audio configuration - critical for audio to work
    try {
      // Ensure audio is enabled on the engine
      const enableAudioResult = this.engine.enableAudio();
      if (enableAudioResult && typeof enableAudioResult.then === 'function') {
        await enableAudioResult;
      }
      console.log('[AgoraService][JOIN_CHANNEL] Audio enabled (post-join)');

      // Set speakerphone on (not earpiece)
      const speakerResult = this.engine.setEnableSpeakerphone(true);
      if (speakerResult && typeof speakerResult.then === 'function') {
        await speakerResult;
      }
      console.log('[AgoraService][JOIN_CHANNEL] Speakerphone enabled');

      // Verify local audio is not muted
      const muteResult2 = this.engine.muteLocalAudioStream(false);
      if (muteResult2 && typeof muteResult2.then === 'function') {
        await muteResult2;
      }
      console.log('[AgoraService][JOIN_CHANNEL] Local audio unmuted (post-join)');

      // Verify audio state after joining
      const isMuted = await this.engine.isLocalAudioMuted?.();
      console.log('[AgoraService][JOIN_CHANNEL] Local audio muted state after join:', isMuted);
    } catch (e) {
      console.error('[AgoraService][JOIN_CHANNEL] Post-join audio config error:', e);
    }
  }

  /**
   * Leave RTC channel
   */
  async leaveChannel() {
    console.log('[AgoraService][LEAVE_CHANNEL] leaveChannel called:', { currentChannel: this.currentChannel, hasEngine: !!this.engine });

    if (!this.engine || !this.currentChannel) {
      console.log('[AgoraService][LEAVE_CHANNEL] No channel to leave');
      return;
    }

    try {
      const leaveResult = this.engine.leaveChannel();
      if (leaveResult && typeof leaveResult.then === 'function') {
        await leaveResult;
      }
      console.log('[AgoraService][LEAVE_CHANNEL] Channel left successfully');
    } catch (error) {
      console.error('[AgoraService][LEAVE_CHANNEL] Leave channel error:', error);
    }
    this.currentChannel = null;
  }

  /**
   * Toggle local video
   */
  async toggleVideo() {
    if (!this.engine) return;

    this.localVideoEnabled = !this.localVideoEnabled;
    const result = this.engine.muteLocalVideoStream(!this.localVideoEnabled);
    if (result && typeof result.then === 'function') {
      await result;
    }
    this.emit('localVideoToggled', this.localVideoEnabled);
  }

  /**
   * Toggle local audio
   */
  async toggleAudio() {
    if (!this.engine) return;

    this.localAudioEnabled = !this.localAudioEnabled;
    const result = this.engine.muteLocalAudioStream(!this.localAudioEnabled);
    if (result && typeof result.then === 'function') {
      await result;
    }
    this.emit('localAudioToggled', this.localAudioEnabled);
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera() {
    if (!this.engine) return;
    const result = this.engine.switchCamera();
    if (result && typeof result.then === 'function') {
      await result;
    }
  }

  /**
   * Enable/disable speakerphone
   */
  async setSpeakerphone(enabled) {
    if (!this.engine) return;
    const result = this.engine.setEnableSpeakerphone(enabled);
    if (result && typeof result.then === 'function') {
      await result;
    }
  }

  /**
   * Reset call state
   */
  resetCallState() {
    // Clean up call subscription
    if (this.activeCallUnsubscribe) {
      this.activeCallUnsubscribe();
      this.activeCallUnsubscribe = null;
    }

    // Emit ENDED state first so UI can react (navigate back)
    this.callState = CALL_STATES.ENDED;
    this.emit('callStateChanged', this.callState);

    // Then reset to IDLE
    this.callState = CALL_STATES.IDLE;
    this.currentChannel = null;
    this.remoteUserId = null;
    this.callType = null;
    this.activeCallId = null;
    this.localVideoEnabled = true;
    this.localAudioEnabled = true;
    this.emit('callStateChanged', this.callState);
  }

  /**
   * Get current call state
   */
  getCallState() {
    return this.callState;
  }

  /**
   * Get current call info
   */
  getCallInfo() {
    return {
      state: this.callState,
      type: this.callType,
      channel: this.currentChannel,
      remoteUserId: this.remoteUserId,
      localVideoEnabled: this.localVideoEnabled,
      localAudioEnabled: this.localAudioEnabled,
    };
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) callbacks.splice(index, 1);
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => cb(data));
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    // Clean up incoming call listener
    if (this.incomingCallUnsubscribe) {
      this.incomingCallUnsubscribe();
      this.incomingCallUnsubscribe = null;
    }

    // Clean up active call listener
    if (this.activeCallUnsubscribe) {
      this.activeCallUnsubscribe();
      this.activeCallUnsubscribe = null;
    }

    // Destroy Firebase signaling
    await callSignaling.destroy();

    if (this.engine) {
      try {
        await this.leaveChannel();
        const destroyResult = this.engine.destroy();
        if (destroyResult && typeof destroyResult.then === 'function') {
          await destroyResult;
        }
      } catch (error) {
        console.error('RTC destroy error:', error);
      }
      this.engine = null;
    }

    this.listeners.clear();
    this.isInitialized = false;
    this.currentUserId = null;
  }
}

// Export singleton instance
export const agoraService = new AgoraService();

// Export components for direct use
export { RtcSurfaceView, RtcTextureView };

export default agoraService;