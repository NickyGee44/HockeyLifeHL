import React from 'react';
import { View, FlatList, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { supabase } from '../../../../../src/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getGalleryAlbums } from '@hockey-life/data/queries';
import type { GalleryAlbum } from '@hockey-life/data';

const screenWidth = Dimensions.get('window').width;
const albumWidth = (screenWidth - 20 * 2 - 12) / 2; // 2 columns with gap

export default function GalleryScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { data: albums, isLoading } = useQuery({
    queryKey: ['gallery', leagueId],
    queryFn: () => getGalleryAlbums(supabase, leagueId!),
    enabled: !!leagueId,
  });

  const renderAlbum = ({ item }: { item: GalleryAlbum }) => (
    <Card
      variant="interactive"
      className="overflow-hidden"
      style={{ width: albumWidth }}
      onPress={() => router.push(`/(tabs)/leagues/${leagueId}/gallery/${item.id}` as any)}
    >
      {item.cover_photo_url ? (
        <Image
          source={{ uri: item.cover_photo_url }}
          style={{ width: albumWidth, height: albumWidth * 0.75 }}
          contentFit="cover"
          alt={`${item.name || 'Album'} cover photo`}
        />
      ) : (
        <View
          style={{ width: albumWidth, height: albumWidth * 0.75 }}
          className="bg-neutral-800 items-center justify-center"
        >
          <Ionicons name="images" size={32} color="#525252" />
        </View>
      )}
      <View className="p-3">
        <Text variant="body" className="text-neutral-200 text-sm font-medium" numberOfLines={1}>
          {item.title}
        </Text>
        {item.photo_count != null && (
          <Text variant="caption" className="text-xs mt-0.5">
            {item.photo_count} photos
          </Text>
        )}
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Gallery</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={albums || []}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20, marginBottom: 12 }}
          ListEmptyComponent={
            <EmptyState title="No albums" description="Photo albums will appear here when published." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
