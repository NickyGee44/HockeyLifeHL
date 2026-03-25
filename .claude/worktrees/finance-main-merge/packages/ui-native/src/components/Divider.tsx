import React from 'react';
import { View } from 'react-native';

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <View className={`h-px bg-neutral-800 ${className || ''}`} />;
}
