/**
 * CallContext - Agora RTC + Firebase signaling as React Context
 *
 * Place at: src/context/CallContext.jsx
 * Wrap your app (inside AuthProvider, after NavigationContainer is set up):
 *
 *   <AuthProvider>
 *     <CallProvider>
 *       <AppNavigator />
 *     </CallProvider>
 *   </AuthProvider>
 *
 * Consume anywhere with:  const { callState, startCall, endCall, ... } = useCall();
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Config from 'react-native-config';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';
import { callSignaling, CALL_STATUS } from '../services/callSignaling';
import { navigate } from '../navigation/NavigationService';
import { useAuth } from './AuthContext';

// ==================== CONFIGURATION ====================
// Move secrets to .env (react-native-config). Never hardcode the token in source.
// Agora tokens expire - for production fetch a fresh token from your backend per channel/uid.
export const AGORA_APP_ID = Config.AGORA_APP_ID;
export const AGORA_TOKEN = Config.AGORA_TOKEN || '';
export const CALL_CHANNEL_PREFIX = 'estaty_call_ch_';

// TEST MODE: fixed channel instead of the dynamic Firebase channel
export const USE_FIXED_TEST_CHANNEL = true;
export const FIXED_TEST_CHANNEL = CALL_CHANNEL_PREFIX;

export const CALL_TYPES = { AUDIO: 'audio', VIDEO: 'video' };

export const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
};

// Agora connection states
export const CONNECTION_STATES = {
  DISCONNECTED: 1,
  CONNECTING: 2,
  CONNECTED: 3,
  RECONNECTING: 4,
  FAILED: 5,
};

// ==================== HELPERS ====================
/** Stable string userId -> numeric Agora UID */
export function userIdToUid(userId) {
  if (!userId) return 0;
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

async function requestAndroidPermission(permission, title, message) {
  try {
    const granted = await PermissionsAndroid.request(permission, {
      title,
      message,
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (e) {
    console.error('[CallContext][PERMISSION] error:', e);
    return false;
  }
}

// ==================== CONTEXT ====================
const CallContext = createContext(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
}

export function CallProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || user?.uid || user?._id || null; // adjust to your user shape

  // ---------- Reactive state (drives UI) ----------
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isSignalingReady, setIsSignalingReady] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [callState, setCallStateRaw] = useState(CALL_STATES.IDLE);
  const [callType, setCallType] = useState(null);
  const [channelName, setChannelName] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [remoteUid, setRemoteUid] = useState(null);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.CONNECTED);
  const [connectedAt, setConnectedAt] = useState(null);

  // ---------- Refs ----------
  const agoraEngineRef = useRef(null);
  const eventHandler = useRef(null);
  const isMountedRef = useRef(true);
  const userIdRef = useRef(null);
  const uidRef = useRef(0);
  const channelRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef(CALL_STATES.IDLE);
  const callTypeRef = useRef(null);
  const remoteUserIdRef = useRef(null);
  const mutedRef = useRef(false);
  const videoOffRef = useRef(false);
  const connectedAtRef = useRef(null);
  const incomingUnsubRef = useRef(null);
  const statusUnsubRef = useRef(null);

  // ---------- State helpers ----------
  const updateCallState = useCallback((next) => {
    callStateRef.current = next;
    setCallStateRaw(next);
    if (next === CALL_STATES.CONNECTED && !connectedAtRef.current) {
      connectedAtRef.current = Date.now();
      setConnectedAt(connectedAtRef.current);
    }
  }, []);

  const leaveChannel = useCallback(async () => {
    if (!agoraEngineRef.current || !channelRef.current) return;
    try {
      await agoraEngineRef.current.leaveChannel();
    } catch (e) {
      console.error('[CallContext][LEAVE] error:', e);
    }
    channelRef.current = null;
    setChannelName(null);
    setIsJoined(false);
  }, []);

  const resetCallState = useCallback(() => {
    if (statusUnsubRef.current) {
      statusUnsubRef.current();
      statusUnsubRef.current = null;
    }

    // Logic sees IDLE immediately (so a new call can start),
    // UI sees ENDED briefly so the screen can navigate back.
    callStateRef.current = CALL_STATES.IDLE;
    setCallStateRaw(CALL_STATES.ENDED);
    setTimeout(() => {
      if (callStateRef.current === CALL_STATES.IDLE) setCallStateRaw(CALL_STATES.IDLE);
    }, 600);

    channelRef.current = null;
    callIdRef.current = null;
    remoteUserIdRef.current = null;
    callTypeRef.current = null;
    mutedRef.current = false;
    videoOffRef.current = false;
    connectedAtRef.current = null;

    setChannelName(null);
    setRemoteUserId(null);
    setRemoteUid(null);
    setRemoteVideoReady(false);
    setCallType(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsJoined(false);
    setConnectedAt(null);
    setConnectionState(CONNECTION_STATES.CONNECTED);
  }, []);

  // ==================== AGORA ENGINE (sample-style) ====================

  /** Create + configure the engine once */
  const setupVoiceSDKEngine = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await requestAndroidPermission(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          'Microphone Permission',
          'ESTATY needs access to your microphone for voice and video calls.'
        );
        await requestAndroidPermission(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          'Camera Permission',
          'ESTATY needs access to your camera for video calls.'
        );
      }

      if (!AGORA_APP_ID) {
        console.error('[CallContext][ENGINE] AGORA_APP_ID missing - check .env');
        return;
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      await agoraEngine.initialize({ appId: AGORA_APP_ID });
      await agoraEngine.enableAudio();

      try {
        await agoraEngine.setAudioProfile({
          profile: 'music_high_quality',
          scenario: 'chat_room_entertainment',
        });
      } catch (e) {
        console.warn('[CallContext][ENGINE] setAudioProfile failed:', e);
      }

      await agoraEngine.setVideoEncoderConfiguration({
        dimensions: { width: 720, height: 1280 },
        frameRate: 15,
        bitrate: 1200,
        orientationMode: 'adaptative',
      });

      // SDK requirement: startPreview before enableVideo when not joined
      try {
        await agoraEngine.startPreview();
      } catch (e) {
        console.error('[CallContext][ENGINE] startPreview failed:', e);
      }
      await agoraEngine.enableVideo();
      await agoraEngine.setDefaultAudioRouteToSpeakerphone(true);
    } catch (e) {
      console.error('[CallContext][ENGINE] setup error:', e);
    }
  }, []);

  /** Register all RTC callbacks with registerEventHandler */
  const setupEventHandler = useCallback(() => {
    eventHandler.current = {
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('[CallContext][RTC] onJoinChannelSuccess:', connection?.channelId, elapsed);
        setMessage('Successfully joined channel: ' + connection?.channelId);
        setIsJoined(true);
      },
      onLeaveChannel: (connection, stats) => {
        console.log('[CallContext][RTC] onLeaveChannel:', stats);
        setIsJoined(false);
      },
      onUserJoined: (_connection, uid) => {
        console.log('[CallContext][RTC] onUserJoined:', uid);
        setMessage('Remote user ' + uid + ' joined');
        setRemoteUid(uid);
        setRemoteVideoReady(true);
        updateCallState(CALL_STATES.CONNECTED);
      },
      onUserOffline: (_connection, uid) => {
        console.log('[CallContext][RTC] onUserOffline:', uid);
        setMessage('Remote user ' + uid + ' left the channel');
        setRemoteUid(null);
        setRemoteVideoReady(false);
      },
      onConnectionStateChanged: (_connection, state, reason) => {
        console.log('[CallContext][RTC] onConnectionStateChanged:', state, reason);
        setConnectionState(state);
      },
      onError: (err, msg) => {
        console.error('[CallContext][RTC] onError:', err, msg);
        if (err === 101 || err === 102) setConnectionState(CONNECTION_STATES.FAILED);
      },
      onFirstRemoteVideoFrame: (_connection, uid, width, height, elapsed) => {
        console.log('[CallContext][RTC] onFirstRemoteVideoFrame:', { uid, width, height, elapsed });
        setRemoteVideoReady(true);
      },
      onFirstRemoteAudioFrame: (_connection, uid, elapsed) => {
        console.log('[CallContext][RTC] onFirstRemoteAudioFrame:', { uid, elapsed });
        updateCallState(CALL_STATES.CONNECTED);
      },
      onAudioRoutingChanged: (routing) => {
        console.log('[CallContext][RTC] onAudioRoutingChanged:', routing);
      },
      onRemoteAudioStateChanged: (_connection, uid, state, reason) => {
        console.log('[CallContext][RTC] onRemoteAudioStateChanged:', { uid, state, reason });
      },
      onLocalAudioStateChanged: (_connection, state, reason) => {
        console.log('[CallContext][RTC] onLocalAudioStateChanged:', { state, reason });
      },
      onRemoteVideoStateChanged: (_connection, uid, state, reason) => {
        console.log('[CallContext][RTC] onRemoteVideoStateChanged:', { uid, state, reason });
      },
      onLocalVideoStateChanged: (source, state, reason) => {
        console.log('[CallContext][RTC] onLocalVideoStateChanged:', { source, state, reason });
      },
    };
    agoraEngineRef.current?.registerEventHandler(eventHandler.current);
  }, [updateCallState]);

  /** Synchronous teardown (safe to call from effect cleanup) */
  const cleanupAgoraEngine = useCallback(() => {
    try {
      if (eventHandler.current) {
        agoraEngineRef.current?.unregisterEventHandler(eventHandler.current);
        eventHandler.current = null;
      }
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    } catch (e) {
      console.error('[CallContext][ENGINE] cleanup error:', e);
    }
    agoraEngineRef.current = null;
    channelRef.current = null;
  }, []);

  // Engine lifecycle: runs once (like the sample)
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      await setupVoiceSDKEngine();
      if (!isMountedRef.current) {
        // unmounted while initializing (e.g. StrictMode) - release what we created
        cleanupAgoraEngine();
        return;
      }
      setupEventHandler();
      setIsEngineReady(!!agoraEngineRef.current);
    };
    init();

    return () => {
      isMountedRef.current = false;
      setIsEngineReady(false);
      cleanupAgoraEngine(); // synchronous
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== SIGNALING ====================
  const subscribeToCallStatus = useCallback(
    (callId) => {
      if (statusUnsubRef.current) statusUnsubRef.current();

      statusUnsubRef.current = callSignaling.onCallStatusChange(callId, (callData) => {
        if (!callData) return;
        const me = userIdRef.current;

        switch (callData.status) {
          case CALL_STATUS.ACCEPTED:
            if (callData.callerId === me) updateCallState(CALL_STATES.CONNECTED);
            break;
          case CALL_STATUS.REJECTED:
          case CALL_STATUS.BUSY:
            if (callData.callerId === me) {
              leaveChannel();
              resetCallState();
            }
            break;
          case CALL_STATUS.ENDED:
            leaveChannel();
            resetCallState();
            break;
          case CALL_STATUS.CANCELLED:
          case CALL_STATUS.MISSED:
            if (callData.receiverId === me) {
              leaveChannel();
              resetCallState();
            }
            break;
          default:
            break;
        }
      });
    },
    [leaveChannel, resetCallState, updateCallState]
  );

  const handleSignalingMessage = useCallback(
    (signal) => {
      console.log('[CallContext] signal:', signal);
      switch (signal.type) {
        case 'CALL_INVITE': {
          const busy = [CALL_STATES.CALLING, CALL_STATES.CONNECTING, CALL_STATES.CONNECTED];
          if (busy.includes(callStateRef.current)) {
            callSignaling.markBusy(signal.callId, userIdRef.current);
            break;
          }
          updateCallState(CALL_STATES.INCOMING);
          callIdRef.current = signal.callId;
          remoteUserIdRef.current = signal.callerId;
          callTypeRef.current = signal.callType;
          channelRef.current = signal.channelName;
          setRemoteUserId(signal.callerId);
          setCallType(signal.callType);
          setChannelName(signal.channelName);

          subscribeToCallStatus(signal.callId);

          navigate('IncomingCall', {
            callId: signal.callId,
            callerId: signal.callerId,
            callerName: signal.callerName,
            callType: signal.callType,
            channelName: signal.channelName,
            propertyId: signal.propertyId,
          });
          break;
        }
        case 'CALL_END':
        case 'CALL_CANCEL':
        case 'CALL_MISSED':
        case 'CALL_REJECTED':
        case 'USER_BUSY':
          if (signal.callId === callIdRef.current) {
            leaveChannel();
            resetCallState();
          }
          break;
        case 'CALL_ACCEPTED':
          // Status subscription already moves caller to CONNECTED
          break;
        default:
          console.warn('[CallContext] Unknown signal type:', signal.type);
      }
    },
    [leaveChannel, resetCallState, subscribeToCallStatus, updateCallState]
  );

  // Signaling lifecycle: follows the logged-in user
  useEffect(() => {
    if (!userId) return undefined;

    let cancelled = false;
    userIdRef.current = String(userId);
    uidRef.current = userIdToUid(userIdRef.current);

    (async () => {
      try {
        const ok = await callSignaling.initialize(userIdRef.current);
        if (!ok) {
          console.warn('[CallContext][SIGNALING] init failed');
          return;
        }
        if (cancelled) return;
        incomingUnsubRef.current = callSignaling.listenForIncomingCalls(handleSignalingMessage);
        setIsSignalingReady(true);
        console.log('[CallContext][SIGNALING] ready for user', userIdRef.current);
      } catch (e) {
        console.error('[CallContext][SIGNALING] init error:', e);
      }
    })();

    return () => {
      cancelled = true;
      setIsSignalingReady(false);
      if (incomingUnsubRef.current) {
        incomingUnsubRef.current();
        incomingUnsubRef.current = null;
      }
      if (statusUnsubRef.current) {
        statusUnsubRef.current();
        statusUnsubRef.current = null;
      }
      callSignaling.destroy?.();
    };
  }, [userId, handleSignalingMessage]);

  // ==================== CHANNEL ====================
  const joinChannel = useCallback(async (requestedChannel) => {
    if (!agoraEngineRef.current) throw new Error('Engine not initialized');

    const effectiveChannel = USE_FIXED_TEST_CHANNEL ? FIXED_TEST_CHANNEL : requestedChannel;

    await agoraEngineRef.current.muteLocalAudioStream(false);

    const joinOptions = {
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      publishMicrophoneTrack: true,
      autoSubscribeAudio: true,
    };
    if (callTypeRef.current === CALL_TYPES.VIDEO) {
      joinOptions.publishCameraTrack = true;
      joinOptions.autoSubscribeVideo = true;
    }

    console.log('[CallContext][JOIN]', { effectiveChannel, uid: uidRef.current, joinOptions });
    agoraEngineRef.current.joinChannel(AGORA_TOKEN, effectiveChannel, uidRef.current, joinOptions);
    channelRef.current = effectiveChannel;
    setChannelName(effectiveChannel);

    try {
      await agoraEngineRef.current.enableAudio();
      await agoraEngineRef.current.setEnableSpeakerphone(true);
      await agoraEngineRef.current.muteLocalAudioStream(false);
    } catch (e) {
      console.error('[CallContext][JOIN] post-join audio config error:', e);
    }
  }, []);

  // ==================== PUBLIC ACTIONS ====================
  const startCall = useCallback(
    async (targetUserId, type, callerName, receiverName = '', propertyId = null) => {
      if (callStateRef.current !== CALL_STATES.IDLE) {
        return { success: false, error: 'Already in a call' };
      }
      if (!agoraEngineRef.current) {
        return { success: false, error: 'Agora engine not initialized' };
      }

      remoteUserIdRef.current = String(targetUserId);
      callTypeRef.current = type;
      setRemoteUserId(remoteUserIdRef.current);
      setCallType(type);
      updateCallState(CALL_STATES.CALLING);

      try {
        const callInfo = await callSignaling.sendCallInvitation({
          callerId: userIdRef.current,
          callerName,
          receiverId: remoteUserIdRef.current,
          receiverName,
          callType: type,
          propertyId,
        });

        callIdRef.current = callInfo.callId;
        channelRef.current = callInfo.channelName;

        await joinChannel(callInfo.channelName);
        subscribeToCallStatus(callInfo.callId);

        return { success: true, channelName: callInfo.channelName, callId: callInfo.callId };
      } catch (error) {
        console.error('[CallContext][START_CALL] error:', error);
        await leaveChannel();
        updateCallState(CALL_STATES.FAILED);
        resetCallState();
        return { success: false, error: error.message };
      }
    },
    [joinChannel, leaveChannel, resetCallState, subscribeToCallStatus, updateCallState]
  );

  const acceptCall = useCallback(
    async (callId, channel, callerId, type) => {
      if (callStateRef.current !== CALL_STATES.INCOMING) {
        return { success: false, error: 'No incoming call to accept' };
      }

      channelRef.current = channel;
      remoteUserIdRef.current = callerId;
      callTypeRef.current = type;
      setChannelName(channel);
      setRemoteUserId(callerId);
      setCallType(type);
      updateCallState(CALL_STATES.CONNECTING);

      try {
        await callSignaling.acceptCall(callId, userIdRef.current);
        await joinChannel(channel);
        updateCallState(CALL_STATES.CONNECTED);
        return { success: true };
      } catch (error) {
        console.error('[CallContext][ACCEPT] error:', error);
        await leaveChannel();
        updateCallState(CALL_STATES.FAILED);
        resetCallState();
        return { success: false, error: error.message };
      }
    },
    [joinChannel, leaveChannel, resetCallState, updateCallState]
  );

  const rejectCall = useCallback(
    async (callId, reason = 'Call rejected') => {
      if (callStateRef.current !== CALL_STATES.INCOMING) return;
      try {
        await callSignaling.rejectCall(callId, userIdRef.current, reason);
      } catch (e) {
        console.error('[CallContext] reject error:', e);
      }
      resetCallState();
    },
    [resetCallState]
  );

  const endCall = useCallback(async () => {
    if (callStateRef.current === CALL_STATES.IDLE) return;
    const callId = callIdRef.current;
    try {
      if (callId) await callSignaling.endCall(callId, userIdRef.current);
    } catch (e) {
      console.error('[CallContext][END_CALL] signaling error:', e);
    }
    await leaveChannel();
    resetCallState();
  }, [leaveChannel, resetCallState]);

  const cancelCall = useCallback(async () => {
    if (callStateRef.current !== CALL_STATES.CALLING) return;
    try {
      if (callIdRef.current) callSignaling.cancelCall(callIdRef.current, userIdRef.current);
    } catch (e) {
      console.error('[CallContext] cancel error:', e);
    }
    await leaveChannel();
    resetCallState();
  }, [leaveChannel, resetCallState]);

  const toggleAudio = useCallback(async () => {
    if (!agoraEngineRef.current) return;
    const nextMuted = !mutedRef.current;
    await agoraEngineRef.current.muteLocalAudioStream(nextMuted);
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
  }, []);

  const toggleVideo = useCallback(async () => {
    if (!agoraEngineRef.current) return;
    const nextOff = !videoOffRef.current;
    await agoraEngineRef.current.muteLocalVideoStream(nextOff);
    videoOffRef.current = nextOff;
    setIsVideoOff(nextOff);
  }, []);

  const switchCamera = useCallback(async () => {
    await agoraEngineRef.current?.switchCamera();
  }, []);

  const setSpeakerphone = useCallback(async (enabled) => {
    await agoraEngineRef.current?.setEnableSpeakerphone(enabled);
  }, []);

  // ==================== CONTEXT VALUE ====================
  const isReady = isEngineReady && isSignalingReady;

  const value = useMemo(
    () => ({
      // state
      isReady,
      isJoined,
      message,
      callState,
      callType,
      channelName,
      remoteUserId,
      remoteUid,
      remoteVideoReady,
      isMuted,
      isVideoOff,
      connectionState,
      connectedAt,
      currentUserUid: uidRef.current,
      // actions
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      cancelCall,
      joinChannel,
      leaveChannel,
      toggleAudio,
      toggleVideo,
      switchCamera,
      setSpeakerphone,
      resetCallState,
    }),
    [
      isReady,
      isJoined,
      message,
      callState,
      callType,
      channelName,
      remoteUserId,
      remoteUid,
      remoteVideoReady,
      isMuted,
      isVideoOff,
      connectionState,
      connectedAt,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      cancelCall,
      joinChannel,
      leaveChannel,
      toggleAudio,
      toggleVideo,
      switchCamera,
      setSpeakerphone,
      resetCallState,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export default CallContext;