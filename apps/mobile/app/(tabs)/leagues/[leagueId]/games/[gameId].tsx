import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text, TeamLogo, Badge, Card, LoadingScreen } from '@hockey-life/ui-native';
import { useGamePreview, usePlayerTeams, useMyCheckins, useUpdateCheckin } from '@hockey-life/data';
import { useAuth } from '../../../../../src/lib/auth/provider';
import { supabase } from '../../../../../src/lib/supabase/client';
import { CheckinButtons } from '../../../../../src/components/game/CheckinButtons';
import { CheckinList } from '../../../../../src/components/game/CheckinList';
import { generateGameIcal } from '../../../../../src/lib/calendar/ical';
import { shareIcalFile } from '../../../../../src/lib/calendar/export';
import type { CheckinStatus } from '@hockey-life/data';

export default function GameDetailScreen() {
  const { leagueId, gameId } = useLocalSearchParams<{ leagueId: string; gameId: string }>();
  const { user } = useAuth();
  const { data: game, isLoading } = useGamePreview(supabase, gameId);
  const { data: playerTeams } = usePlayerTeams(supabase, user?.id);

  // Determine the user's team in this game
  const userTeamId = useMemo(() => {
    if (!game || !playerTeams) return undefined;
    for (const pt of playerTeams) {
      const teamId = (pt as any).team_id ?? (pt as any).id;
      if (teamId === game.home_team_id || teamId === game.away_team_id) {
        return teamId as string;
      }
    }
    return undefined;
  }, [game, playerTeams]);

  const { data: myCheckins } = useMyCheckins(supabase, user?.id, userTeamId);
  const updateCheckin = useUpdateCheckin(
    supabase,
    user?.id || '',
    gameId || '',
    userTeamId || '',
  );

  if (isLoading) return <LoadingScreen />;
  if (!game) return <LoadingScreen message="Game not found" />;

  const isCompleted = game.status === 'completed' || game.status === 'pending_verification';
  const isLive = game.status === 'in_progress';
  const gameDate = new Date(game.scheduled_at);
  const currentStatus: CheckinStatus | null = myCheckins?.[game.id] ?? null;

  const handleStatusChange = (status: CheckinStatus) => {
    updateCheckin.mutate({ status });
  };

  const handleAddToCalendar = async () => {
    const icalContent = generateGameIcal(game);
    await shareIcalFile(icalContent, `game-${game.id}.ics`);
  };

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-4 pb-6">
        <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>

        {/* Status */}
        <View className="items-center mb-6">
          {isLive && <Badge label="LIVE" variant="error" size="md" />}
          {isCompleted && <Badge label="FINAL" variant="neutral" size="md" />}
          {!isLive && !isCompleted && (
            <Text variant="caption" className="text-gold-500">
              {format(gameDate, 'EEEE, MMMM d · h:mm a')}
            </Text>
          )}
        </View>

        {/* Scoreboard */}
        <Card variant="elevated" className="p-6">
          <View className="flex-row items-center justify-between">
            {/* Away */}
            <View className="items-center flex-1">
              <Pressable
                onPress={() => router.push(`/(tabs)/leagues/${leagueId}/teams/${game.away_team_id}` as any)}
              >
                <TeamLogo
                  uri={game.away_team?.logo}
                  teamName={game.away_team?.name}
                  size="xl"
                  teamColor={game.away_team?.colors?.split(',')[0]}
                />
              </Pressable>
              <Text variant="body" className="mt-2 text-neutral-200 text-center" numberOfLines={1}>
                {game.away_team?.name}
              </Text>
              {game.away_team?.division && (
                <Text variant="caption" className="text-xs">{game.away_team.division.name}</Text>
              )}
            </View>

            {/* Score */}
            <View className="items-center px-4">
              {(isCompleted || isLive) ? (
                <View className="flex-row items-center gap-3">
                  <Text className={`text-4xl font-bold ${(game.away_score ?? 0) > (game.home_score ?? 0) ? 'text-white' : 'text-neutral-500'}`}>
                    {game.away_score ?? 0}
                  </Text>
                  <Text className="text-2xl text-neutral-600">-</Text>
                  <Text className={`text-4xl font-bold ${(game.home_score ?? 0) > (game.away_score ?? 0) ? 'text-white' : 'text-neutral-500'}`}>
                    {game.home_score ?? 0}
                  </Text>
                </View>
              ) : (
                <Text className="text-2xl text-neutral-500 font-bold">VS</Text>
              )}
              {isLive && game.period && (
                <Text variant="caption" className="text-red-400 mt-1">
                  P{game.period} {game.period_time || ''}
                </Text>
              )}
            </View>

            {/* Home */}
            <View className="items-center flex-1">
              <Pressable
                onPress={() => router.push(`/(tabs)/leagues/${leagueId}/teams/${game.home_team_id}` as any)}
              >
                <TeamLogo
                  uri={game.home_team?.logo}
                  teamName={game.home_team?.name}
                  size="xl"
                  teamColor={game.home_team?.colors?.split(',')[0]}
                />
              </Pressable>
              <Text variant="body" className="mt-2 text-neutral-200 text-center" numberOfLines={1}>
                {game.home_team?.name}
              </Text>
              {game.home_team?.division && (
                <Text variant="caption" className="text-xs">{game.home_team.division.name}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Game info */}
        <Card className="mt-4 p-4">
          <View className="gap-3">
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#737373" />
              <Text variant="body" className="ml-3 text-neutral-300">
                {format(gameDate, 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#737373" />
              <Text variant="body" className="ml-3 text-neutral-300">
                {format(gameDate, 'h:mm a')}
              </Text>
            </View>
            {game.venue && (
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={16} color="#737373" />
                <Text variant="body" className="ml-3 text-neutral-300">
                  {game.venue}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Add to Calendar */}
        {!isCompleted && (
          <Pressable
            onPress={handleAddToCalendar}
            className="mt-3 flex-row items-center justify-center py-3 rounded-xl border border-neutral-700"
          >
            <Ionicons name="calendar" size={18} color="#D4AF37" />
            <Text variant="body" className="ml-2 text-gold-400 font-medium">
              Add to Calendar
            </Text>
          </Pressable>
        )}

        {/* RSVP section - only if user is on a team in this game */}
        {userTeamId && !isCompleted && (
          <Card className="mt-4 p-4">
            <Text variant="body" className="text-neutral-200 font-semibold mb-3">
              RSVP
            </Text>
            <CheckinButtons
              currentStatus={currentStatus}
              onStatusChange={handleStatusChange}
              loading={updateCheckin.isPending}
            />
          </Card>
        )}

        {/* Check-in lists */}
        <CheckinList
          supabase={supabase}
          gameId={game.id}
          teamId={game.away_team_id}
          teamName={game.away_team?.name || 'Away'}
        />
        <CheckinList
          supabase={supabase}
          gameId={game.id}
          teamId={game.home_team_id}
          teamName={game.home_team?.name || 'Home'}
        />
      </View>
    </ScrollView>
  );
}
