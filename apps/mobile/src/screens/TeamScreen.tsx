import React from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Avatar from '../components/Avatar';
import GuestBanner from '../components/GuestBanner';
import TeamLogo from '../components/TeamLogo';
import SectionHeader from '../components/SectionHeader';
import { useLeague } from '../context/LeagueContext';
import { getTeamRoster, getUserTeamInLeague, type RosterMemberRow } from '../lib/supabase/data';
import { navigateToPlayerCard } from '../navigation/playerCard';
import colors from '../theme/colors';
import { supabase } from '../lib/supabase/client';

type GlobalTeamCard = {
  leagueId: string;
  leagueName: string;
  leagueCity: string | null;
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
  jerseyNumber: number | null;
  position: string | null;
};

export default function TeamScreen({ navigation }: { navigation: any }) {
  const { activeLeague, activeTheme, isGuestLeague, availableLeagues, setActiveLeague } = useLeague();
  const [roster, setRoster] = React.useState<RosterMemberRow[]>([]);
  const [teamName, setTeamName] = React.useState('My Team');
  const [teamColor, setTeamColor] = React.useState<string | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = React.useState<string | null>(null);
  const [userTeamId, setUserTeamId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [globalTeams, setGlobalTeams] = React.useState<GlobalTeamCard[]>([]);
  const [globalLoading, setGlobalLoading] = React.useState(false);

  React.useEffect(() => {
    if (!activeLeague) {
      setRoster([]);
      if (availableLeagues.length === 0) {
        setGlobalTeams([]);
        return;
      }

      setGlobalLoading(true);
      supabase.auth.getUser().then(async ({ data }) => {
        const userId = data.user?.id;
        if (!userId) {
          setGlobalTeams([]);
          setGlobalLoading(false);
          return;
        }

        const { data: rosterRows } = await supabase
          .from('team_rosters')
          .select(`
            team_id, league_id, jersey_number, position,
            team:teams!team_rosters_team_id_fkey(id, name, logo_url, primary_color),
            league:leagues!team_rosters_league_id_fkey(id, name, city)
          `)
          .eq('player_id', userId)
          .eq('status', 'active');

        const cards = ((rosterRows as any[]) ?? [])
          .map((row) => {
            const team = Array.isArray(row.team) ? row.team[0] : row.team;
            const league = Array.isArray(row.league) ? row.league[0] : row.league;
            if (!team || !league) return null;

            return {
              leagueId: row.league_id,
              leagueName: league.name,
              leagueCity: league.city ?? null,
              teamId: row.team_id,
              teamName: team.name,
              teamLogoUrl: team.logo_url ?? null,
              teamPrimaryColor: team.primary_color ?? null,
              jerseyNumber: row.jersey_number ?? null,
              position: row.position ?? null,
            };
          })
          .filter(Boolean) as GlobalTeamCard[];

        setGlobalTeams(cards);
        setGlobalLoading(false);
      });
      return;
    }

    setLoading(true);

    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const userTeam = await getUserTeamInLeague(userId, activeLeague.id);
      if (!userTeam) {
        setLoading(false);
        return;
      }

      setTeamName(userTeam.team_name);
      setTeamColor(userTeam.primary_color);
      setTeamLogoUrl(userTeam.logo_url);
      setUserTeamId(userTeam.team_id);

      const members = await getTeamRoster(userTeam.team_id, activeLeague.id);
      setRoster(members);
      setLoading(false);
    });
  }, [activeLeague?.id]);

  if (!activeLeague && availableLeagues.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.backgroundColor }]} edges={['left', 'right']}>
        <View style={styles.listContent}>
          <SectionHeader title="My Team" />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Select a league to see your team</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeLeague) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgBase }]} edges={['left', 'right']}>
        <GuestBanner />
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <SectionHeader title="My Teams" />
          <Text style={styles.globalIntro}>
            Every BLH team you play on, across every league, in one place.
          </Text>

          {globalLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : globalTeams.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No active team assignments found yet</Text>
            </View>
          ) : (
            globalTeams.map((team) => (
              <Pressable
                key={`${team.leagueId}-${team.teamId}`}
                style={styles.globalTeamCard}
                onPress={() => {
                  const nextLeague = availableLeagues.find((league) => league.id === team.leagueId);
                  if (nextLeague) {
                    void setActiveLeague(nextLeague);
                  }
                  navigation.navigate('TeamDetail', { teamId: team.teamId, leagueId: team.leagueId });
                }}
              >
                <View style={styles.globalTeamHeader}>
                  <View style={styles.globalTeamIdentity}>
                    <TeamLogo
                      logoUrl={team.teamLogoUrl}
                      teamName={team.teamName}
                      primaryColor={team.teamPrimaryColor ?? colors.primary}
                      size={52}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.globalTeamName}>{team.teamName}</Text>
                      <Text style={styles.globalTeamMeta}>
                        {team.leagueName}
                        {team.leagueCity ? ` · ${team.leagueCity}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.globalPill,
                      { backgroundColor: (team.teamPrimaryColor ?? colors.primary) + '22' },
                    ]}
                  >
                    <Text style={[styles.globalPillText, { color: team.teamPrimaryColor ?? colors.primary }]}>
                      {team.position ?? 'Skater'}
                      {team.jerseyNumber ? ` · #${team.jerseyNumber}` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.globalTeamFooter}>
                  <Text style={styles.globalTeamFooterText}>Open roster, record, and upcoming games</Text>
                  <Text style={styles.globalTeamLink}>View team</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.backgroundColor }]} edges={['left', 'right']}>
        <View style={styles.listContent}>
          <SectionHeader title="My Team" />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={activeTheme.primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (roster.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.backgroundColor }]} edges={['left', 'right']}>
        <View style={styles.listContent}>
          <SectionHeader title={teamName} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No roster found for this league</Text>
        </View>
      </SafeAreaView>
    );
  }

  const primaryColor = teamColor ?? activeTheme.primaryColor;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: activeTheme.backgroundColor }]} edges={['left', 'right']}>
      <GuestBanner />
      <FlatList
        data={roster}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Pressable onPress={() => !isGuestLeague && navigation.navigate('TeamDetail', { teamId: userTeamId, leagueId: activeLeague!.id })} disabled={!userTeamId || isGuestLeague}>
              <SectionHeader title={teamName} />
            </Pressable>
            {/* Team header card with logo */}
            <View style={[styles.teamHeaderCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderCard }]}>
              <TeamLogo
                logoUrl={teamLogoUrl}
                teamName={teamName}
                primaryColor={primaryColor}
                size={64}
              />
              <View style={styles.teamHeaderInfo}>
                <Text style={styles.teamHeaderName}>{teamName}</Text>
                <Text style={styles.teamHeaderSub}>{roster.length} players</Text>
              </View>
            </View>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Roster</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.playerRow,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderCard },
              pressed && styles.playerRowPressed,
            ]}
            onPress={() => navigateToPlayerCard(navigation, { playerId: item.player_id, leagueId: activeLeague?.id ?? null })}
          >
            <Text style={[styles.jersey, { color: primaryColor }]}>
              {item.jersey_number != null ? `#${item.jersey_number}` : '—'}
            </Text>
            <Avatar
              uri={item.avatar_url ?? null}
              name={item.player_name}
              size={40}
            />
            <Text style={styles.playerName}>{item.player_name}</Text>
            <View style={styles.positionPill}>
              <Text style={styles.positionText}>{item.is_goalie ? 'G' : (item.position ?? '—')}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  globalIntro: {
    marginTop: -2,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  globalTeamCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  globalTeamHeader: { gap: 12 },
  globalTeamIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  globalTeamName: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
  globalTeamMeta: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  globalPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  globalPillText: { fontSize: 12, fontWeight: '800' },
  globalTeamFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  globalTeamFooterText: { flex: 1, fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  globalTeamLink: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  teamHeaderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  teamHeaderInfo: { flex: 1 },
  teamHeaderName: { fontSize: 20, fontWeight: '900', color: colors.textPrimary },
  teamHeaderSub: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 4 },
  cardHeader: { marginTop: 4, marginBottom: 8 },
  cardHeaderText: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  playerRow: {
    borderRadius: 14, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10,
  },
  playerRowPressed: { backgroundColor: colors.bgInteractive },
  jersey: { width: 36, fontSize: 15, fontWeight: '800' },
  playerName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  positionPill: {
    backgroundColor: colors.bgInteractive, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.borderCard,
  },
  positionText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
});
