import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { BLH_DEFAULT_TEAM_LOGO_URL } from '../lib/imagePlaceholders';

type Props = {
  logoUrl: string | null;
  teamName: string;
  primaryColor?: string | null;
  size?: number;
};

export default function TeamLogo({ logoUrl, teamName, primaryColor, size = 40 }: Props) {
  const [imageUri, setImageUri] = React.useState(logoUrl ?? BLH_DEFAULT_TEAM_LOGO_URL);
  const [showInitialsFallback, setShowInitialsFallback] = React.useState(false);

  React.useEffect(() => {
    setImageUri(logoUrl ?? BLH_DEFAULT_TEAM_LOGO_URL);
    setShowInitialsFallback(false);
  }, [logoUrl]);

  const initials = teamName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };
  const bgColor = primaryColor ?? '#22D3EE';

  if (!showInitialsFallback) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[circleStyle, styles.image]}
        onError={() => {
          if (imageUri !== BLH_DEFAULT_TEAM_LOGO_URL) {
            setImageUri(BLH_DEFAULT_TEAM_LOGO_URL);
            return;
          }

          setShowInitialsFallback(true);
        }}
      />
    );
  }

  return (
    <View style={[circleStyle, styles.fallback, { backgroundColor: bgColor }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#000000', fontWeight: '800' },
});
