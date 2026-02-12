import React from 'react';
import { View, Pressable } from 'react-native';
import { format } from 'date-fns';
import { Text } from './Text';
import { TeamLogo } from './TeamLogo';
import { Badge } from './Badge';

interface GameCardTeam {
  name: string;
  logo?: string | null;
  colors?: string | null;
  score?: number | null;
}

interface GameCardProps {
  homeTeam: GameCardTeam;
  awayTeam: GameCardTeam;
  scheduledAt: string;
  venue?: string | null;
  status: string;
  onPress?: () => void;
  className?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'in_progress':
      return { label: 'LIVE', variant: 'error' as const };
    case 'completed':
    case 'pending_verification':
      return { label: 'FINAL', variant: 'neutral' as const };
    case 'postponed':
      return { label: 'PPD', variant: 'warning' as const };
    case 'cancelled':
      return { label: 'CAN', variant: 'error' as const };
    default:
      return null;
  }
}

export function GameCard({
  homeTeam,
  awayTeam,
  scheduledAt,
  venue,
  status,
  onPress,
  className,
}: GameCardProps) {
  const isCompleted = status === 'completed' || status === 'pending_verification';
  const isLive = status === 'in_progress';
  const statusBadge = getStatusBadge(status);
  const gameDate = new Date(scheduledAt);

  return (
    <Pressable
      onPress={onPress}
      className={`bg-neutral-850 rounded-xl border border-neutral-800 p-4 active:bg-neutral-800 ${className || ''}`}
    >
      {/* Date/Status header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text variant="caption">
          {format(gameDate, 'EEE, MMM d · h:mm a')}
        </Text>
        {statusBadge && <Badge label={statusBadge.label} variant={statusBadge.variant} />}
      </View>

      {/* Teams */}
      <View className="gap-2">
        {/* Away team */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TeamLogo
              uri={awayTeam.logo}
              teamName={awayTeam.name}
              size="sm"
              teamColor={awayTeam.colors?.split(',')[0]}
            />
            <Text variant="body" className="ml-3 flex-1 text-neutral-200" numberOfLines={1}>
              {awayTeam.name}
            </Text>
          </View>
          {(isCompleted || isLive) && (
            <Text
              variant="h3"
              className={`ml-2 min-w-[28px] text-right ${
                (awayTeam.score ?? 0) > (homeTeam.score ?? 0) ? 'text-white' : 'text-neutral-500'
              }`}
            >
              {awayTeam.score ?? 0}
            </Text>
          )}
        </View>

        {/* Home team */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TeamLogo
              uri={homeTeam.logo}
              teamName={homeTeam.name}
              size="sm"
              teamColor={homeTeam.colors?.split(',')[0]}
            />
            <Text variant="body" className="ml-3 flex-1 text-neutral-200" numberOfLines={1}>
              {homeTeam.name}
            </Text>
          </View>
          {(isCompleted || isLive) && (
            <Text
              variant="h3"
              className={`ml-2 min-w-[28px] text-right ${
                (homeTeam.score ?? 0) > (awayTeam.score ?? 0) ? 'text-white' : 'text-neutral-500'
              }`}
            >
              {homeTeam.score ?? 0}
            </Text>
          )}
        </View>
      </View>

      {/* Venue */}
      {venue && (
        <Text variant="caption" className="mt-2 text-neutral-500">
          {venue}
        </Text>
      )}
    </Pressable>
  );
}
