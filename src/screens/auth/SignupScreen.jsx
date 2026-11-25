/**
 * Signup Screen
 * Multi-step registration with role selection (Buyer, Seller, Broker)
 */
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Logo, Card } from '../../components';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius, Shadows } from '../../constants/borders';

// Role configuration
const ROLES = [
  {
    id: 'buyer',
    label: 'Buyer',
    description: 'Looking to buy property',
    icon: '🏠',
    color: '#3b82f6',
  },
  {
    id: 'seller',
    label: 'Seller',
    description: 'Want to sell property',
    icon: '🏘️',
    color: '#22c55e',
  },
  {
    id: 'broker',
    label: 'Broker',
    description: 'Real estate professional',
    icon: '🤝',
    color: '#f59e0b',
  },
];

const SignupScreen = ({ navigation }) => {
  const { signup, isLoading: authLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: role, 2: details

  // Validation rules for step 2
  const validationRules = {
    name: { required: true, minLength: 2, maxLength: 50 },
    email: { required: true, email: true },
    password: { required: true, minLength: 6, maxLength: 50 },
    confirmPassword: { required: true },
  };

  const initialValues = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValid,
    resetForm,
    setFieldError,
  } = useFormValidation(initialValues, validationRules);

  // Custom validation for confirm password
  const validateConfirmPassword = useCallback(() => {
    if (values.password !== values.confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match');
      return false;
    }
    setFieldError('confirmPassword', null);
    return true;
  }, [values.password, values.confirmPassword, setFieldError]);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setCurrentStep(2);
  };

  const goBackToRoleSelection = () => {
    setCurrentStep(1);
    setSelectedRole(null);
  };

  const onSignup = useCallback(async () => {
    if (!validateConfirmPassword()) return;

    setSubmitError(null);
    const success = await handleSubmit(async (formValues) => {
      const result = await signup({
        email: formValues.email,
        password: formValues.password,
        name: formValues.name,
        role: selectedRole,
      });
      if (!result) {
        throw new Error('Registration failed. Please try again.');
      }
    });

    if (!success) {
      setSubmitError('Signup failed. Please try again.');
    } else {
      resetForm();
      setSelectedRole(null);
      setCurrentStep(1);
    }
  }, [handleSubmit, signup, selectedRole, resetForm, validateConfirmPassword]);

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  // Step 1: Role Selection
  if (currentStep === 1) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Tagline */}
          <View style={styles.headerSection}>
            <Logo variant="full" size="xl" />
            <Text style={styles.tagline}>Your Property Marketplace</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>
              Choose your role to get started
            </Text>
          </View>

          {/* Role Cards */}
          <View style={styles.roleCards}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={styles.roleCard}
                onPress={() => handleRoleSelect(role.id)}
                accessibilityRole="button"
                accessibilityLabel={`Sign up as ${role.label}`}
                testID={`role-${role.id}`}
              >
                <View
                  style={[
                    styles.roleIcon,
                    { backgroundColor: `${role.color}15` },
                  ]}
                >
                  <Text style={styles.roleIconText}>{role.icon}</Text>
                </View>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Login Link */}
          <View style={styles.loginSection}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={goToLogin}
              style={styles.loginLink}
              testID="login-link"
            >
              <Text style={styles.loginLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Step 2: Registration Form
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBackToRoleSelection}
          testID="back-button"
          accessibilityLabel="Back to role selection"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* Selected Role Indicator */}
        {selectedRole && (
          <View style={styles.selectedRole}>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: ROLES.find(r => r.id === selectedRole)?.color },
              ]}
            >
              <Text style={styles.roleBadgeText}>
                {ROLES.find(r => r.id === selectedRole)?.label}
              </Text>
            </View>
          </View>
        )}

        {/* Logo */}
        <View style={styles.headerSection}>
          <Logo variant="full" size="lg" />
        </View>

        {/* Form Title */}
        <View style={styles.formTitleSection}>
          <Text style={styles.formTitle}>Complete Registration</Text>
          <Text style={styles.formSubtitle}>
            Enter your details to create your account
          </Text>
        </View>

        {/* Registration Form */}
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          <View style={styles.form}>
            {/* Name Field */}
            <Input
              {...{
                label: 'Full Name',
                placeholder: 'John Doe',
                value: values.name,
                onChangeText: (v) => handleChange('name', v),
                onBlur: () => handleBlur('name'),
                error: touched.name ? errors.name : undefined,
                autoCapitalize: 'words',
                autoCorrect: false,
                textContentType: 'name',
                required: true,
                testID: 'signup-name-input',
              }}
              returnKeyType="next"
            />

            {/* Email Field */}
            <Input
              {...{
                label: 'Email Address',
                placeholder: 'you@example.com',
                value: values.email,
                onChangeText: (v) => handleChange('email', v),
                onBlur: () => handleBlur('email'),
                error: touched.email ? errors.email : undefined,
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
                textContentType: 'emailAddress',
                required: true,
                testID: 'signup-email-input',
              }}
              returnKeyType="next"
            />

            {/* Password Field */}
            <Input
              {...{
                label: 'Password',
                placeholder: 'Create a password',
                value: values.password,
                onChangeText: (v) => handleChange('password', v),
                onBlur: () => handleBlur('password'),
                error: touched.password ? errors.password : undefined,
                showToggle: true,
                textContentType: 'newPassword',
                required: true,
                testID: 'signup-password-input',
              }}
              returnKeyType="next"
            />

            {/* Confirm Password Field */}
            <Input
              {...{
                label: 'Confirm Password',
                placeholder: 'Confirm your password',
                value: values.confirmPassword,
                onChangeText: (v) => handleChange('confirmPassword', v),
                onBlur: () => handleBlur('confirmPassword'),
                error: touched.confirmPassword ? errors.confirmPassword : undefined,
                showToggle: true,
                textContentType: 'newPassword',
                required: true,
                testID: 'signup-confirm-password-input',
              }}
              returnKeyType="go"
              onSubmitEditing={onSignup}
            />

            {/* Submit Error */}
            {submitError && (
              <View style={styles.submitError}>
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            )}

            {/* Terms & Conditions */}
            <View style={styles.terms}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Signup Button */}
            <Button
              title="Create Account"
              onPress={onSignup}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || authLoading}
              disabled={!isValid || isSubmitting || authLoading}
              testID="signup-button"
            />
          </View>
        </Card>

        {/* Login Link */}
        <View style={styles.loginSection}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={goToLogin}
            style={styles.loginLink}
            testID="login-link"
          >
            <Text style={styles.loginLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const cardBaseStyles = {
  backgroundColor: Colors.surface.light,
  borderRadius: BorderRadius.card,
  flex: 1,
  minWidth: 0,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPaddingHorizontal,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  tagline: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  welcomeTitle: {
    ...Typography.styles.h2,
    color: Colors.text.primary.light,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  roleCards: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  roleCard: {
    ...cardBaseStyles,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border.light,
    ...Shadows.sm,
  },
  roleIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  roleIconText: {
    fontSize: 32,
  },
  roleLabel: {
    ...Typography.styles.h5,
    color: Colors.text.primary.light,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  roleDescription: {
    ...Typography.styles.bodySmall,
    color: Colors.text.secondary.light,
    textAlign: 'center',
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  loginText: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
  },
  loginLink: {
    padding: 0,
  },
  loginLinkText: {
    ...Typography.styles.body,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  // Step 2 styles
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    ...Typography.styles.body,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  selectedRole: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  roleBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    ...Typography.styles.label,
    color: Colors.text.inverse.light,
    fontWeight: '600',
  },
  formTitleSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  formTitle: {
    ...Typography.styles.h3,
    color: Colors.text.primary.light,
    textAlign: 'center',
  },
  formSubtitle: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  formCard: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.inputGap,
  },
  submitError: {
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  submitErrorText: {
    ...Typography.styles.bodySmall,
    color: Colors.error,
    textAlign: 'center',
  },
  terms: {
    marginTop: Spacing.sm,
  },
  termsText: {
    ...Typography.styles.caption,
    color: Colors.text.secondary.light,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary[600],
    fontWeight: '500',
  }
 
});

export default SignupScreen;