/**
 * Active Call Screen - WhatsApp Style
 * In-call UI with video rendering, controls, and call info
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { RtcSurfaceView, RtcTextureView, RenderModeType } from 'react-native-agora';
import { useAuth } from '../../context/AuthContext';
import agoraRTCService, { CALL_TYPES, CALL_STATES, USE_FIXED_TEST_CHANNEL, FIXED_TEST_CHANNEL, getRemoteUid } from '../../services/agoraRTCService';
const agoraService = agoraRTCService;
import CallControls from '../../components/call/CallControls';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/borders';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ActiveCallScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const {
    channelName,
    remoteUserId,
    callType,
    callerName,
    // callId and propertyId available for future use
    // callId,
    // propertyId,
  } = route.params || {};

  const [callState, setCallState] = useState(CALL_STATES.CONNECTING);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);

  const durationTimer = useRef(null);
  const controlsHideTimer = useRef(null);
  const isMounted = useRef(true);
  const remoteUid = useRef(null);

  // Handle back button - end call
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleEndCall);
    return () => backHandler.remove();
  }, [handleEndCall]);

  // Initialize call state listener
  useEffect(() => {
    const handleStateChange = (state) => {
      if (!isMounted.current) return;
      setCallState(state);

      if (state === CALL_STATES.CONNECTED) {
        startDurationTimer();
      } else if (state === CALL_STATES.ENDED || state === CALL_STATES.FAILED) {
        stopDurationTimer();
        // Navigate back after a brief moment
        setTimeout(() => {
          if (isMounted.current && navigation.canGoBack()) {
            navigation.goBack();
          }
        }, 500);
      }
    };

    const handleUserJoined = (uid) => {
          console.log('[ActiveCallScreen] handleUserJoined123:', { uid, getRemoteUidBefore: getRemoteUid(), remoteUid: remoteUid.current }, !isMounted.current);
      if (!isMounted.current) return;
      console.log('[ActiveCallScreen] handleUserJoined:', { uid, getRemoteUidBefore: getRemoteUid() });
      remoteUid.current = uid;
      // setRemoteUid(uid)
      setRemoteVideoReady(true);
      setCallState(CALL_STATES.CONNECTED);
    };

    const handleUserLeft = () => {
      if (!isMounted.current) return;
      setRemoteVideoReady(false);
    };

    const handleCallEndedByRemote = () => {
      if (!isMounted.current) return;
      handleEndCall();
    };

    const handleCallFailed = ({ error }) => {
      if (!isMounted.current) return;
      console.warn('Call failed:', error);
      stopDurationTimer();
      setTimeout(() => {
        if (isMounted.current && navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 500);
    };

    const handleConnectionChange = ({ state }) => {
      if (!isMounted.current) return;
      const qualityMap = {
        1: 'excellent',
        2: 'good',
        3: 'poor',
        4: 'bad',
        5: 'disconnected',
      };
      setConnectionQuality(qualityMap[state] || 'good');
    };

    const handleError = ({ code }) => {
      if (!isMounted.current) return;
      if (code === 101 || code === 102) {
        // Connection lost
        setConnectionQuality('disconnected');
      }
    };

    agoraService.on('callStateChanged', handleStateChange);
    agoraService.on('userJoined', handleUserJoined);
    agoraService.on('userLeft', handleUserLeft);
    agoraService.on('callEndedByRemote', handleCallEndedByRemote);
    agoraService.on('callFailed', handleCallFailed);
    agoraService.on('connectionStateChanged', handleConnectionChange);
    agoraService.on('error', handleError);
    agoraService.on('firstRemoteVideoFrame', () => setRemoteVideoReady(true));
    agoraService.on('firstRemoteAudioFrame', () => setCallState(CALL_STATES.CONNECTED));
    agoraService.on('localVideoToggled', (enabled) => setIsVideoOff(!enabled));
    agoraService.on('localAudioToggled', (enabled) => setIsMuted(!enabled));

  


    // Check initial state
    const info = agoraService.getCallInfo();
    if (info.state === CALL_STATES.CONNECTED) {
      setCallState(CALL_STATES.CONNECTED);
      setIsMuted(!info.localAudioEnabled);
      setIsVideoOff(!info.localVideoEnabled);
    }

    return () => {
      isMounted.current = false;
      agoraService.off('callStateChanged', handleStateChange);
      agoraService.off('userJoined', handleUserJoined);
      agoraService.off('userLeft', handleUserLeft);
      agoraService.off('callEndedByRemote', handleCallEndedByRemote);
      agoraService.off('connectionStateChanged', handleConnectionChange);
      agoraService.off('error', handleError);
      agoraService.off('firstRemoteVideoFrame', () => setRemoteVideoReady(true));
      agoraService.off('firstRemoteAudioFrame', () => setCallState(CALL_STATES.CONNECTED));
      agoraService.off('localVideoToggled', (enabled) => setIsVideoOff(!enabled));
      agoraService.off('localAudioToggled', (enabled) => setIsMuted(!enabled));
      stopDurationTimer();
    };
  }, [navigation, handleEndCall, startDurationTimer, stopDurationTimer]);


  //    useEffect(() => {
  //   const rtcEngine = createAgoraRtcEngine()
  //   // rtcEngine.initialize({
  //   //   appId: appid,
  //   //   channelProfile: ChannelProfileType.ChannelProfileCommunication,
  //   // })
  //   rtcEngine.enableVideo()

  //   const handler = {
  //     // onJoinChannelSuccess: () => setJoined(true),
  //     onUserJoined: (_, uid) => {console.log(uid,'uid in activecallscreeennnn'); setRemoteUid(uid)},
  //     onUserOffline: () => setRemoteUid(null),
  //   }
  //   rtcEngine.registerEventHandler(handler)
  //   setEngine(rtcEngine)

  //   return () => {
  //     rtcEngine.leaveChannel()
  //     rtcEngine.unregisterEventHandler(handler)
  //     rtcEngine.release()
  //   }
  // }, [])

  const stopDurationTimer = useCallback(() => {
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    stopDurationTimer();
    durationTimer.current = setInterval(() => {
      if (isMounted.current) {
        setCallDuration(prev => prev + 1);
      }
    }, 1000);
  }, [stopDurationTimer]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleControls = useCallback(() => {
    setShowControls(prev => !prev);
    if (controlsHideTimer.current) {
      clearTimeout(controlsHideTimer.current);
    }
    if (showControls) {
      controlsHideTimer.current = setTimeout(() => {
        if (isMounted.current) setShowControls(false);
      }, 3000);
    }
  }, [showControls]);

  const handleToggleMute = useCallback(async () => {
    await agoraService.toggleAudio();
  }, []);

  const handleToggleVideo = useCallback(async () => {
    await agoraService.toggleVideo();
  }, []);

  const handleSwitchCamera = useCallback(async () => {
    await agoraService.switchCamera();
  }, []);

  const handleEndCall = useCallback(async () => {
    if (callState === CALL_STATES.ENDED) return true;

    await agoraService.endCall();
    stopDurationTimer();
    return true;
  }, [callState, stopDurationTimer]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls && callState === CALL_STATES.CONNECTED) {
      controlsHideTimer.current = setTimeout(() => {
        if (isMounted.current) setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsHideTimer.current) clearTimeout(controlsHideTimer.current);
    };
  }, [showControls, callState]);

  const displayName = callerName || `User ${remoteUserId?.slice(-4) || '...'}`;
  const isVideoCall = callType === CALL_TYPES.VIDEO;

  // TEST MODE: Use fixed channel for audio testing
  const effectiveChannelName = USE_FIXED_TEST_CHANNEL ? FIXED_TEST_CHANNEL : channelName;

  // Get numeric UID for remote video canvas
  // Priority: ref (from UserJoined callback) > service getter (fallback for late join)
  const remoteUidNum = remoteUid.current || getRemoteUid();
  // const remoteUidNum = remoteUid;

  // Debug log
  console.log('[ActiveCallScreen] Render:', { isVideoCall, remoteVideoReady, remoteUidNum });

  // Render remote video (full screen) or avatar
  const renderRemoteVideo = () => {
    // Create canvas for remote video - per Agora skill example: only uid + renderMode
    const remoteCanvas = remoteUidNum ? {
      uid: remoteUidNum,
      mirrorMode: 0,
      renderMode: RenderModeType.RenderModeHidden, // 1: HIDDEN (crop to fill)
    } : null;

    if (isVideoCall && remoteUidNum) {
      console.log('[ActiveCallScreen] Rendering remote video11111:', { uid: remoteUidNum }, isVideoCall);
      return (
        <RtcSurfaceView
          style={{ ...StyleSheet.absoluteFill, width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          // style={{ width: '100%', height: 240 }}

          canvas={remoteCanvas}
        />
      );
    }

    // Audio call or video not ready - show avatar with hidden remote view for audio
    return (
      <View style={styles.remoteAvatarContainer}>
        <View style={styles.remoteAvatar}>
          <Text style={styles.remoteAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        {/* Hidden but mounted RtcSurfaceView for audio playback */}
        {!isVideoCall && remoteUidNum && (
          <RtcSurfaceView
            style={styles.hiddenAudioView}
            canvas={remoteCanvas}
          />
        )}
        {isVideoCall && !remoteVideoReady && (
          <View style={styles.connectingOverlay}>
            <Animated.View style={styles.connectingRing} />
            <Text style={styles.connectingText}>Connecting video...</Text>
          </View>
        )}
      </View>
    );
  };

  // Render local video (picture-in-picture)
  const renderLocalVideo = () => {
    // Create canvas for local video - per Agora skill example: uid: 0 for local preview
    const localCanvas = {
      uid: 0, // 0: local preview (triggers setupLocalVideo)
      mirrorMode: 1, // 1: enable mirror for local preview
      renderMode: RenderModeType.RenderModeFit, // 2: FIT (scale to fit)
    };

    // For audio calls, we still need RtcSurfaceView mounted (hidden) for audio to work
    if (!isVideoCall) {
      return (
        <View style={styles.localVideoPlaceholder}>
          <View style={styles.localAvatar}>
            <Text style={styles.localAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.localLabel}>You</Text>
          {/* Hidden but mounted RtcSurfaceView for audio capture */}
          <RtcSurfaceView
            style={styles.hiddenAudioView}
            canvas={localCanvas}
          />
        </View>
      );
    }

    if (isVideoOff) {
      return (
        <View style={styles.localVideoPlaceholder}>
          <View style={styles.localAvatar}>
            <Text style={styles.localAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
            <View style={styles.videoOffBadge}>
              <Text style={styles.videoOffIcon}>📷❌</Text>
            </View>
          </View>
          <Text style={styles.localLabel}>You</Text>
        </View>
      );
    }

    return (
      <View style={styles.localVideoContainer}>
        <RtcSurfaceView
          style={styles.localVideo}
          canvas={localCanvas}
        />
        <View style={styles.localVideoBorder} />
      </View>
    );
  };

  return (
    <View style={styles.container} onTouchStart={toggleControls}>
      {/* Background - Remote Video or Avatar */}
      {renderRemoteVideo()}

      {/* Top Bar */}
      <Animated.View
        style={[
          styles.topBar,
          showControls ? styles.topBarVisible : styles.topBarHidden,
        ]}
      >
        <View style={styles.topBarContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleEndCall}
            accessibilityLabel="End call"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.backButtonIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.callInfo}>
            <Text style={styles.callName}>{displayName}</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.qualityDot,
                { backgroundColor: getQualityColor(connectionQuality) },
              ]} />
              <Text style={styles.statusText}>
                {connectionQuality === 'disconnected' ? 'Reconnecting...' :
                 connectionQuality === 'poor' || connectionQuality === 'bad' ? 'Poor connection' :
                 callState === CALL_STATES.CONNECTING ? 'Connecting...' :
                 formatDuration(callDuration)}
              </Text>
            </View>
          </View>

          <View style={styles.topRightSpacer} />
        </View>
      </Animated.View>

      {/* Local Video (PiP) */}
      <Animated.View
        style={[
          styles.localVideoWrapper,
          showControls ? styles.localVideoWrapperVisible : styles.localVideoWrapperHidden,
        ]}
      >
        {renderLocalVideo()}
      </Animated.View>

      {/* Bottom Controls */}
      <Animated.View
        style={[
          styles.bottomControls,
          showControls ? styles.bottomControlsVisible : styles.bottomControlsHidden,
        ]}
      >
        <CallControls
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onEndCall={handleEndCall}
          onSwitchCamera={handleSwitchCamera}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          callType={callType}
        />
      </Animated.View>

      {/* Connection Quality Indicator (when poor) */}
      {connectionQuality === 'poor' || connectionQuality === 'bad' || connectionQuality === 'disconnected' ? (
        <Animated.View
          style={[
            styles.qualityBanner,
            showControls ? styles.qualityBannerVisible : styles.qualityBannerHidden,
          ]}
        >
          <View style={styles.qualityBannerContent}>
            <Text style={styles.qualityBannerIcon}>
              {connectionQuality === 'disconnected' ? '📡' : '⚠️'}
            </Text>
            <Text style={styles.qualityBannerText}>
              {connectionQuality === 'disconnected'
                ? 'Reconnecting...'
                : 'Poor connection'}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
};

const getQualityColor = (quality) => {
  switch (quality) {
    case 'excellent': return Colors.success;
    case 'good': return Colors.primary[500];
    case 'poor': return Colors.warning;
    case 'bad': return Colors.error;
    case 'disconnected': return Colors.error;
    default: return Colors.primary[500];
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  remoteAvatarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  remoteAvatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 12,
  },
  remoteAvatarText: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -3,
  },
  connectingOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: Colors.primary[500],
  },
  connectingText: {
    marginTop: Spacing.md,
    ...Typography.styles.body,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xl + 20,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  callInfo: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  callName: {
    ...Typography.styles.h5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.styles.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  topRightSpacer: {
    width: 44,
  },
  localVideoWrapper: {
    position: 'absolute',
    bottom: 200,
    right: Spacing.lg,
    // zIndex: 10,
  },
  localVideoContainer: {
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  localVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  localVideoBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  localVideoPlaceholder: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  localAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  localAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  videoOffBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  videoOffIcon: {
    fontSize: 14,
  },
  localLabel: {
    marginTop: Spacing.xs,
    ...Typography.styles.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.xl + 20,
  },
  qualityBanner: {
    position: 'absolute',
    top: Spacing.xl + 80,
    left: Spacing.lg,
    right: Spacing.lg,
    // zIndex: 20,
  },
  qualityBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  qualityBannerIcon: {
    fontSize: 16,
  },
  qualityBannerText: {
    ...Typography.styles.bodySmall,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Hidden view for audio-only calls (must be mounted for audio to work)
  hiddenAudioView: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -100,
    left: -100,
    opacity: 0,
  },
  // Animated opacity styles
  topBarVisible: { opacity: 1 },
  topBarHidden: { opacity: 0 },
  localVideoWrapperVisible: { opacity: 1 },
  localVideoWrapperHidden: { opacity: 0 },
  bottomControlsVisible: { opacity: 1, transform: [{ translateY: 0 }] },
  bottomControlsHidden: { opacity: 0, transform: [{ translateY: 100 }] },
  qualityBannerVisible: { opacity: 1 },
  qualityBannerHidden: { opacity: 0 },
});

export default ActiveCallScreen;