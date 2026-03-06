import React from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Text, Card, TeamLogo, Badge, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { usePlayerLeagues } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';
import type { League } from '@hockey-life/data';

export default function LeaguesScreen() {
  const { user } = useAuth();
  const { data: leagues, isLoading, refetch } = usePlayerLeagues(supabase, user?.id);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) return <LoadingScreen />;

  const renderLeague = ({ item }: { item: League }) => (
    <Card
      variant="interactive"
      onPress={() => router.push(`/(tabs)/leagues/${item.id}` as any)}
      className="mx-5 mb-3 p-4 flex-row items-center"
    >
      <TeamLogo
        uri={item.logo_url}
        teamName={item.name}
        size="lg"
        teamColor={item.primary_color}
      />
      <View className="flex-1 ml-4">
        <Text variant="body" className="text-neutral-100 font-semibold">
          {item.name}
        </Text>
        {item.city && (
          <Text variant="caption" className="mt-0.5">
            {item.city}{item.state ? `, ${item.state}` : ''}
          </Text>
        )}
        {item.description && (
          <Text variant="caption" className="mt-1" numberOfLines={1}>
            {item.description}
          </Text>
        )}
      </View>
      <Badge label="Active" variant="gold" />
    </Card>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-4 pb-4">
        <Text variant="h1">Leagues</Text>
      </View>

      <FlatList
        data={leagues || []}
        renderItem={renderLeague}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
        ListEmptyComponent={
          <EmptyState
            title="No leagues yet"
            description="You'll see your leagues here once you join a team."
          />
        }
      />
    </View>
  );
}
