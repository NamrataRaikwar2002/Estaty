/**
 * Login Screen
 * Email/password authentication with validation and navigation to signup
 */
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Logo, Divider, Card } from '../../components';
import { MOCK_USERS } from '../../constants/mockUsers';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { BorderRadius } from '../../constants/borders';

const LoginScreen = ({ navigation }) => {
  const { login, isLoading: authLoading } = useAuth();
  const [submitError, setSubmitError] = useState(null);

  // Validation rules
  const validationRules = {
    email: { required: true, email: true },
    password: { required: true, minLength: 6 },
  };

  const initialValues = {
    email: '',
    password: '',
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
  } = useFormValidation(initialValues, validationRules);

  const onLogin = useCallback(async () => {
    setSubmitError(null);
    const success = await handleSubmit(async (formValues) => {
      const result = await login(formValues.email, formValues.password, false);
      if (!result) {
        throw new Error('Invalid credentials. Please try again.');
      }
    });

    if (!success) {
      setSubmitError('Login failed. Please check your credentials.');
    } else {
      // Navigation handled by auth state change in AppNavigator
      resetForm();
    }
  }, [handleSubmit, login, resetForm]);

  const goToSignup = () => {
    navigation.navigate('Signup');
  };

  // Quick login for development/testing
  const quickLogin = useCallback(async (user) => {
    setSubmitError(null);
    const success = await login(user.email, user.password, false);
    if (!success) {
      setSubmitError(`Quick login failed for ${user.name}`);
    } else {
      resetForm();
    }
  }, [login, resetForm]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in to your ESTATY account to continue
          </Text>
        </View>

        {/* Login Form */}
        <Card variant="elevated" padding="lg" style={styles.formCard}>
          <View style={styles.form}>
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
                testID: 'login-email-input',
              }}
              returnKeyType="next"
            />

            {/* Password Field */}
            <Input
              {...{
                label: 'Password',
                placeholder: 'Enter your password',
                value: values.password,
                onChangeText: (v) => handleChange('password', v),
                onBlur: () => handleBlur('password'),
                error: touched.password ? errors.password : undefined,
                showToggle: true,
                textContentType: 'password',
                required: true,
                testID: 'login-password-input',
              }}
              returnKeyType="go"
              onSubmitEditing={onLogin}
            />

            {/* Submit Error */}
            {submitError && (
              <View style={styles.submitError}>
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            )}

            {/* Login Button */}
            <Button
              title="Sign In"
              onPress={onLogin}
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting || authLoading}
              disabled={!isValid || isSubmitting || authLoading}
              testID="login-button"
            />
          </View>
        </Card>

        {/* Divider */}
        <Divider label="or continue with" style={styles.divider} />

        {/* Social Login Buttons */}
        <View style={styles.socialButtons}>
          <Button
            title="Continue with Google"
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<Text style={styles.socialIcon}>G</Text>}
            onPress={() => {}}
            disabled={authLoading}
            testID="google-login-button"
          />
          <Button
            title="Continue with Apple"
            variant="outline"
            size="md"
            fullWidth
            leftIcon={<Text style={styles.socialIcon}></Text>}
            onPress={() => {}}
            disabled={authLoading}
            testID="apple-login-button"
          />
        </View>

        {/* Quick Login Buttons (Dev Only) */}
        {__DEV__ && (
          <View style={styles.quickLoginSection}>
            <Divider label="Quick Login (Dev)" style={styles.quickLoginDivider} />
            <View style={styles.quickLoginButtons}>
              {MOCK_USERS.map((user) => (
                <Button
                  key={user.id}
                  title={`Login as ${user.name} (${user.role})`}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onPress={() => quickLogin(user)}
                  disabled={authLoading || isSubmitting}
                  testID={`quick-login-${user.role}`}
                  style={styles.quickLoginButton}
                />
              ))}
            </View>
          </View>
        )}

        {/* Sign Up Link */}
        <View style={styles.signupSection}>
          <Text style={styles.signupText}>Don&apos;t have an account? </Text>
          <TouchableOpacity
            onPress={goToSignup}
            style={styles.signupLink}
            testID="signup-link"
          >
            <Text style={styles.signupLinkText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
  formCard: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.inputGap,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgotPasswordText: {
    ...Typography.styles.bodySmall,
    color: Colors.primary[600],
    fontWeight: '500',
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
  divider: {
    marginVertical: Spacing.md,
  },
  socialButtons: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  signupText: {
    ...Typography.styles.body,
    color: Colors.text.secondary.light,
  },
  signupLink: {
    padding: 0,
  },
  signupLinkText: {
    ...Typography.styles.body,
    color: Colors.primary[600],
    fontWeight: '600',
  },
  quickLoginSection: {
    marginBottom: Spacing.lg,
  },
  quickLoginDivider: {
    marginVertical: Spacing.md,
  },
  quickLoginButtons: {
    gap: Spacing.xs,
  },
  quickLoginButton: {
    marginBottom: Spacing.xs,
  },
});

export default LoginScreen;