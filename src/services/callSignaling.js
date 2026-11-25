/**
 * Firebase Realtime Database Call Signaling Service
 *
 * Replaces Agora RTM with Firebase Realtime Database for real-time call signaling.
 * Uses Realtime Database listeners for cross-device signaling.
 *
 * SECURITY:
 * - All call data is protected by Realtime Database Security Rules
 * - Users can only read/write calls they are part of (callerId or receiverId matches auth.uid)
 * - No service-account credentials or private keys in the mobile app
 * - Uses ESTATY's existing authentication (AsyncStorage user session), NOT Firebase Auth
 *
 * DATA MODEL (in Realtime Database):
 * /calls/{callId}
 * {
 *   callId: string,
 *   callerId: string,
 *   receiverId: string,
 *   propertyId: string (optional),
 *   callType: 'audio' | 'video',
 *   channelName: string,  // Agora RTC channel name
 *   status: 'initiated' | 'ringing' | 'accepted' | 'rejected' | 'busy' | 'ended' | 'missed' | 'cancelled',
 *   callerName: string,
 *   receiverName: string (optional),
 *   createdAt: timestamp (ms),
 *   updatedAt: timestamp (ms),
 *   answeredAt: timestamp (ms) (optional),
 *   endedAt: timestamp (ms) (optional),
 * }
 *
 * /userCalls/{userId}/{callId} - Index for efficient incoming call queries
 * {
 *   callId: string,
 *   status: string,
 *   callerId: string,
 *   createdAt: timestamp (ms),
 * }
 */

import { ref, set, update, get, onValue, off, query, orderByChild, runTransaction } from 'firebase/database';
import { rtdb } from './firebaseConfig';
import { CALL_CHANNEL_PREFIX } from './agoraRTCService';
import Config from 'react-native-config';

// ==================== CONSTANTS ====================
const CALLS_PATH = 'calls';
const USER_CALLS_PATH = 'userCalls';
const CALL_TIMEOUT_MS = 30000; // 30 seconds for call timeout

// Call status enum
export const CALL_STATUS = {
  INITIATED: 'initiated',
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  BUSY: 'busy',
  ENDED: 'ended',
  MISSED: 'missed',
  CANCELLED: 'cancelled',
};

// ==================== DIAGNOSTIC HELPERS ====================
const getTimestamp = () => Date.now();
const logTiming = (label, startTime) => {
  const elapsed = getTimestamp() - startTime;
  console.log(`[CallSignaling][TIMING] ${label}: ${elapsed}ms`);
};

