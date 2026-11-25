/**
 * Call Controls Component - WhatsApp Style
 * Reusable call control buttons with modern, intuitive design
 */
import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Animated, Easing } from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

const CallControlButton = React.memo(({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  isEndCall = false,
  testID,
  accessibilityLabel,
}) => {
  const [scale] = React.useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.92,
      duration: 80,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const backgroundColor = isEndCall
    ? Colors.error
    : active
      ? Colors.primary[500]
      : 'rgba(255, 255, 255, 0.18)';

  const iconColor = isEndCall || active ? '#FFFFFF' : Colors.text.inverse.light;
  const labelColor = disabled ? 'rgba(255, 255, 255, 0.5)' : Colors.text.inverse.light;
  const borderWidth = isEndCall || active ? 0 : 1;
  const borderColor = isEndCall || active ? 'transparent' : 'rgba(255, 255, 255, 0.25)';
  const opacity = disabled ? 0.5 : 1;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor,
            borderColor,
            borderWidth,
            opacity,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        accessibilityLabel={accessibilityLabel || label}
        testID={testID}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const CallControls = ({
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onSwitchCamera,
  isMuted,
  isVideoOff,
  callType,
  style,
}) => {
  const controls = [
    {
      icon: isMuted ? '🔇' : '🎤',
      label: isMuted ? 'Unmute' : 'Mute',
      onPress: onToggleMute,
      active: isMuted,
      testID: 'mute-button',
      accessibilityLabel: isMuted ? 'Unmute microphone' : 'Mute microphone',
    },
    {
      icon: isVideoOff ? '📷❌' : '📷',
      label: isVideoOff ? 'Video On' : 'Video Off',
      onPress: onToggleVideo,
      active: isVideoOff,
      disabled: callType === 'audio',
      testID: 'video-button',
      accessibilityLabel: isVideoOff ? 'Turn on video' : 'Turn off video',
    },
    {
      icon: '🔄',
      label: 'Flip',
      onPress: onSwitchCamera,
      disabled: callType === 'audio' || isVideoOff,
      testID: 'flip-camera-button',
      accessibilityLabel: 'Switch camera',
    },
    {
      icon: '📞',
      label: 'End',
      onPress: onEndCall,
      isEndCall: true,
      active: true,
      testID: 'end-call-button',
      accessibilityLabel: 'End call',
    },
  ];

  return (
    <View style={[styles.container, style]}>
      {controls.map((control, index) => (
        <CallControlButton
          key={index}
          icon={control.icon}
          label={control.label}
          onPress={control.onPress}
          active={control.active}
          disabled={control.disabled}
          isEndCall={control.isEndCall}
          testID={control.testID}
          accessibilityLabel={control.accessibilityLabel}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl + 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    fontSize: 26,
    marginBottom: 2,
    lineHeight: 30,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 14,
  },
});

export default CallControls;