import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Text, SectionHeader, GameCard, Card, Badge, LoadingScreen } from '@hockey-life/ui-native';
import { usePlayerLeagues, usePlayerUpcomingGames, usePlayerRecentGames, usePaymentsDue } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';
import { NextGameCountdown } from '../../../src/components/home/NextGameCountdown';
import { PaymentBanner } from '../../../src/components/home/PaymentBanner';

export default function HomeScreen() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: leagues, isLoading: leaguesLoading } = usePlayerLeagues(supabase, userId);
  const { data: upcoming, isLoading: upcomingLoading, refetch: refetchUpcoming } = usePlayerUpcomingGames(supabase, userId);
  const { data: recent, refetch: refetchRecent } = usePlayerRecentGames(supabase, userId, 5);
  const { data: paymentsDue } = usePaymentsDue(supabase, userId);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUpcoming(), refetchRecent()]);
    setRefreshing(false);
  };

  if (leaguesLoading && upcomingLoading) {
    return <LoadingScreen />;
  }

  const nextGame = upcoming?.[0];

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
      }
    >
      {/* Header */}
      <View className="px-5 pt-16 pb-4">
        <Text variant="caption" className="text-gold-500 mb-1">
          Welcome back
        </Text>
        <Text variant="h1">
          {user?.user_metadata?.full_name || 'Player'}
        </Text>
      </View>

      {/* Payment banners */}
      {paymentsDue && paymentsDue.length > 0 && (
        <View className="px-5 mb-4">
          {paymentsDue.map((payment) => (
            <PaymentBanner key={payment.id} payment={payment} />
          ))}
        </View>
      )}

      {/* Next game countdown */}
      {nextGame && (
        <View className="px-5 mb-6">
          <NextGameCountdown game={nextGame} />
        </View>
      )}

      {/* Recent results */}
      {recent && recent.length > 0 && (
        <View className="px-5 mb-6">
          <SectionHeader
            title="Recent Results"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/schedule')}
          />
          <View className="gap-3 mt-2">
            {recent.map((game) => (
              <GameCard
                key={game.id}
                homeTeam={{
                  name: game.home_team?.name || 'TBD',
                  logo: game.home_team?.logo,
                  colors: game.home_team?.colors,
                  score: game.home_score,
                }}
                awayTeam={{
                  name: game.away_team?.name || 'TBD',
                  logo: game.away_team?.logo,
                  colors: game.away_team?.colors,
                  score: game.away_score,
                }}
                scheduledAt={game.scheduled_at}
                venue={game.venue}
                status={game.status}
                onPress={() => router.push(`/(tabs)/leagues/[leagueId]/games/${game.id}` as any)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Upcoming games */}
      {upcoming && upcoming.length > 1 && (
        <View className="px-5 mb-6">
          <SectionHeader
            title="Upcoming Games"
            actionLabel="See all"
            onAction={() => router.push('/(tabs)/schedule')}
          />
          <View className="gap-3 mt-2">
            {upcoming.slice(1, 4).map((game) => (
              <GameCard
                key={game.id}
                homeTeam={{
                  name: game.home_team?.name || 'TBD',
                  logo: game.home_team?.logo,
                  colors: game.home_team?.colors,
                }}
                awayTeam={{
                  name: game.away_team?.name || 'TBD',
                  logo: game.away_team?.logo,
                  colors: game.away_team?.colors,
                }}
                scheduledAt={game.scheduled_at}
                venue={game.venue}
                status={game.status}
                onPress={() => router.push(`/(tabs)/leagues/[leagueId]/games/${game.id}` as any)}
              />
            ))}
          </View>
        </View>
      )}

      {/* My leagues */}
      {leagues && leagues.length > 0 && (
        <View className="px-5">
          <SectionHeader
            title="My Leagues"
            actionLabel="View all"
            onAction={() => router.push('/(tabs)/leagues')}
          />
          <View className="gap-3 mt-2">
            {leagues.map((league) => (
              <Card
                key={league.id}
                variant="interactive"
                onPress={() => router.push(`/(tabs)/leagues/${league.id}` as any)}
                className="p-4 flex-row items-center"
              >
                <View className="flex-1">
                  <Text variant="body" className="text-neutral-100 font-medium">
                    {league.name}
                  </Text>
                  {league.city && (
                    <Text variant="caption" className="mt-0.5">
                      {league.city}{league.state ? `, ${league.state}` : ''}
                    </Text>
                  )}
                </View>
                <Badge label={league.status} variant="gold" />
              </Card>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
