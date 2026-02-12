import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs', imageSize: 32 },
  md: { container: 'w-10 h-10', text: 'text-sm', imageSize: 40 },
  lg: { container: 'w-14 h-14', text: 'text-lg', imageSize: 56 },
  xl: { container: 'w-20 h-20', text: 'text-2xl', imageSize: 80 },
};

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ uri, name, size = 'md', className }: AvatarProps) {
  const { container, text, imageSize } = sizeMap[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={`${container} rounded-full ${className || ''}`}
        style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
        contentFit="cover"
        placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
        transition={200}
      />
    );
  }

  return (
    <View
      className={`${container} rounded-full bg-neutral-800 items-center justify-center ${className || ''}`}
    >
      <Text className={`${text} text-gold-500 font-bold`}>{getInitials(name)}</Text>
    </View>
  );
}
