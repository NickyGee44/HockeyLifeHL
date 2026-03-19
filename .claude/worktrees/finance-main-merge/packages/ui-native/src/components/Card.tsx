import React from 'react';
import { View, Pressable, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'interactive';
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-neutral-850 rounded-xl border border-neutral-800',
  elevated: 'bg-neutral-900 rounded-xl border border-neutral-800 shadow-lg',
  interactive: 'bg-neutral-850 rounded-xl border border-neutral-800 active:bg-neutral-800',
};

export function Card({ variant = 'default', onPress, className, children, ...props }: CardProps) {
  const style = `${variantStyles[variant]} ${className || ''}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={style} {...props}>
        {children}
      </Pressable>
    );
  }

  return (
    <View className={style} {...props}>
      {children}
    </View>
  );
}