const logNetworkInfo = () => {
  console.log('[CallSignaling][NETWORK] Firebase Database URL:', Config.FIREBASE_DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('[CallSignaling][NETWORK] Firebase Project ID:', Config.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
};

// ==================== CALL SIGNALING CLASS ====================

class CallSignaling {
  constructor() {
    this.currentUserId = null;
    this.listeners = new Map(); // callId -> unsubscribe function
    this.incomingCallListeners = new Set(); // callbacks for incoming calls
    this.callStatusListeners = new Map(); // callId -> Set of callbacks
    this.activeCallId = null;
    this.isInitialized = false;
    this.userCallsListener = null; // Listener for user's incoming calls
    this.userCallsQuery = null;
  }

  /**
   * Initialize signaling for a user
   * @param {string} userId - Current user's unique ID (from ESTATY auth)
   * @returns {Promise<boolean>} Success status
   */
  async initialize(userId) {
    const initStart = getTimestamp();
    console.log('[CallSignaling][INIT] Starting initialization for user:', userId);
    logNetworkInfo();

    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[CallSignaling][INIT] Already initialized for this user');
      return true;
    }

    this.currentUserId = String(userId);
    this.isInitialized = true;

    // Subscribe to incoming calls for this user
    await this.subscribeToIncomingCalls();

    logTiming('initialize total', initStart);
    console.log('[CallSignaling][INIT] Initialized for user:', this.currentUserId);
    return true;
  }

  /**
   * Subscribe to incoming calls for the current user
   * Uses Realtime Database listener on userCalls/{userId} where status is 'initiated' or 'ringing'
   */
  async subscribeToIncomingCalls() {
    const subStart = getTimestamp();
    if (!this.currentUserId) return;

    console.log('[CallSignaling][SUBSCRIBE] Subscribing to incoming calls for user:', this.currentUserId);
    logNetworkInfo();

    // Clean up existing listener
    if (this.userCallsListener && this.userCallsQuery) {
      off(this.userCallsQuery, 'value', this.userCallsListener);
      this.userCallsListener = null;
      this.userCallsQuery = null;
    }

    // Query userCalls for this user where status is initiated or ringing
    // We'll filter in the listener since Realtime Database doesn't support 'in' queries easily
    const userCallsRef = ref(rtdb, `${USER_CALLS_PATH}/${this.currentUserId}`);
    console.log('[CallSignaling][SUBSCRIBE] Reference path:', `${USER_CALLS_PATH}/${this.currentUserId}`);
    this.userCallsQuery = query(userCallsRef, orderByChild('status'));

    this.userCallsListener = (snapshot) => {
      const listenerStart = getTimestamp();
      console.log('[CallSignaling][SUBSCRIBE] userCalls listener triggered, snapshot exists:', snapshot.exists(), 'keys:', snapshot.exists() ? Object.keys(snapshot.val() || {}) : []);
      const data = snapshot.val();
      if (!data) {
        console.log('[CallSignaling][SUBSCRIBE] No data in userCalls snapshot');
        return;
      }

      console.log('[CallSignaling][SUBSCRIBE] userCalls data:', data);

      // Process each call in the userCalls index
      Object.entries(data).forEach(([, callIndex]) => {
        console.log('[CallSignaling][SUBSCRIBE] Processing callIndex:', callIndex);
        // Only process initiated or ringing calls
        if (callIndex.status === CALL_STATUS.INITIATED || callIndex.status === CALL_STATUS.RINGING) {
          console.log('[CallSignaling][SUBSCRIBE] Found incoming call:', callIndex.callId);
          // Fetch full call data from /calls/{callId}
          this.fetchAndHandleIncomingCall(callIndex.callId);
        }
      });
      logTiming('userCalls listener processing', listenerStart);
    };

    onValue(this.userCallsQuery, this.userCallsListener, (error) => {
      console.error('[CallSignaling][SUBSCRIBE] Incoming calls listener error:', error, 'code:', error?.code);
    });
    logTiming('subscribeToIncomingCalls setup', subStart);
  }

  /**
   * Fetch full call data and handle as incoming call
   */
  async fetchAndHandleIncomingCall(callId) {
    const fetchStart = getTimestamp();
    console.log('[CallSignaling][FETCH] fetchAndHandleIncomingCall:', callId);
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      const getStart = getTimestamp();
      const snapshot = await get(callRef);
      logTiming('fetchAndHandleIncomingCall get', getStart);
      if (snapshot.exists()) {
        const callData = { ...snapshot.val(), id: callId };
        this.handleIncomingCall(callData);
      } else {
        console.log('[CallSignaling][FETCH] Call document not found:', callId);
      }
      logTiming('fetchAndHandleIncomingCall total', fetchStart);
    } catch (error) {
      logTiming('fetchAndHandleIncomingCall FAILED', fetchStart);
      console.error('[CallSignaling][FETCH] Fetch incoming call error:', error, 'code:', error?.code, 'message:', error?.message);
    }
  }

  /**
   * Handle incoming call from Realtime Database listener
   */
  handleIncomingCall(callData) {
    const handleStart = getTimestamp();
    console.log('[CallSignaling][HANDLE] Incoming call received:', callData.callId, 'caller:', callData.callerId);

    // Notify all incoming call listeners
    this.incomingCallListeners.forEach((callback) => {
      if (typeof callback !== 'function') {
        console.error('[CallSignaling][HANDLE] Skipping non-function listener:', callback);
        return;
      }
      try {
        callback({
          type: 'CALL_INVITE',
          callId: callData.callId,
          callerId: callData.callerId,
          callerName: callData.callerName,
          callType: callData.callType,
          channelName: callData.channelName,
          propertyId: callData.propertyId,
        });
      } catch (error) {
        console.error('[CallSignaling][HANDLE] Error in incoming call callback:', error);
      }
    });
    logTiming('handleIncomingCall notify', handleStart);
  }

  /**
   * Handle call status change from Realtime Database listener
   */
  handleCallStatusChange(callData) {
    console.log('[CallSignaling] Call status changed:', callData.callId, '->', callData.status);

    // Notify call-specific status listeners
    if (this.callStatusListeners.has(callData.callId)) {
      this.callStatusListeners.get(callData.callId).forEach((callback) => {
        if (typeof callback !== 'function') {
          console.error('[CallSignaling] Skipping non-function status listener:', callback);
          return;
        }
        try {
          callback(callData);
        } catch (error) {
          console.error('[CallSignaling] Error in call status callback:', error);
        }
      });
    }

    // Handle specific statuses
    switch (callData.status) {
      case CALL_STATUS.ACCEPTED:
        this.notifyCallAccepted(callData);
        break;
      case CALL_STATUS.REJECTED:
        this.notifyCallRejected(callData);
        break;
      case CALL_STATUS.BUSY:
        this.notifyUserBusy(callData);
        break;
      case CALL_STATUS.ENDED:
        this.notifyCallEnded(callData);
        break;
      case CALL_STATUS.CANCELLED:
        this.notifyCallCancelled(callData);
        break;
      case CALL_STATUS.MISSED:
        this.notifyMissedCall(callData);
        break;
    }
  }

  /**
   * Notify call accepted
   */
  notifyCallAccepted(callData) {
    if (callData.callerId === this.currentUserId) {
      // We are the caller, call was accepted
      this.incomingCallListeners.forEach((callback) => {
        if (typeof callback !== 'function') return;
        try {
          callback({
            type: 'CALL_ACCEPTED',
            callId: callData.callId,
            channelName: callData.channelName,
            from: callData.receiverId,
          });
        } catch (error) {
          console.error('[CallSignaling] Error in call accepted callback:', error);
        }
      });
    }
  }

  /**
   * Notify call rejected
   */
  notifyCallRejected(callData) {
    if (callData.callerId === this.currentUserId) {
      this.incomingCallListeners.forEach((callback) => {
        if (typeof callback !== 'function') return;
        try {
          callback({
            type: 'CALL_REJECTED',
            callId: callData.callId,
            from: callData.receiverId,
            reason: callData.rejectReason || 'Call rejected',
          });
        } catch (error) {
          console.error('[CallSignaling] Error in call rejected callback:', error);
        }
      });
    }
  }

  /**
   * Notify user busy
   */
  notifyUserBusy(callData) {
    if (callData.callerId === this.currentUserId) {
      this.incomingCallListeners.forEach((callback) => {
        if (typeof callback !== 'function') return;
        try {
          callback({
            type: 'USER_BUSY',
            callId: callData.callId,
            from: callData.receiverId,
          });
        } catch (error) {
          console.error('[CallSignaling] Error in user busy callback:', error);
        }
      });
    }
  }

  /**
   * Notify call ended
   */
  notifyCallEnded(callData) {
    this.incomingCallListeners.forEach((callback) => {
      if (typeof callback !== 'function') return;
      try {
        callback({
          type: 'CALL_END',
          callId: callData.callId,
          from: callData.callerId === this.currentUserId ? callData.receiverId : callData.callerId,
        });
      } catch (error) {
        console.error('[CallSignaling] Error in call ended callback:', error);
      }
    });
  }

  /**
   * Notify call cancelled
   */
  notifyCallCancelled(callData) {
    if (callData.receiverId === this.currentUserId) {
      this.incomingCallListeners.forEach((callback) => {
        if (typeof callback !== 'function') return;
        try {
          callback({
            type: 'CALL_CANCEL',
            callId: callData.callId,
            from: callData.callerId,
          });
        } catch (error) {
          console.error('[CallSignaling] Error in call cancelled callback:', error);
        }
      });
    }
  }

  /**
   * Notify missed call
   */
  notifyMissedCall(callData) {
    if (callData.receiverId === this.currentUserId) {
      this.incomingCallListeners.forEach((callback) => {
        if (typeof callback !== 'function') return;
        try {
          callback({
            type: 'CALL_MISSED',
            callId: callData.callId,
            from: callData.callerId,
          });
        } catch (error) {
          console.error('[CallSignaling] Error in missed call callback:', error);
        }
      });
    }
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * 1. sendCallInvitation - Send a new call invitation to a user
   * Creates call document in /calls and indexes in /userCalls/{receiverId}
   * Uses transaction for atomic creation to prevent duplicate invitations
   * @param {Object} params - Call parameters
   * @param {string} params.callerId - Caller's user ID
   * @param {string} params.callerName - Caller's display name
   * @param {string} params.receiverId - Receiver's user ID
   * @param {string} params.receiverName - Receiver's display name (optional)
   * @param {string} params.callType - 'audio' or 'video'
   * @param {string} params.propertyId - Property ID (optional)
   * @returns {Promise<Object>} Call info with callId and channelName
   */
  async sendCallInvitation(params) {
    const inviteStart = getTimestamp();
    const {
      callerId,
      callerName,
      receiverId,
      receiverName,
      callType,
      propertyId,
    } = params;

    console.log('[CallSignaling][SEND] sendCallInvitation called:', { callerId, callerName, receiverId, receiverName, callType, propertyId });
    logNetworkInfo();

    // Generate unique callId
    const callId = `${CALL_CHANNEL_PREFIX}${callerId}_${receiverId}_${Date.now()}`;
    const channelName = callId;
    const now = Date.now();

    const callData = {
      callId,
      callerId,
      callerName,
      receiverId,
      receiverName: receiverName || '',
      callType,
      channelName,
      propertyId: propertyId || null,
      status: CALL_STATUS.INITIATED,
      createdAt: now,
      updatedAt: now,
    };

    // User call index data
    const userCallIndex = {
      callId,
      status: CALL_STATUS.INITIATED,
      callerId,
      createdAt: now,
    };

    try {
      console.log('[CallSignaling][SEND] Writing to /calls/' + callId);
      const writeCallStart = getTimestamp();
      // Use transaction for atomic write to prevent duplicate invitations
      // Write to /calls/{callId} first
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      await set(callRef, callData);
      logTiming('write /calls', writeCallStart);
      console.log('[CallSignaling][SEND] Call document written');

      // Then write to /userCalls/{receiverId}/{callId} for incoming call queries
      console.log('[CallSignaling][SEND] Writing to /userCalls/' + receiverId + '/' + callId);
      const writeReceiverStart = getTimestamp();
      const userCallRef = ref(rtdb, `${USER_CALLS_PATH}/${receiverId}/${callId}`);
      await set(userCallRef, userCallIndex);
      logTiming('write /userCalls/receiver', writeReceiverStart);
      console.log('[CallSignaling][SEND] Receiver index written');

      // Also index for caller (for their call history)
      console.log('[CallSignaling][SEND] Writing to /userCalls/' + callerId + '/' + callId);
      const writeCallerStart = getTimestamp();
      const callerCallRef = ref(rtdb, `${USER_CALLS_PATH}/${callerId}/${callId}`);
      await set(callerCallRef, {
        ...userCallIndex,
        receiverId,
      });
      logTiming('write /userCalls/caller', writeCallerStart);
      console.log('[CallSignaling][SEND] Caller index written');

      // Update status to ringing after a brief moment
      setTimeout(async () => {
        console.log('[CallSignaling][SEND] Updating status to RINGING for:', callId);
        await this.updateCallStatus(callId, CALL_STATUS.RINGING);
      }, 500);

      // Set timeout for missed call (30 seconds)
      setTimeout(async () => {
        try {
          const callSnap = await get(ref(rtdb, `${CALLS_PATH}/${callId}`));
          if (callSnap.exists()) {
            const data = callSnap.val();
            console.log('[CallSignaling][SEND] Missed call timeout check:', { callId, currentStatus: data.status, expected: CALL_STATUS.RINGING });
            if (data.status === CALL_STATUS.RINGING) {
              console.log('[CallSignaling][SEND] Timeout - marking as MISSED:', callId);
              await this.updateCallStatus(callId, CALL_STATUS.MISSED);
            } else {
              console.log('[CallSignaling][SEND] Timeout - call no longer RINGING, skipping MISSED:', callId, 'status:', data.status);
            }
          } else {
            console.log('[CallSignaling][SEND] Timeout - call not found:', callId);
          }
        } catch (error) {
          console.error('[CallSignaling][SEND] Missed call timeout error:', error);
        }
      }, CALL_TIMEOUT_MS);

      logTiming('sendCallInvitation total', inviteStart);
      console.log('[CallSignaling][SEND] Call invitation sent:', callId);
      return { callId, channelName, ...callData };
    } catch (error) {
      logTiming('sendCallInvitation FAILED', inviteStart);
      console.error('[CallSignaling][SEND] Send call invitation error:', error, 'code:', error?.code, 'message:', error?.message);
      throw error;
    }
  }

  /**
   * 2. listenForIncomingCalls - Register listener for incoming calls
   * @param {Function} callback - Callback function(signal)
   * @returns {Function} Unsubscribe function
   */
  listenForIncomingCalls(callback) {
    if (typeof callback !== 'function') {
      console.error('[CallSignaling] listenForIncomingCalls called with non-function:', callback);
      return () => {};
    }
    this.incomingCallListeners.add(callback);
    return () => this.incomingCallListeners.delete(callback);
  }

  /**
   * 3. acceptCall - Accept an incoming call
   * Uses transaction for atomic status update to prevent race conditions
   * @param {string} callId - Call ID
   * @param {string} receiverId - Receiver's user ID
   * @returns {Promise<Object>} Call data with channelName
   */
  async acceptCall(callId, receiverId) {
    const acceptStart = getTimestamp();
    console.log('[CallSignaling][ACCEPT] acceptCall called:', { callId, receiverId });
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);

      // Use transaction to atomically check and update status
      const txStart = getTimestamp();
      const result = await runTransaction(callRef, (currentData) => {
        console.log('[CallSignaling][ACCEPT][TX] Transaction running, currentData:', currentData);

        if (!currentData) {
          console.log('[CallSignaling][ACCEPT][TX] ABORT: Call not found (currentData is null)');
          return; // Abort transaction - call not found
        }

        console.log('[CallSignaling][ACCEPT][TX] Checking receiverId:', {
          expected: receiverId,
          actual: currentData.receiverId,
          match: currentData.receiverId === receiverId
        });

        // Verify this user is the receiver
        if (currentData.receiverId !== receiverId) {
          console.log('[CallSignaling][ACCEPT][TX] ABORT: Not authorized - receiverId mismatch');
          return; // Abort transaction - not authorized
        }

        console.log('[CallSignaling][ACCEPT][TX] Checking status:', {
          current: currentData.status,
          allowed: [CALL_STATUS.RINGING, CALL_STATUS.INITIATED],
          isAllowed: currentData.status === CALL_STATUS.RINGING || currentData.status === CALL_STATUS.INITIATED
        });

        // Verify call is still ringing or initiated
        if (currentData.status !== CALL_STATUS.RINGING && currentData.status !== CALL_STATUS.INITIATED) {
          console.log('[CallSignaling][ACCEPT][TX] ABORT: Wrong status - cannot accept');
          return; // Abort transaction - cannot accept
        }

        // Update status to accepted
        currentData.status = CALL_STATUS.ACCEPTED;
        currentData.updatedAt = Date.now();
        currentData.answeredAt = Date.now();
        console.log('[CallSignaling][ACCEPT][TX] SUCCESS: Updated to ACCEPTED');
        return currentData;
      });
      logTiming('acceptCall transaction', txStart);

      console.log('[CallSignaling][ACCEPT] Transaction result:', { committed: result.committed, snapshot: result.snapshot?.val() });

      if (!result.committed) {
        throw new Error('Call cannot be accepted (not found, not authorized, or wrong status)');
      }

      // Verify the status was actually updated
      const verifySnap = await get(callRef);
      if (verifySnap.exists()) {
        console.log('[CallSignaling][ACCEPT] Post-transaction status:', verifySnap.val().status);
      }

      // Also update userCalls index
      const updateStart = getTimestamp();
      await update(ref(rtdb, `${USER_CALLS_PATH}/${receiverId}/${callId}`), {
        status: CALL_STATUS.ACCEPTED,
        updatedAt: Date.now(),
      });
      logTiming('acceptCall userCalls update', updateStart);

      // Fetch updated call data
      const getStart = getTimestamp();
      const callSnap = await get(callRef);
      logTiming('acceptCall get call data', getStart);
      const callData = callSnap.val();

      logTiming('acceptCall total', acceptStart);
      return {
        callId,
        channelName: callData.channelName,
        callerId: callData.callerId,
        callType: callData.callType,
      };
    } catch (error) {
      logTiming('acceptCall FAILED', acceptStart);
      console.error('[CallSignaling][ACCEPT] Accept call error:', error, 'code:', error?.code, 'message:', error?.message);
      throw error;
    }
  }

  /**
   * 4. rejectCall - Reject an incoming call
   * Uses transaction for atomic status update
   * @param {string} callId - Call ID
   * @param {string} receiverId - Receiver's user ID
   * @param {string} reason - Rejection reason
   */
  async rejectCall(callId, receiverId, reason = 'Call rejected') {
    const rejectStart = getTimestamp();
    console.log('[CallSignaling][REJECT] rejectCall called:', { callId, receiverId });
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);

      const txStart = getTimestamp();
      const result = await runTransaction(callRef, (currentData) => {
        if (!currentData) return;
        if (currentData.receiverId !== receiverId) return;
        if (currentData.status !== CALL_STATUS.RINGING && currentData.status !== CALL_STATUS.INITIATED) return;

        currentData.status = CALL_STATUS.REJECTED;
        currentData.updatedAt = Date.now();
        currentData.endedAt = Date.now();
        currentData.rejectReason = reason;
        return currentData;
      });
      logTiming('rejectCall transaction', txStart);

      if (!result.committed) {
        throw new Error('Call cannot be rejected (not found, not authorized, or wrong status)');
      }

      // Update userCalls index
      const updateStart = getTimestamp();
      await update(ref(rtdb, `${USER_CALLS_PATH}/${receiverId}/${callId}`), {
        status: CALL_STATUS.REJECTED,
        updatedAt: Date.now(),
      });
      logTiming('rejectCall userCalls update', updateStart);

      logTiming('rejectCall total', rejectStart);
    } catch (error) {
      logTiming('rejectCall FAILED', rejectStart);
      console.error('[CallSignaling][REJECT] Reject call error:', error, 'code:', error?.code, 'message:', error?.message);
      throw error;
    }
  }

  /**
   * 5. endCall - End an active call
   * Uses transaction for atomic status update
   * @param {string} callId - Call ID
   * @param {string} userId - User ending the call (caller or receiver)
   */
  async endCall(callId, userId) {
    console.log('[CallSignaling][END_CALL] endCall called:', { callId, userId });
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);

      const result = await runTransaction(callRef, (currentData) => {
        console.log('[CallSignaling][END_CALL][TX] Transaction running:', {
          hasData: !!currentData,
          callerId: currentData?.callerId,
          receiverId: currentData?.receiverId,
          currentStatus: currentData?.status,
          requestingUserId: userId,
          isCaller: currentData?.callerId === userId,
          isReceiver: currentData?.receiverId === userId
        });

        if (!currentData) {
          console.log('[CallSignaling][END_CALL][TX] ABORT: Call not found');
          return;
        }
        // Only caller or receiver can end the call
        if (currentData.callerId !== userId && currentData.receiverId !== userId) {
          console.log('[CallSignaling][END_CALL][TX] ABORT: Not authorized (not caller or receiver)');
          return;
        }
        // Only end if call is active (accepted or ringing)
        if (currentData.status !== CALL_STATUS.ACCEPTED && currentData.status !== CALL_STATUS.RINGING) {
          console.log('[CallSignaling][END_CALL][TX] ABORT: Wrong status:', currentData.status);
          return;
        }

        currentData.status = CALL_STATUS.ENDED;
        currentData.updatedAt = Date.now();
        currentData.endedAt = Date.now();
        console.log('[CallSignaling][END_CALL][TX] SUCCESS: Updated to ENDED');
        return currentData;
      });

      if (!result.committed) {
        console.log('[CallSignaling][END_CALL] Transaction not committed - call may already be ended or not authorized');
        return;
      }

      console.log('[CallSignaling][END_CALL] Transaction committed, updating userCalls index');
      // Update userCalls index for both users
      const callSnap = await get(callRef);
      if (callSnap.exists()) {
        const callData = callSnap.val();
        await Promise.all([
          update(ref(rtdb, `${USER_CALLS_PATH}/${callData.callerId}/${callId}`), {
            status: CALL_STATUS.ENDED,
            updatedAt: Date.now(),
          }),
          update(ref(rtdb, `${USER_CALLS_PATH}/${callData.receiverId}/${callId}`), {
            status: CALL_STATUS.ENDED,
            updatedAt: Date.now(),
          }),
        ]);
        console.log('[CallSignaling][END_CALL] userCalls index updated for both users');
      }
    } catch (error) {
      console.error('[CallSignaling][END_CALL] End call error:', error);
      throw error;
    }
  }

  /**
   * 6. updateCallStatus - Update call status (generic method)
   * Uses transaction for atomic status update
   * @param {string} callId - Call ID
   * @param {string} status - New status (from CALL_STATUS enum)
   * @param {Object} additionalData - Additional data to update
   */
  async updateCallStatus(callId, status, additionalData = {}) {
    const updateStart = getTimestamp();
    console.log('[CallSignaling][UPDATE_STATUS] updateCallStatus:', { callId, status });
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);

      const txStart = getTimestamp();
      const result = await runTransaction(callRef, (currentData) => {
        if (!currentData) return;

        currentData.status = status;
        currentData.updatedAt = Date.now();

        // Add specific timestamps for certain statuses
        if (status === CALL_STATUS.ACCEPTED) {
          currentData.answeredAt = Date.now();
        } else if (
          status === CALL_STATUS.ENDED ||
          status === CALL_STATUS.REJECTED ||
          status === CALL_STATUS.CANCELLED ||
          status === CALL_STATUS.MISSED
        ) {
          currentData.endedAt = Date.now();
        }

        // Merge additional data
        Object.keys(additionalData).forEach((key) => {
          currentData[key] = additionalData[key];
        });

        return currentData;
      });
      logTiming('updateCallStatus transaction', txStart);

      if (!result.committed) {
        console.warn('[CallSignaling][UPDATE_STATUS] Update call status failed - call not found');
        return;
      }

      logTiming('updateCallStatus total', updateStart);
      console.log('[CallSignaling][UPDATE_STATUS] Call status updated:', callId, '->', status);
    } catch (error) {
      logTiming('updateCallStatus FAILED', updateStart);
      console.error('[CallSignaling][UPDATE_STATUS] Update call status error:', error, 'code:', error?.code, 'message:', error?.message);
      throw error;
    }
  }

  /**
   * 7. removeCallListeners - Clean up all listeners for a specific call
   * @param {string} callId - Call ID (optional, if not provided cleans all)
   */
  removeCallListeners(callId = null) {
    if (callId) {
      // Clean up specific call listener
      if (this.listeners.has(callId)) {
        const unsubscribe = this.listeners.get(callId);
        unsubscribe();
        this.listeners.delete(callId);
      }
      this.callStatusListeners.delete(callId);
    } else {
      // Clean up all call listeners
      this.listeners.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[CallSignaling] Listener cleanup error:', error);
        }
      });
      this.listeners.clear();
      this.callStatusListeners.clear();
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Register listener for call status changes
   * @param {string} callId - Call ID to listen for
   * @param {Function} callback - Callback function(callData)
   * @returns {Function} Unsubscribe function
   */
  onCallStatusChange(callId, callback) {
    console.log('[CallSignaling][ON_STATUS] Registering listener for call:', callId);
    if (!this.callStatusListeners.has(callId)) {
      this.callStatusListeners.set(callId, new Set());

      // Set up Realtime Database listener for this specific call
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      console.log('[CallSignaling][ON_STATUS] Setting up onValue listener for:', `${CALLS_PATH}/${callId}`);
      const listener = (snapshot) => {
        const listenerStart = getTimestamp();
        if (snapshot.exists()) {
          const callData = { ...snapshot.val(), id: callId };
          console.log('[CallSignaling][ON_STATUS] Call data changed:', callData.callId, 'status:', callData.status);
          this.handleCallStatusChange(callData);
        } else {
          // Call document deleted
          console.log('[CallSignaling][ON_STATUS] Call document deleted:', callId);
          this.handleCallRemoved(callId);
        }
        logTiming('onCallStatusChange listener', listenerStart);
      };

      onValue(callRef, listener);
      this.listeners.set(callId, () => off(callRef, 'value', listener));
    }

    this.callStatusListeners.get(callId).add(callback);

    return () => {
      const listeners = this.callStatusListeners.get(callId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.cleanupCallListeners(callId);
        }
      }
    };
  }

  /**
   * Clean up listeners for a specific call
   * @param {string} callId - Call ID
   */
  cleanupCallListeners(callId) {
    if (this.listeners.has(callId)) {
      this.listeners.get(callId)();
      this.listeners.delete(callId);
    }
    this.callStatusListeners.delete(callId);
  }

  /**
   * Handle call document removed
   */
  handleCallRemoved(callId) {
    console.log('[CallSignaling] Call removed:', callId);
    this.cleanupCallListeners(callId);
  }

  /**
   * Get call data
   * @param {string} callId - Call ID
   * @returns {Promise<Object|null>} Call data or null
   */
  async getCall(callId) {
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      const snapshot = await get(callRef);
      return snapshot.exists() ? { id: callId, ...snapshot.val() } : null;
    } catch (error) {
      console.error('[CallSignaling] Get call error:', error);
      return null;
    }
  }

  /**
   * Mark call as busy (receiver already in a call)
   * @param {string} callId - Call ID
   * @param {string} receiverId - Receiver's user ID
   */
  async markBusy(callId, receiverId) {
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      const snapshot = await get(callRef);

      if (!snapshot.exists()) return;

      const callData = snapshot.val();
      if (callData.receiverId !== receiverId) return;

      await this.updateCallStatus(callId, CALL_STATUS.BUSY);
    } catch (error) {
      console.error('[CallSignaling] Mark busy error:', error);
    }
  }

  /**
   * Cancel an outgoing call (caller cancels before receiver answers)
   * @param {string} callId - Call ID
   * @param {string} callerId - Caller's user ID
   */
  async cancelCall(callId, callerId) {
    try {
      const callRef = ref(rtdb, `${CALLS_PATH}/${callId}`);
      const snapshot = await get(callRef);

      if (!snapshot.exists()) return;

      const callData = snapshot.val();
      if (callData.callerId !== callerId) {
        throw new Error('Not authorized to cancel this call');
      }

      // Only cancel if not yet answered
      if (callData.status === CALL_STATUS.ACCEPTED) {
        await this.endCall(callId, callerId);
        return;
      }

      await this.updateCallStatus(callId, CALL_STATUS.CANCELLED);
    } catch (error) {
      console.error('[CallSignaling] Cancel call error:', error);
      throw error;
    }
  }

  /**
   * Clean up all listeners and reset state
   */
  async destroy() {
    // Clean up user calls listener
    if (this.userCallsListener && this.userCallsQuery) {
      off(this.userCallsQuery, 'value', this.userCallsListener);
      this.userCallsListener = null;
      this.userCallsQuery = null;
    }

    // Clean up all call listeners
    this.removeCallListeners();

    this.incomingCallListeners.clear();
    this.currentUserId = null;
    this.activeCallId = null;
    this.isInitialized = false;

    console.log('[CallSignaling] Destroyed');
  }
}

// Export singleton instance
export const callSignaling = new CallSignaling();

// Also export the class for testing
export { CallSignaling };