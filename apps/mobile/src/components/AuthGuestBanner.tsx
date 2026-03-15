import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';

/**
 * Banner shown when the user is browsing in guest mode (not authenticated).
 * Tapping "Sign In" exits guest mode and returns to the auth flow.
 */
export default function AuthGuestBanner() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>Sign in to unlock all features</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandArena,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
