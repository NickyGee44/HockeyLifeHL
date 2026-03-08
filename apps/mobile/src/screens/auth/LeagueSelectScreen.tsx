import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TeamLogo from '../../components/TeamLogo';
import { useLeague } from '../../context/LeagueContext';
import { getPublicLeagues, type LeagueRow } from '../../lib/supabase/leagues';
import colors from '../../theme/colors';

type LeagueSelectScreenProps = {
  onComplete?: () => void;
};

function InitialsCircle({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '33',
        borderWidth: 1.5,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.38, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

export default function LeagueSelectScreen({ onComplete }: LeagueSelectScreenProps) {
  const { availableLeagues, activeLeague, isLoading, setActiveLeague } = useLeague();
  const [publicLeagues, setPublicLeagues] = React.useState<LeagueRow[]>([]);
  const [publicLoading, setPublicLoading] = React.useState(true);

  React.useEffect(() => {
    getPublicLeagues()
      .then((rows) => {
        const memberIds = new Set(availableLeagues.map((l) => l.id));
        setPublicLeagues(rows.filter((r) => !memberIds.has(r.id)));
      })
      .finally(() => setPublicLoading(false));
  }, [availableLeagues]);

  function LeagueRow({ item, isActive, onPress }: { item: any; isActive: boolean; onPress: () => void }) {
    return (
      <Pressable style={styles.leagueRow} onPress={onPress}>
        {item.logoUrl ? (
          <TeamLogo
            logoUrl={item.logoUrl}
            teamName={item.name}
            primaryColor={item.theme?.primaryColor ?? colors.primary}
            size={36}
          />
        ) : (
          <InitialsCircle name={item.name} color={item.theme?.primaryColor ?? colors.primary} />
        )}
        <View style={styles.leagueRowMid}>
          <Text style={styles.leagueRowName} numberOfLines={1}>{item.name}</Text>
          {item.city ? <Text style={styles.leagueRowCity} numberOfLines={1}>{item.city}</Text> : null}
        </View>
        {isActive ? (
          <Ionicons name="checkmark-circle" size={20} color={item.theme?.primaryColor ?? colors.primary} />
        ) : (
          <Text style={styles.leagueRowEnter}>Enter</Text>
        )}
      </Pressable>
    );
  }

  function BrowseRow({ league }: { league: LeagueRow }) {
    return (
      <Pressable
        style={styles.leagueRow}
        onPress={() => {
          Linking.openURL(`https://${league.slug}.beerleaguehockey.ca`).catch(() => {});
        }}
      >
        {league.logo_url ? (
          <TeamLogo
            logoUrl={league.logo_url}
            teamName={league.name}
            primaryColor={colors.primary}
            size={36}
          />
        ) : (
          <InitialsCircle name={league.name} color={colors.primary} />
        )}
        <View style={styles.leagueRowMid}>
          <Text style={[styles.leagueRowName, { opacity: 0.7 }]} numberOfLines={1}>{league.name}</Text>
          {league.city ? <Text style={styles.leagueRowCity} numberOfLines={1}>{league.city}</Text> : null}
        </View>
        <View style={styles.guestBadge}>
          <Text style={styles.guestBadgeText}>Visit</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Choose Your League</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={availableLeagues}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>You're not in any leagues yet</Text>
              <Text style={styles.emptySubtext}>Browse below to get started.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <LeagueRow
              item={item}
              isActive={activeLeague?.id === item.id}
              onPress={() => {
                setActiveLeague(item);
                onComplete?.();
              }}
            />
          )}
          ListFooterComponent={
            <View>
              {publicLeagues.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>Browse All Leagues</Text>
                  <View style={styles.browseContainer}>
                    {publicLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
                    ) : (
                      publicLeagues.map((league, idx) => (
                        <View key={league.id}>
                          {idx > 0 ? <View style={styles.divider} /> : null}
                          <BrowseRow league={league} />
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : null}

              <Pressable
                style={styles.skipButton}
                onPress={() => {
                  setActiveLeague(null);
                  onComplete?.();
                }}
              >
                <Text style={styles.skipText}>Skip for now</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderCard,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 28,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  leagueRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: colors.bgBase,
  },
  leagueRowMid: {
    flex: 1,
  },
  leagueRowName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  leagueRowCity: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  leagueRowEnter: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  leagueRowJoin: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  guestBadge: {
    backgroundColor: colors.bgInteractive,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  guestBadgeText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderCard,
    marginLeft: 64,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  browseContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderCard,
    marginTop: 8,
  },
  skipButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
