/**
 * Reusable Input component
 * Supports label, error, secure text entry with show/hide, and various keyboard types
 */
import React, { useState } from 'react';
import { StyleSheet, TextInput, Text, View, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';
import { BorderRadius, Shadows } from '../constants/borders';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  secureTextEntry = false,
  showToggle = true,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = false,
  textContentType,
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  style,
  containerStyle,
  labelStyle,
  inputStyle,
  testID,
  accessibilityLabel,
  maxLength,
  onSubmitEditing,
  returnKeyType = 'next',
  editable = true,
}) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);

  const toggleSecure = () => {
    if (showToggle && secureTextEntry) {
      setIsSecure(!isSecure);
    }
  };

  const hasError = !!error;
  const isActive = isFocused || value.length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {(label || required) && (
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              isActive && styles.labelActive,
              hasError && styles.labelError,
              labelStyle,
            ]}
          >
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            isActive && styles.inputActive,
            hasError && styles.inputError,
            disabled && styles.inputDisabled,
            inputStyle,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          onFocus={() => setIsFocused(true)}
          onEndEditing={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          textContentType={textContentType}
          disabled={disabled}
          editable={editable}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          placeholderTextColor={Colors.neutral[400]}
          selectionColor={Colors.primary[500]}
          testID={testID}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ invalid: hasError, disabled }}
          accessibilityHint={error}
          {...(Platform.OS === 'android' && {
            underlineColorAndroid: 'transparent',
          })}
        />
        {showToggle && secureTextEntry && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleSecure}
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
            testID={`${testID}-toggle`}
          >
            <Text style={styles.toggleText}>
              {isSecure ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        )}
        {rightIcon && !showToggle && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <Text
          style={styles.errorText}
          testID={`${testID}-error`}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...Typography.styles.label,
    color: Colors.text.primary.light,
  },
  labelActive: {
    color: Colors.primary[600],
  },
  labelError: {
    color: Colors.error,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.light,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    ...Shadows.xs,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
    ...Shadows.sm,
  },
  inputWrapperError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.border.light,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.styles.input,
    color: Colors.text.primary.light,
    paddingVertical: Spacing.sm,
    minHeight: 48,
  },
  inputActive: {},
  inputError: {
    color: Colors.error,
  },
  inputDisabled: {
    color: Colors.neutral[500],
  },
  toggleButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  toggleText: {
    ...Typography.styles.caption,
    color: Colors.primary[500],
    fontWeight: '600',
  },
  errorText: {
    ...Typography.styles.caption,
    color: Colors.error,
    marginLeft: Spacing.xs,
  },
});

export default Input;