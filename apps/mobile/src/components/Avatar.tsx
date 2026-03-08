import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { BLH_DEFAULT_PLAYER_AVATAR_URL } from '../lib/imagePlaceholders';
import colors from '../theme/colors';

type Props = {
  uri: string | null;
  name: string;
  size?: number;
  borderColor?: string;
};

export default function Avatar({ uri, name, size = 40, borderColor }: Props) {
  const [imageUri, setImageUri] = React.useState(uri ?? BLH_DEFAULT_PLAYER_AVATAR_URL);
  const [showInitialsFallback, setShowInitialsFallback] = React.useState(false);

  React.useEffect(() => {
    setImageUri(uri ?? BLH_DEFAULT_PLAYER_AVATAR_URL);
    setShowInitialsFallback(false);
  }, [uri]);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };

  if (!showInitialsFallback) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          circleStyle,
          styles.image,
          borderColor ? { borderWidth: 2, borderColor } : undefined,
        ]}
        onError={() => {
          if (imageUri !== BLH_DEFAULT_PLAYER_AVATAR_URL) {
            setImageUri(BLH_DEFAULT_PLAYER_AVATAR_URL);
            return;
          }

          setShowInitialsFallback(true);
        }}
      />
    );
  }

  return (
    <View style={[circleStyle, styles.fallback, { backgroundColor: colors.bgInteractive }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.bgInteractive,
  },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.textPrimary, fontWeight: '800' },
});
