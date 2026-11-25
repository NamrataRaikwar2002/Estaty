/**
 * Call Context - React Context for managing call state
 * Replaces module-level state in agoraRTCService with React state
 * Follows Agora's official React Native example pattern
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import agoraRTCService from '../services/agoraRTCService';

// ==================== CALL STATES ====================
export const CALL_STATES = {
  IDLE: 'idle',
  CALLING: 'calling',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
};

// ==================== CALL TYPES ====================
export const CALL_TYPES = {
  AUDIO: 'audio',
  VIDEO: 'video',
};

// ==================== DEFAULT VALUES ====================
const DEFAULT_CALL_STATE = {
  callState: CALL_STATES.IDLE,
  callType: null,
  remoteUserId: null,
  remoteUid: null, // Numeric Agora UID from UserJoined callback
  currentChannel: null,
  activeCallId: null,
  localVideoEnabled: true,
  localAudioEnabled: true,
  connectionQuality: 'good',
  callDuration: 0,
  isMuted: false,
  isVideoOff: false,
  remoteVideoReady: false,
};

// ==================== CONTEXT ====================
const CallContext = createContext(null);

// Module-level refs to store setter functions for external access (e.g., from Agora service)
// These are set when CallProvider mounts
let externalSetters = null;

/**
 * Register external setter functions for use by Agora service
 * Called by Agora service after initialization
 * @param {Object} setters - Object containing setter functions
 */
export const registerCallContextSetters = (setters) => {
  externalSetters = setters;
  console.log('[CallContext] External setters registered');
};

/**
 * Get registered external setters
 * @returns {Object|null} Registered setters or null if not registered
 */
export const getCallContextSetters = () => externalSetters;

/**
 * Call Provider Component
 * Wraps the app (or call-related screens) to provide call state
 */
