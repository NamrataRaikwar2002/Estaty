/**
 * Outgoing Call Screen - WhatsApp Style
 * Shows calling state with animated UI
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import agoraRTCService, { CALL_TYPES, CALL_STATES } from '../../services/agoraRTCService';
const agoraService = agoraRTCService;
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/borders';

const OutgoingCallScreen = ({ route, navigation }) => {
  const { user: _user } = useAuth(); // eslint-disable-line no-unused-vars
  const { remoteUserId, callType, channelName, calleeName, callId, propertyId } = route.params || {};

  const [callState, setCallState] = useState(CALL_STATES.CALLING);
  const [callError, setCallError] = useState(null); // eslint-disable-line no-unused-vars
  const isCancelled = useRef(false);
  const isMounted = useRef(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  // Handle back button - cancel call
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleCancelCall);
    return () => backHandler.remove();
  }, [handleCancelCall]);

  useEffect(() => {
    // Start calling animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Listen for call state changes
    const handleStateChange = (state) => {
      if (!isMounted.current) return;
      setCallState(state);

      if (state === CALL_STATES.CONNECTED) {
        navigation.navigate('ActiveCall', {
          channelName,
          remoteUserId,
          callType,
          isIncoming: false,
          calleeName,
          callId,
          propertyId,
        });
      } else if (state === CALL_STATES.ENDED || state === CALL_STATES.FAILED) {
        if (!isCancelled.current) {
          isCancelled.current = true;
          setTimeout(() => {
            if (isMounted.current && navigation.canGoBack()) {
              navigation.goBack();
            }
          }, 1000);
        }
      }
    };

    const handleCallRejected = ({ reason }) => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      // Could show rejection reason
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 2000);
    };

    const handleCallEndedByRemote = () => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1000);
    };

    const handleCallFailed = ({ error }) => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      console.warn('Call failed:', error);
      setCallError(error);
      // Show error to user - could use Alert or toast
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 3000);
    };

    const handleUserBusy = () => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 2000);
    };

    const handleCallAccepted = () => {
      // Call was accepted, state change will handle navigation
    };

    const handleCallCancelled = () => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1000);
    };

    const handleCallMissed = () => {
      if (!isMounted.current) return;
      isCancelled.current = true;
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1000);
    };

    agoraService.on('callStateChanged', handleStateChange);
    agoraService.on('callRejected', handleCallRejected);
    agoraService.on('callEndedByRemote', handleCallEndedByRemote);
    agoraService.on('userBusy', handleUserBusy);
    agoraService.on('callFailed', handleCallFailed);
    agoraService.on('callAccepted', handleCallAccepted);
    agoraService.on('callCancelled', handleCallCancelled);
    agoraService.on('callMissed', handleCallMissed);

    return () => {
      isMounted.current = false;
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      agoraService.off('callStateChanged', handleStateChange);
      agoraService.off('callRejected', handleCallRejected);
      agoraService.off('callEndedByRemote', handleCallEndedByRemote);
      agoraService.off('userBusy', handleUserBusy);
      agoraService.off('callFailed', handleCallFailed);
      agoraService.off('callAccepted', handleCallAccepted);
      agoraService.off('callCancelled', handleCallCancelled);
      agoraService.off('callMissed', handleCallMissed);
    };
  }, [channelName, remoteUserId, callType, navigation, calleeName, callId, propertyId, pulseAnim, ringAnim]);

  const handleCancelCall = useCallback(async () => {
    if (isCancelled.current) return true;

    isCancelled.current = true;
    await agoraService.cancelCall();
    return true;
  }, [isCancelled]);

  const displayName = calleeName || `User ${remoteUserId?.slice(-4) || '...'}`;
  const callTypeIcon = callType === CALL_TYPES.VIDEO ? '📹' : '📞';
  const callTypeLabel = callType === CALL_TYPES.VIDEO ? 'Video Call' : 'Voice Call';

  const statusText = isCancelled
    ? 'Call Ended'
    : callState === CALL_STATES.CALLING
      ? 'Calling...'
      : callState === CALL_STATES.CONNECTING
        ? 'Connecting...'
        : 'Ringing...';

  return (
    <View style={styles.container}>
      {/* Background Rings */}
      <View style={styles.backgroundRings}>
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [
                { scale: ringAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 1.2],
                })},
              ],
              opacity: ringAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.6, 0.3, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              transform: [
                { scale: ringAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.9],
                })},
              ],
              opacity: ringAnim.interpolate({
                inputRange: [0, 0.3, 0.8, 1],
                outputRange: [0, 0.4, 0.2, 0],
              }),
            },
          ]}
        />
      </View>

      {/* Center Content */}
      <View style={styles.centerContent}>
        {/* Profile Avatar */}
        <Animated.View
          style={[
            styles.avatar,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          {isCancelled && (
            <View style={styles.callEndedOverlay}>
              <Text style={styles.callEndedIcon}>✕</Text>
            </View>
          )}
        </Animated.View>

        {/* Call Type Badge */}
        <View style={styles.callTypeBadge}>
          <Text style={styles.callTypeIcon}>{callTypeIcon}</Text>
          <Text style={styles.callTypeText}>{callTypeLabel}</Text>
        </View>

        {/* Name */}
        <Text style={styles.name}>{displayName}</Text>

        {/* Status */}
        <Animated.View
          style={[
            styles.statusContainer,
            styles.statusOpacity,
            isCancelled ? styles.statusContainerCancelled : styles.statusContainerActive,
          ]}
        >
          <Text style={styles.statusText}>{statusText}</Text>
          {!isCancelled && callState !== CALL_STATES.FAILED && (
            <Animated.Text
              style={styles.callingDots}
            >
              {['.', '..', '...'][Math.floor(Date.now() / 800) % 3]}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Cancel/End Button */}
        {!isCancelled && (
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleCancelCall}
            activeOpacity={0.85}
            accessibilityLabel="Cancel call"
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View style={styles.endButtonInner}>
              <Text style={styles.endButtonIcon}>📞</Text>
            </View>
            <Text style={styles.endButtonLabel}>Cancel</Text>
          </TouchableOpacity>
        )}

        {isCancelled && (
          <View style={styles.endedContainer}>
            <Text style={styles.endedText}>
              {callState === CALL_STATES.FAILED ? 'Call Failed' : 'Call Ended'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Hint */}
      <View style={styles.bottomHint}>
        <Text style={styles.hintText}>
          {isCancelled ? '' : 'Swipe up or press to cancel'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundRings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  avatar: {
    width: 160,
    height: 160,
    marginBottom: Spacing.xl,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 80,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 16,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -3,
  },
  callEndedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callEndedIcon: {
    fontSize: 48,
    color: Colors.error,
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: Spacing.lg,
  },
  callTypeIcon: {
    fontSize: 20,
  },
  callTypeText: {
    ...Typography.styles.label,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    ...Typography.styles.h2,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.xl,
  },
  statusOpacity: {
    opacity: 1,
  },
  statusText: {
    ...Typography.styles.body,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  callingDots: {
    ...Typography.styles.body,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  endButton: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  endButtonInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  endButtonIcon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  endButtonLabel: {
    ...Typography.styles.label,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  endedContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  endedText: {
    ...Typography.styles.body,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  bottomHint: {
    position: 'absolute',
    bottom: Spacing.xl + 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    ...Typography.styles.caption,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  statusContainerCancelled: { opacity: 0.7 },
  statusContainerActive: { opacity: 1 },
});

export default OutgoingCallScreen;