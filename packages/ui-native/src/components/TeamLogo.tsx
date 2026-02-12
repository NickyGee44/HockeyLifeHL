import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from './Text';

interface TeamLogoProps {
  uri?: string | null;
  teamName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  teamColor?: string | null;
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs', imageSize: 32 },
  md: { container: 'w-12 h-12', text: 'text-base', imageSize: 48 },
  lg: { container: 'w-16 h-16', text: 'text-xl', imageSize: 64 },
  xl: { container: 'w-24 h-24', text: 'text-3xl', imageSize: 96 },
};

function getInitial(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export function TeamLogo({ uri, teamName, size = 'md', teamColor, className }: TeamLogoProps) {
  const { container, text, imageSize } = sizeMap[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        className={`${container} rounded-lg ${className || ''}`}
        style={{ width: imageSize, height: imageSize }}
        contentFit="contain"
        placeholder={{ blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I' }}
        transition={200}
      />
    );
  }

  return (
    <View
      className={`${container} rounded-lg items-center justify-center ${className || ''}`}
      style={{ backgroundColor: teamColor || '#242424' }}
    >
      <Text className={`${text} text-white font-bold`}>{getInitial(teamName)}</Text>
    </View>
  );
}