export const CallProvider = ({ children }) => {
  // Call state
  const [callState, setCallState] = useState(DEFAULT_CALL_STATE.callState);
  const [callType, setCallType] = useState(DEFAULT_CALL_STATE.callType);
  const [remoteUserId, setRemoteUserId] = useState(DEFAULT_CALL_STATE.remoteUserId);
  const [remoteUid, setRemoteUid] = useState(DEFAULT_CALL_STATE.remoteUid);
  const [currentChannel, setCurrentChannel] = useState(DEFAULT_CALL_STATE.currentChannel);
  const [activeCallId, setActiveCallId] = useState(DEFAULT_CALL_STATE.activeCallId);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(DEFAULT_CALL_STATE.localVideoEnabled);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(DEFAULT_CALL_STATE.localAudioEnabled);
  const [connectionQuality, setConnectionQuality] = useState(DEFAULT_CALL_STATE.connectionQuality);
  const [callDuration, setCallDuration] = useState(DEFAULT_CALL_STATE.callDuration);
  const [isMuted, setIsMuted] = useState(DEFAULT_CALL_STATE.isMuted);
  const [isVideoOff, setIsVideoOff] = useState(DEFAULT_CALL_STATE.isVideoOff);
  const [remoteVideoReady, setRemoteVideoReady] = useState(DEFAULT_CALL_STATE.remoteVideoReady);

  // Timer refs
  const durationTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, []);

  // ==================== STATE SETTERS ====================

  const updateCallState = useCallback((newState) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] callState:', callState, '→', newState);
    setCallState(newState);
  }, [callState]);

  const updateCallType = useCallback((type) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] callType:', callType, '→', type);
    setCallType(type);
  }, [callType]);

  const updateRemoteUserId = useCallback((userId) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] remoteUserId:', remoteUserId, '→', userId);
    setRemoteUserId(userId);
  }, [remoteUserId]);

  const updateRemoteUid = useCallback((uid) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] *** remoteUid UPDATED ***', remoteUid, '→', uid);
    setRemoteUid(uid);
    setRemoteVideoReady(true);
  }, [remoteUid]);

  const updateCurrentChannel = useCallback((channel) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] currentChannel:', currentChannel, '→', channel);
    setCurrentChannel(channel);
  }, [currentChannel]);

  const updateActiveCallId = useCallback((callId) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] activeCallId:', activeCallId, '→', callId);
    setActiveCallId(callId);
  }, [activeCallId]);

  const updateLocalVideoEnabled = useCallback((enabled) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] localVideoEnabled:', localVideoEnabled, '→', enabled);
    setLocalVideoEnabled(enabled);
    setIsVideoOff(!enabled);
  }, [localVideoEnabled]);

  const updateLocalAudioEnabled = useCallback((enabled) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] localAudioEnabled:', localAudioEnabled, '→', enabled);
    setLocalAudioEnabled(enabled);
    setIsMuted(!enabled);
  }, [localAudioEnabled]);

  const updateConnectionQuality = useCallback((quality) => {
    if (!isMountedRef.current) return;
    setConnectionQuality(quality);
  }, []);

  const updateRemoteVideoReady = useCallback((ready) => {
    if (!isMountedRef.current) return;
    console.log('[CallContext] remoteVideoReady:', remoteVideoReady, '→', ready);
    setRemoteVideoReady(ready);
  }, [remoteVideoReady]);

  // ==================== DURATION TIMER ====================
  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
    }
    setCallDuration(0);
    durationTimerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setCallDuration(prev => prev + 1);
      }
    }, 1000);
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ==================== RESET ====================
  const resetCallState = useCallback(() => {
    console.log('[CallContext] Resetting call state to IDLE');
    stopDurationTimer();
    setCallState(CALL_STATES.IDLE);
    setCallType(null);
    setRemoteUserId(null);
    setRemoteUid(null);
    setCurrentChannel(null);
    setActiveCallId(null);
    setLocalVideoEnabled(true);
    setLocalAudioEnabled(true);
    setConnectionQuality('good');
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setRemoteVideoReady(false);
  }, [stopDurationTimer]);

  // ==================== REGISTER SETTERS FOR EXTERNAL ACCESS ====================
  useEffect(() => {
    const setters = {
      setCallState: updateCallState,
      setCallType: updateCallType,
      setRemoteUserId: updateRemoteUserId,
      setRemoteUid: updateRemoteUid,
      setCurrentChannel: updateCurrentChannel,
      setActiveCallId: updateActiveCallId,
      setLocalVideoEnabled: updateLocalVideoEnabled,
      setLocalAudioEnabled: updateLocalAudioEnabled,
      setConnectionQuality: updateConnectionQuality,
      setRemoteVideoReady: updateRemoteVideoReady,
      startDurationTimer,
      stopDurationTimer,
      resetCallState,
    };
    registerCallContextSetters(setters);

    return () => {
      registerCallContextSetters(null);
    };
  }, [
    updateCallState,
    updateCallType,
    updateRemoteUserId,
    updateRemoteUid,
    updateCurrentChannel,
    updateActiveCallId,
    updateLocalVideoEnabled,
    updateLocalAudioEnabled,
    updateConnectionQuality,
    updateRemoteVideoReady,
    startDurationTimer,
    stopDurationTimer,
    resetCallState,
  ]);

  // ==================== CONTEXT VALUE ====================
  const contextValue = {
    // State
    callState,
    callType,
    remoteUserId,
    remoteUid,
    currentChannel,
    activeCallId,
    localVideoEnabled,
    localAudioEnabled,
    connectionQuality,
    callDuration,
    isMuted,
    isVideoOff,
    remoteVideoReady,

    // Setters
    setCallState: updateCallState,
    setCallType: updateCallType,
    setRemoteUserId: updateRemoteUserId,
    setRemoteUid: updateRemoteUid,
    setCurrentChannel: updateCurrentChannel,
    setActiveCallId: updateActiveCallId,
    setLocalVideoEnabled: updateLocalVideoEnabled,
    setLocalAudioEnabled: updateLocalAudioEnabled,
    setConnectionQuality: updateConnectionQuality,
    setRemoteVideoReady: updateRemoteVideoReady,

    // Actions
    startDurationTimer,
    stopDurationTimer,
    resetCallState,
    // Function to end call - will be implemented by screens using agoraService
    endCall: () => agoraRTCService.endCall(),
    toggleAudio: () => agoraRTCService.toggleAudio(),
    toggleVideo: () => agoraRTCService.toggleVideo(),
    switchCamera: () => agoraRTCService.switchCamera(),
    setSpeakerphone: (enabled) => agoraRTCService.setSpeakerphone(enabled),

    // Constants
    CALL_STATES,
    CALL_TYPES,
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
};

/**
 * Custom hook to access call context
 * @returns {Object} Call context value
 * @throws Error if used outside CallProvider
 */
export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export default CallContext;