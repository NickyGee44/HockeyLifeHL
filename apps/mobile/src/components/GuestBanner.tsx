import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLeague } from '../context/LeagueContext';
import colors from '../theme/colors';

export default function GuestBanner() {
  const { activeLeague, isGuestLeague } = useLeague();

  if (!isGuestLeague || !activeLeague) return null;

  const accentColor = activeLeague.theme.primaryColor ?? colors.primary;

  function handleJoin() {
    Alert.alert(
      'Request to Join',
      `Contact your league admin to join ${activeLeague!.name}. Visit beerleaguehockey.ca to learn more.`,
    );
  }

  return (
    <View style={[styles.banner, { borderLeftColor: accentColor }]}>
      <Text style={styles.bannerText} numberOfLines={1}>
        Viewing <Text style={[styles.leagueName, { color: accentColor }]}>{activeLeague.name}</Text>
        {' · '}
        <Text style={styles.guestLabel}>Not a member</Text>
      </Text>
      <Pressable onPress={handleJoin} hitSlop={8}>
        <Text style={[styles.joinBtn, { color: accentColor }]}>Join</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgInteractive,
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 36,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  leagueName: {
    fontWeight: '800',
  },
  guestLabel: {
    color: colors.textSecondary,
  },
  joinBtn: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
});
