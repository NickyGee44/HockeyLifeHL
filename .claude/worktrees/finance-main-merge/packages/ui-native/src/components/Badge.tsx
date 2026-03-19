import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface BadgeProps {
  label: string;
  variant?: 'gold' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, { bg: string; text: string }> = {
  gold: { bg: 'bg-gold-500/20', text: 'text-gold-400' },
  success: { bg: 'bg-green-500/20', text: 'text-green-400' },
  warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400' },
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  neutral: { bg: 'bg-neutral-700', text: 'text-neutral-300' },
};

export function Badge({ label, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  const styles = variantStyles[variant];
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  return (
    <View className={`${styles.bg} ${padding} rounded-full self-start ${className || ''}`}>
      <Text className={`${styles.text} text-xs font-semibold`}>{label}</Text>
    </View>
  );
}
