import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Text, Button, Input } from '@hockey-life/ui-native';
import { useAuth } from '../../src/lib/auth/provider';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: err } = await resetPassword(email);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <View className="flex-1 bg-neutral-950 items-center justify-center px-6">
        <Text variant="h2" className="text-center mb-4">
          Reset link sent
        </Text>
        <Text variant="body" className="text-center text-neutral-400 mb-8">
          Check your email ({email}) for a password reset link.
        </Text>
        <Button title="Back to login" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-950"
    >
      <View className="flex-1 justify-center px-6">
        <Text variant="h1" className="mb-2">Reset password</Text>
        <Text variant="body" className="text-neutral-400 mb-8">
          Enter your email and we&apos;ll send you a reset link.
        </Text>

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

          {error && (
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          )}

          <Button title="Send reset link" onPress={handleReset} loading={loading} />

          <Button
            title="Back to login"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
