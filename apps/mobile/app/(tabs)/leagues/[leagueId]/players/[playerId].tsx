import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Badge, StatCard, Card, SectionHeader, LoadingScreen } from '@hockey-life/ui-native';
import { usePlayerProfile, usePlayerCareerStats, usePlayerGameLog, usePlayerBadges, useCurrentSeason } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';

const BADGE_LABELS: Record<string, string> = {
  championship: 'Champion',
  top_scorer: 'Top Scorer',
  points_leader: 'Points Leader',
  top_goalie: 'Top Goalie',
  iron_man: 'Iron Man',
  most_assists: 'Playmaker',
  best_plus_minus: 'Best +/-',
  penalty_free: 'Penalty Free',
  team_mvp: 'Team MVP',
  rookie_of_the_year: 'Rookie',
  hall_of_fame: 'HOF',
  shutout_king: 'Shutout King',
};

export default function PlayerProfileScreen() {
  const { leagueId, playerId } = useLocalSearchParams<{ leagueId: string; playerId: string }>();
  const { data: player, isLoading } = usePlayerProfile(supabase, playerId);
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const { data: careerStats } = usePlayerCareerStats(supabase, playerId);
  const { data: gameLog } = usePlayerGameLog(supabase, playerId, season?.id);
  const { data: badges } = usePlayerBadges(supabase, playerId);

  if (isLoading) return <LoadingScreen />;
  if (!player) return <LoadingScreen message="Player not found" />;

  // Aggregate current season stats from game log
  const currentStats = gameLog?.reduce(
    (acc, g) => ({
      gp: acc.gp + 1,
      goals: acc.goals + g.goals,
      assists: acc.assists + g.assists,
      points: acc.points + g.points,
      pim: acc.pim + (g.penalty_minutes || 0),
      plusMinus: acc.plusMinus + g.plus_minus,
    }),
    { gp: 0, goals: 0, assists: 0, points: 0, pim: 0, plusMinus: 0 },
  ) || { gp: 0, goals: 0, assists: 0, points: 0, pim: 0, plusMinus: 0 };

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="px-5 pt-16 pb-6">
        <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <View className="flex-row items-center">
          <Avatar uri={player.profile?.avatar_url} name={player.profile?.full_name} size="xl" />
          <View className="flex-1 ml-4">
            <Text variant="h1">{player.profile?.full_name || 'Unknown'}</Text>
            <View className="flex-row items-center mt-1 gap-2">
              {player.jersey_number != null && (
                <Badge label={`#${player.jersey_number}`} variant="gold" />
              )}
              {player.position && <Badge label={player.position} variant="neutral" />}
              {player.leadership_role && (
                <Badge
                  label={player.leadership_role === 'captain' ? 'Captain' : 'Alternate'}
                  variant="gold"
                />
              )}
            </View>
            {player.team && (
              <Text variant="caption" className="mt-1">{player.team.name}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Season stats */}
      <View className="px-5 mb-6">
        <SectionHeader title="Season Stats" />
        <View className="flex-row gap-2 mt-2">
          <StatCard label="GP" value={currentStats.gp} className="flex-1" />
          <StatCard label="G" value={currentStats.goals} className="flex-1" />
          <StatCard label="A" value={currentStats.assists} className="flex-1" />
          <StatCard label="PTS" value={currentStats.points} highlighted className="flex-1" />
          <StatCard label="PIM" value={currentStats.pim} className="flex-1" />
        </View>
      </View>

      {/* Badges */}
      {badges && badges.length > 0 && (
        <View className="px-5 mb-6">
          <SectionHeader title="Badges" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
            {badges.map((badge) => (
              <Card key={badge.id} className="mr-3 p-3 items-center min-w-[80px]">
                <Ionicons name="medal" size={24} color="#D4AF37" />
                <Text variant="caption" className="mt-1 text-center text-gold-400">
                  {BADGE_LABELS[badge.badge_type] || badge.badge_type}
                </Text>
                {badge.season && (
                  <Text variant="caption" className="text-xs text-neutral-500">{badge.season.name}</Text>
                )}
              </Card>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Game log */}
      {gameLog && gameLog.length > 0 && (
        <View className="px-5">
          <SectionHeader title="Game Log" />
          <View className="mt-2">
            {/* Header */}
            <View className="flex-row py-2 border-b border-neutral-800">
              <Text variant="label" className="flex-1">Date</Text>
              <Text variant="label" className="w-6 text-center">R</Text>
              <Text variant="label" className="w-8 text-center">G</Text>
              <Text variant="label" className="w-8 text-center">A</Text>
              <Text variant="label" className="w-8 text-center">P</Text>
              <Text variant="label" className="w-8 text-center">+/-</Text>
            </View>
            {gameLog.slice(0, 15).map((entry, i) => (
              <View
                key={entry.game_id}
                className={`flex-row py-2.5 ${i % 2 !== 0 ? 'bg-neutral-900/50' : ''}`}
              >
                <Text variant="caption" className="flex-1 text-neutral-300">
                  {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </Text>
                <Text
                  className={`w-6 text-center text-xs font-bold ${
                    entry.result === 'W' ? 'text-green-400' : entry.result === 'L' ? 'text-red-400' : 'text-neutral-400'
                  }`}
                >
                  {entry.result}
                </Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{entry.goals}</Text>
                <Text variant="body" className="w-8 text-center text-neutral-300 text-sm">{entry.assists}</Text>
                <Text variant="body" className="w-8 text-center text-gold-400 text-sm font-semibold">{entry.points}</Text>
                <Text
                  className={`w-8 text-center text-sm ${
                    entry.plus_minus > 0 ? 'text-green-400' : entry.plus_minus < 0 ? 'text-red-400' : 'text-neutral-500'
                  }`}
                >
                  {entry.plus_minus > 0 ? `+${entry.plus_minus}` : entry.plus_minus}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
