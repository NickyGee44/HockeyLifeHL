import React from 'react';
import { View, TextInput, type TextInputProps } from 'react-native';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <View className={className}>
      {label && (
        <Text variant="label" className="mb-1.5 text-neutral-400">
          {label}
        </Text>
      )}
      <View className={`flex-row items-center bg-neutral-850 border rounded-xl px-4 py-3 ${error ? 'border-red-500' : 'border-neutral-700'}`}>
        {icon && <View className="mr-3">{icon}</View>}
        <TextInput
          className="flex-1 text-base text-neutral-100"
          placeholderTextColor="#737373"
          {...props}
        />
      </View>
      {error && (
        <Text className="mt-1 text-xs text-red-400">{error}</Text>
      )}
    </View>
  );
}
