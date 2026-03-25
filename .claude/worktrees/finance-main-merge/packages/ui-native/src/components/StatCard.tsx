import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  highlighted?: boolean;
  className?: string;
}

export function StatCard({ label, value, subtitle, highlighted, className }: StatCardProps) {
  return (
    <View
      className={`items-center p-3 rounded-xl ${
        highlighted ? 'bg-gold-500/10 border border-gold-500/30' : 'bg-neutral-850 border border-neutral-800'
      } ${className || ''}`}
    >
      <Text variant="label" className="mb-1">
        {label}
      </Text>
      <Text
        variant="h2"
        className={highlighted ? 'text-gold-400' : 'text-neutral-100'}
      >
        {value}
      </Text>
      {subtitle && (
        <Text variant="caption" className="mt-0.5">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
