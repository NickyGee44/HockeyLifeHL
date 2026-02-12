import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { format, differenceInSeconds, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { Text, TeamLogo, Card } from '@hockey-life/ui-native';
import type { UpcomingGame } from '@hockey-life/data';

interface NextGameCountdownProps {
  game: UpcomingGame;
}

function getCountdown(targetDate: Date) {
  const now = new Date();
  const totalSeconds = differenceInSeconds(targetDate, now);

  if (totalSeconds <= 0) return { days: 0, hours: 0, minutes: 0, label: 'Starting now' };

  const days = differenceInDays(targetDate, now);
  const hours = differenceInHours(targetDate, now) % 24;
  const minutes = differenceInMinutes(targetDate, now) % 60;

  if (days > 0) return { days, hours, minutes, label: `${days}d ${hours}h ${minutes}m` };
  if (hours > 0) return { days, hours, minutes, label: `${hours}h ${minutes}m` };
  return { days, hours, minutes, label: `${minutes}m` };
}

export function NextGameCountdown({ game }: NextGameCountdownProps) {
  const gameDate = new Date(game.scheduled_at);
  const [countdown, setCountdown] = useState(() => getCountdown(gameDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(gameDate));
    }, 60_000); // Update every minute
    return () => clearInterval(interval);
  }, [game.scheduled_at]);

  return (
    <Card variant="elevated" className="p-5">
      <Text variant="label" className="text-gold-500 mb-3">
        NEXT GAME
      </Text>

      {/* Countdown */}
      <View className="flex-row items-center justify-center gap-4 mb-4">
        {countdown.days > 0 && (
          <View className="items-center">
            <Text variant="h1" className="text-gold-400 text-3xl">
              {countdown.days}
            </Text>
            <Text variant="caption">DAYS</Text>
          </View>
        )}
        <View className="items-center">
          <Text variant="h1" className="text-gold-400 text-3xl">
            {String(countdown.hours).padStart(2, '0')}
          </Text>
          <Text variant="caption">HRS</Text>
        </View>
        <View className="items-center">
          <Text variant="h1" className="text-gold-400 text-3xl">
            {String(countdown.minutes).padStart(2, '0')}
          </Text>
          <Text variant="caption">MIN</Text>
        </View>
      </View>

      {/* Teams */}
      <View className="flex-row items-center justify-between px-4">
        <View className="items-center flex-1">
          <TeamLogo
            uri={game.away_team?.logo}
            teamName={game.away_team?.name}
            size="lg"
            teamColor={game.away_team?.colors?.split(',')[0]}
          />
          <Text variant="body" className="mt-2 text-center text-neutral-200" numberOfLines={1}>
            {game.away_team?.name}
          </Text>
        </View>

        <View className="items-center px-4">
          <Text variant="h2" className="text-neutral-500">@</Text>
        </View>

        <View className="items-center flex-1">
          <TeamLogo
            uri={game.home_team?.logo}
            teamName={game.home_team?.name}
            size="lg"
            teamColor={game.home_team?.colors?.split(',')[0]}
          />
          <Text variant="body" className="mt-2 text-center text-neutral-200" numberOfLines={1}>
            {game.home_team?.name}
          </Text>
        </View>
      </View>

      {/* Date & venue */}
      <View className="mt-4 items-center">
        <Text variant="caption">
          {format(gameDate, 'EEEE, MMM d · h:mm a')}
        </Text>
        {game.venue && (
          <Text variant="caption" className="text-neutral-500 mt-0.5">
            {game.venue}
          </Text>
        )}
      </View>
    </Card>
  );
}
