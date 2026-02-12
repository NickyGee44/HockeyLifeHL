import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <View className={`items-center justify-center py-12 px-6 ${className || ''}`}>
      {icon && <View className="mb-4">{icon}</View>}
      <Text variant="h3" className="text-center mb-2">
        {title}
      </Text>
      {description && (
        <Text variant="caption" className="text-center mb-6 max-w-[280px]">
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}
