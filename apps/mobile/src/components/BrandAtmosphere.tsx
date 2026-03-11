import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import colors from '../theme/colors';

type BrandAtmosphereProps = {
  accentColor?: string;
  secondaryColor?: string;
  intensity?: 'low' | 'medium' | 'high';
};

const OPACITY_MAP = {
  low: { top: '18', bottom: '12', orb: '10' },
  medium: { top: '28', bottom: '1A', orb: '14' },
  high: { top: '38', bottom: '24', orb: '1C' },
} as const;

export default function BrandAtmosphere({
  accentColor = colors.brandRink,
  secondaryColor = colors.brandArena,
  intensity = 'medium',
}: BrandAtmosphereProps) {
  const opacity = OPACITY_MAP[intensity];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[colors.bgBase, '#08111E', '#050911']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${accentColor}${opacity.top}`, 'transparent']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.8, y: 0.65 }}
        style={styles.topGlow}
      />
      <LinearGradient
        colors={[`${secondaryColor}${opacity.bottom}`, 'transparent']}
        start={{ x: 0.2, y: 0.15 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.bottomGlow}
      />
      <View style={[styles.orb, styles.orbLeft, { backgroundColor: `${accentColor}${opacity.orb}` }]} />
      <View style={[styles.orb, styles.orbRight, { backgroundColor: `${secondaryColor}${opacity.orb}` }]} />
      <View style={styles.sheen} />
    </View>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    top: -70,
    left: -32,
    width: 300,
    height: 240,
    borderRadius: 999,
  },
  bottomGlow: {
    position: 'absolute',
    right: -50,
    bottom: -120,
    width: 340,
    height: 260,
    borderRadius: 999,
  },
  orb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  orbLeft: {
    top: '26%',
    left: -100,
  },
  orbRight: {
    right: -86,
    bottom: '18%',
  },
  sheen: {
    position: 'absolute',
    top: 112,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: colors.glassHighlight,
    transform: [{ rotate: '-7deg' }],
  },
});
