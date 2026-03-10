import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import blhLogo from '../../../assets/blh-logo.png';
import colors from '../../theme/colors';

export default function SplashScreen({ navigation }: { navigation: any }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={blhLogo} style={styles.logo} />
      <Text style={styles.title}>BLH</Text>
      <Text style={styles.subtitle}>Beer League Hockey</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
