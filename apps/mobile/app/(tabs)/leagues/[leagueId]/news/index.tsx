import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { supabase } from '../../../../../src/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getNewsArticles } from '@hockey-life/data/queries';
import type { NewsArticle } from '@hockey-life/data';

export default function NewsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: articles, isLoading } = useQuery({
    queryKey: ['news', leagueId],
    queryFn: () => getNewsArticles(supabase, leagueId!),
    enabled: !!leagueId,
  });

  const renderArticle = ({ item }: { item: NewsArticle }) => (
    <Card
      variant="interactive"
      className="mx-5 mb-3 overflow-hidden"
      onPress={() => router.push(`/(tabs)/leagues/${leagueId}/news/${item.slug || item.id}` as any)}
    >
      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={{ width: '100%', height: 160 }}
          contentFit="cover"
          alt={item.title || 'News article image'}
        />
      )}
      <View className="p-4">
        <Text variant="body" className="text-neutral-100 font-semibold" numberOfLines={2}>
          {item.title}
        </Text>
        {item.excerpt && (
          <Text variant="caption" className="mt-1" numberOfLines={2}>
            {item.excerpt}
          </Text>
        )}
        <Text variant="caption" className="mt-2 text-neutral-500">
          {item.published_at ? format(new Date(item.published_at), 'MMM d, yyyy') : ''}
        </Text>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">News</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={articles || []}
          renderItem={renderArticle}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="No news" description="Articles will appear here when published." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
