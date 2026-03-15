import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../../lib/supabase/client';
import colors from '../../theme/colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = React.useState('');
  const [focusedInput, setFocusedInput] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errorMessage) setErrorMessage(null);
  };

  const handleResetPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'blh://auth/reset-callback',
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setIsSuccess(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.heading}>Reset Password</Text>
        <Text style={styles.subheading}>
          Enter your email address and we'll send you a link to reset your password.
        </Text>

        {isSuccess ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.accentGreen} />
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to {email.trim()}. Check your inbox and follow the
              instructions.
            </Text>
            <Pressable style={styles.backToLoginButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backToLoginText}>Back to Sign In</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, focusedInput ? styles.inputFocused : undefined]}
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => setFocusedInput(true)}
              onBlur={() => setFocusedInput(false)}
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable
              style={styles.submitButton}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.submitButtonText}>Send Reset Link</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.bgSurface,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  errorText: {
    marginBottom: 12,
    color: colors.accentRed,
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 4,
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: 14,
  },
  submitButtonText: {
    color: colors.textOnPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: 24,
    gap: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  successText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  backToLoginButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  backToLoginText: {
    color: colors.textInteractive,
    fontWeight: '700',
    fontSize: 15,
  },
});
