/**
 * Incoming Call Screen - WhatsApp Style
 * Full-screen incoming call UI with swipe-to-answer/reject
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import agoraRTCService, { CALL_TYPES } from '../../services/agoraRTCService';
const agoraService = agoraRTCService;
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/borders';
import Sound from 'react-native-sound';

// Enable Sound for Android
Sound.setCategory('Playback', true);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const BUTTON_SIZE = 80;

const IncomingCallScreen = ({ route, navigation }) => {
  const { callerName, callerId, callType, channelName, callId, propertyId } = route.params || {};

  const dragX = useRef(new Animated.Value(0)).current;
  const [dragAnimated, setDragAnimated] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const ringtone = useRef(null);

  // Load and play ringtone on mount
  useEffect(() => {
    console.log('[IncomingCallScreen] Loading ringtone...');
    const sound = new Sound('ringtone.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('[IncomingCallScreen] Failed to load ringtone:', error);
        return;
      }
      console.log('[IncomingCallScreen] Ringtone loaded, playing...');
      ringtone.current = sound;
      sound.setNumberOfLoops(-1); // Loop indefinitely
      sound.setVolume(1.0);
      sound.play((success) => {
        if (!success) {
          console.error('[IncomingCallScreen] Ringtone playback failed');
        } else {
          console.log('[IncomingCallScreen] Ringtone playing');
        }
      });
    });

    return () => {
      console.log('[IncomingCallScreen] Cleaning up ringtone...');
      if (ringtone.current) {
        ringtone.current.stop();
        ringtone.current.release();
        ringtone.current = null;
      }
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setDragAnimated(true);
        dragX.setOffset(dragX._value);
        dragX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (!dragAnimated) return;
        dragX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!dragAnimated) return;
        setDragAnimated(false);
        const dx = gestureState.dx;
        const velocity = gestureState.vx;

        // Answer: swipe right past threshold or high velocity right
        if (dx > SWIPE_THRESHOLD || velocity > 0.8) {
          handleAnswer();
        }
        // Reject: swipe left past threshold or high velocity left
        else if (dx < -SWIPE_THRESHOLD || velocity < -0.8) {
          handleDecline();
        }
        // Snap back
        else {
          Animated.spring(dragX, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
          dragX.flattenOffset();
        }
      },
      onPanResponderTerminate: () => {
        if (dragAnimated) {
          setDragAnimated(false);
          Animated.spring(dragX, {
            toValue: 0,
            tension: 100,
            friction: 10,
            useNativeDriver: true,
          }).start();
          dragX.flattenOffset();
        }
      },
    })
  ).current;

  const stopRingtone = useCallback(() => {
    if (ringtone.current) {
      console.log('[IncomingCallScreen] Stopping ringtone...');
      ringtone.current.stop();
      ringtone.current.release();
      ringtone.current = null;
    }
  }, []);

  const handleAnswer = useCallback(async () => {
    if (hasResponded) return;
    setHasResponded(true);
    stopRingtone();

    console.log('[IncomingCallScreen] handleAnswer - about to call agoraService.acceptCall');
    console.log('[IncomingCallScreen] - callId:', callId, 'channelName:', channelName, 'callerId:', callerId, 'callType:', callType);

    const result = await agoraService.acceptCall(callId, channelName, callerId, callType);
    console.log('[IncomingCallScreen] agoraService.acceptCall result:', result);
    if (result.success) {
      console.log('[IncomingCallScreen] Call accepted, navigating to ActiveCall');
      navigation.navigate('ActiveCall', {
        channelName,
        remoteUserId: callerId,
        callType,
        isIncoming: true,
        callerName,
        callId,
        propertyId,
      });
    } else {
      console.log('[IncomingCallScreen] Call acceptance failed:', result.error);
      // Call can't be accepted (likely already rejected/ended by caller)
      setHasResponded(false);
      navigation.dismiss();
    }
  }, [callId, channelName, callerId, callType, navigation, callerName, hasResponded, propertyId, stopRingtone]);

  const handleDecline = useCallback(async () => {
    if (hasResponded) return;
    setHasResponded(true);
    stopRingtone();

    await agoraService.rejectCall(callId);
    navigation.dismiss();
  }, [callId, navigation, hasResponded, stopRingtone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!hasResponded) {
        // Call was cancelled or missed - reset call state so new calls can come through
        console.log('[IncomingCallScreen] Unmount without response, resetting call state');
        agoraService.resetCallState();
      }
    };
  }, [hasResponded]);

  // Listen for call cancellation
  useEffect(() => {
    const handleCancel = () => {
      if (!hasResponded) {
        setHasResponded(true);
        stopRingtone();
        // For modal screens, dismiss is the correct method
        // If it fails, we just reset state - the modal will be dismissed by parent
        if (typeof navigation.dismiss === 'function') {
          try {
            navigation.dismiss();
          } catch (e) {
            console.warn('[IncomingCallScreen] dismiss failed:', e);
          }
        }
        // Don't call goBack() on modal - there's no screen to go back to
      }
    };

    agoraService.on('callCancelled', handleCancel);
    agoraService.on('callMissed', handleCancel);

    return () => {
      agoraService.off('callCancelled', handleCancel);
      agoraService.off('callMissed', handleCancel);
    };
  }, [navigation, hasResponded, stopRingtone]);

  // Pulse animation for center button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, [pulseAnim]);

  // Animated button positions based on drag
  const answerButtonTranslate = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [-BUTTON_SIZE * 1.5, 0, BUTTON_SIZE * 1.5],
    extrapolate: 'clamp',
  });

  const declineButtonTranslate = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [-BUTTON_SIZE * 1.5, 0, BUTTON_SIZE * 1.5],
    extrapolate: 'clamp',
  });

  const centerButtonScale = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });

  const centerButtonOpacity = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD],
    outputRange: [0, 0.5, 1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const answerHintOpacity = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD],
    outputRange: [1, 1, 0, 0],
    extrapolate: 'clamp',
  });

  const declineHintOpacity = dragX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3, 0, SWIPE_THRESHOLD],
    outputRange: [0, 0, 1, 1],
    extrapolate: 'clamp',
  });

  const callTypeIcon = callType === CALL_TYPES.VIDEO ? '📹' : '📞';
  const callTypeLabel = callType === CALL_TYPES.VIDEO ? 'Incoming Video Call' : 'Incoming Voice Call';

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
      </View>

      {/* Top Section - Caller Info */}
      <View style={styles.topSection}>
        <View style={styles.callerAvatar}>
          <Text style={styles.avatarText}>{callerName?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.callerName}>{callerName || 'Unknown'}</Text>
        <View style={styles.callTypeBadge}>
          <Text style={styles.callTypeIcon}>{callTypeIcon}</Text>
          <Text style={styles.callTypeText}>{callTypeLabel}</Text>
        </View>
      </View>

      {/* Center - Swipe Area */}
      <Animated.View
        style={[
          styles.centerArea,
          {
            transform: [{ translateX: dragX }],
          },
        ]}
      >
        {/* Hint Text - Swipe Right to Answer */}
        <Animated.View
          style={[
            styles.hintContainer,
            { opacity: answerHintOpacity },
          ]}
        >
          <Text style={styles.hintText}>Slide to Answer</Text>
          <Text style={styles.hintArrow}>→</Text>
        </Animated.View>

        {/* Center Button - Drag Handle */}
        <Animated.View
          style={[
            styles.centerButton,
            {
              transform: [
                { scale: centerButtonScale },
                { translateX: dragX },
              ],
              opacity: centerButtonOpacity,
            },
          ]}
        >
          <View style={styles.centerButtonInner}>
            <Text style={styles.centerButtonIcon}>📞</Text>
          </View>
        </Animated.View>

        {/* Hint Text - Swipe Left to Decline */}
        <Animated.View
          style={[
            styles.hintContainer,
            { opacity: declineHintOpacity },
          ]}
        >
          <Text style={styles.hintArrow}>←</Text>
          <Text style={styles.hintText}>Slide to Decline</Text>
        </Animated.View>

        {/* Answer Button (Right) - Green */}
        <Animated.View
          style={[
            styles.sideButton,
            styles.answerButton,
            {
              transform: [{ translateX: answerButtonTranslate }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.sideButtonInner}
            onPress={handleAnswer}
            activeOpacity={0.9}
            accessibilityLabel="Answer call"
          >
            <Text style={styles.sideButtonIcon}>✓</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Decline Button (Left) - Red */}
        <Animated.View
          style={[
            styles.sideButton,
            styles.declineButton,
            {
              transform: [{ translateX: declineButtonTranslate }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.sideButtonInner}
            onPress={handleDecline}
            activeOpacity={0.9}
            accessibilityLabel="Decline call"
          >
            <Text style={styles.sideButtonIcon}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Bottom - Instructions */}
      <View style={styles.bottomSection}>
        <Text style={styles.instructionText}>
          Swipe {callType === CALL_TYPES.VIDEO ? '📹' : '📞'} to answer or decline
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.dark,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background.dark,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.15,
  },
  callerAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  callerName: {
    ...Typography.styles.h2,
    fontWeight: '700',
    color: Colors.text.inverse.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  callTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callTypeIcon: {
    fontSize: 18,
  },
  callTypeText: {
    ...Typography.styles.label,
    fontWeight: '600',
    color: Colors.text.inverse.dark,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.25,
  },
  hintText: {
    ...Typography.styles.body,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  hintArrow: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  centerButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
  },
  centerButtonInner: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  centerButtonIcon: {
    fontSize: 32,
  },
  sideButton: {
    position: 'absolute',
    bottom: SCREEN_HEIGHT * 0.18,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
  answerButton: {
    right: Spacing.xl,
  },
  declineButton: {
    left: Spacing.xl,
  },
  sideButtonInner: {
    flex: 1,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sideButtonIcon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  bottomSection: {
    flex: 0.15,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Spacing.xl + 20,
  },
  instructionText: {
    ...Typography.styles.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default IncomingCallScreen;