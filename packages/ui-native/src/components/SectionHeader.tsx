import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHeader({ title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <View className={`flex-row items-center justify-between py-2 ${className || ''}`}>
      <Text variant="h3">{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-sm text-gold-500 font-medium">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
