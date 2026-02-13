import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/lib/auth/provider';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  title: { color: '#D4AF37', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#737373', fontSize: 14, marginTop: 8 },
  form: { gap: 16 },
  label: { color: '#a3a3a3', fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fafafa',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#0a0a0a', fontSize: 16, fontWeight: '700' },
  link: { paddingVertical: 8 },
  linkText: { color: '#D4AF37', fontSize: 14, textAlign: 'center' },
  forgotText: { color: '#737373', fontSize: 14, textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },
  magicText: { color: '#a3a3a3', fontSize: 16, textAlign: 'center', marginBottom: 32 },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineButtonText: { color: '#D4AF37', fontSize: 16, fontWeight: '600' },
});

export default function LoginScreen() {
  const { signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'password' | 'magic-link'>('password');

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    if (mode === 'magic-link') {
      const { error: err } = await signInWithMagicLink(email);
      if (err) {
        setError(err.message);
      } else {
        setMagicLinkSent(true);
      }
    } else {
      if (!password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.message);
      }
    }

    setLoading(false);
  };

  if (magicLinkSent) {
    return (
      <View cssInterop={false} style={[styles.container, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }]}>
        <RNText cssInterop={false} style={[styles.title, { fontSize: 24 }]}>Check your email</RNText>
        <RNText cssInterop={false} style={styles.magicText}>
          We sent a login link to {email}. Click the link to sign in.
        </RNText>
        <Pressable
          cssInterop={false}
          style={styles.outlineButton}
          onPress={() => {
            setMagicLinkSent(false);
            setMode('password');
          }}
        >
          <RNText cssInterop={false} style={styles.outlineButtonText}>Back to login</RNText>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      cssInterop={false}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#ff0000' }}
    >
      <View cssInterop={false} style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#0a0a0a' }}>
        {/* Logo area */}
        <View cssInterop={false} style={styles.logoArea}>
          <RNText cssInterop={false} style={{ color: '#D4AF37', fontSize: 28, fontWeight: 'bold' }}>HockeyLifeHL TEST</RNText>
          <RNText cssInterop={false} style={{ color: '#737373', fontSize: 14, marginTop: 8 }}>Sign in to your account</RNText>
        </View>

        {/* Form */}
        <View cssInterop={false} style={styles.form}>
          <View cssInterop={false}>
            <RNText cssInterop={false} style={styles.label}>Email</RNText>
            <TextInput
              cssInterop={false}
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#525252"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {mode === 'password' && (
            <View cssInterop={false}>
              <RNText cssInterop={false} style={styles.label}>Password</RNText>
              <TextInput
                cssInterop={false}
                style={styles.input}
                placeholder="Your password"
                placeholderTextColor="#525252"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>
          )}

          {error && <RNText cssInterop={false} style={styles.errorText}>{error}</RNText>}

          <Pressable cssInterop={false} style={styles.button} onPress={handleSignIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <RNText cssInterop={false} style={styles.buttonText}>
                {mode === 'magic-link' ? 'Send magic link' : 'Sign in'}
              </RNText>
            )}
          </Pressable>

          <Pressable
            cssInterop={false}
            style={styles.link}
            onPress={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
          >
            <RNText cssInterop={false} style={styles.linkText}>
              {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
            </RNText>
          </Pressable>

          {mode === 'password' && (
            <Pressable cssInterop={false} style={styles.link} onPress={() => router.push('/(auth)/forgot-password')}>
              <RNText cssInterop={false} style={styles.forgotText}>Forgot password?</RNText>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
