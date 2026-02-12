import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Input } from '@hockey-life/ui-native';
import { useAuth } from '../../src/lib/auth/provider';

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
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Text variant="h1" className="text-center mb-4">
          Check your email
        </Text>
        <Text variant="body" className="text-center text-neutral-400 mb-8">
          We sent a login link to {email}. Click the link to sign in.
        </Text>
        <Button
          title="Back to login"
          variant="outline"
          onPress={() => {
            setMagicLinkSent(false);
            setMode('password');
          }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo area */}
        <View className="items-center mb-12">
          <Text variant="h1" className="text-gold-500 text-3xl font-bold">
            HockeyLifeHL
          </Text>
          <Text variant="caption" className="mt-2">
            Sign in to your account
          </Text>
        </View>

        {/* Form */}
        <View className="gap-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {mode === 'password' && (
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          )}

          {error && (
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          )}

          <Button
            title={mode === 'magic-link' ? 'Send magic link' : 'Sign in'}
            onPress={handleSignIn}
            loading={loading}
            className="mt-2"
          />

          <Pressable
            onPress={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
            className="py-2"
          >
            <Text className="text-center text-gold-500 text-sm">
              {mode === 'password' ? 'Sign in with magic link instead' : 'Sign in with password instead'}
            </Text>
          </Pressable>

          {mode === 'password' && (
            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              className="py-2"
            >
              <Text className="text-center text-neutral-500 text-sm">
                Forgot password?
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
