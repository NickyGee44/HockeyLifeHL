import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from './Text';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <ActivityIndicator size="large" color="#D4AF37" />
      {message && (
        <Text variant="caption" className="mt-4">
          {message}
        </Text>
      )}
    </View>
  );
}
