import React, { useState } from 'react';
import { View, FlatList, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, LoadingScreen } from '@hockey-life/ui-native';
import { useAlbumWithPhotos } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';
import { PhotoViewer } from '../../../../../src/components/gallery/PhotoViewer';
import type { GalleryPhoto } from '@hockey-life/data';

const screenWidth = Dimensions.get('window').width;
const GAP = 4;
const COLUMNS = 3;
const thumbSize = (screenWidth - GAP * (COLUMNS + 1)) / COLUMNS;

export default function AlbumDetailScreen() {
  const { albumId } = useLocalSearchParams<{ albumId: string }>();
  const { data, isLoading } = useAlbumWithPhotos(supabase, albumId);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (isLoading) return <LoadingScreen />;
  if (!data) return <LoadingScreen message="Album not found" />;

  const { album, photos } = data;

  const renderPhoto = ({ item, index }: { item: GalleryPhoto; index: number }) => (
    <Pressable
      onPress={() => setViewerIndex(index)}
      style={{ width: thumbSize, height: thumbSize, margin: GAP / 2 }}
    >
      <Image
        source={{ uri: item.thumbnail_url || item.url }}
        style={{ width: thumbSize, height: thumbSize, borderRadius: 4 }}
        contentFit="cover"
        alt="Gallery photo"
      />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4">
        <Pressable onPress={() => router.back()} className="mb-3" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1">{album.title}</Text>
        {album.description && (
          <Text variant="caption" className="mt-1">{album.description}</Text>
        )}
        <Text variant="caption" className="mt-1 text-neutral-500">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        contentContainerStyle={{ paddingHorizontal: GAP / 2, paddingBottom: 32 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Ionicons name="images-outline" size={48} color="#525252" />
            <Text variant="caption" className="mt-3">No photos in this album</Text>
          </View>
        }
      />

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          visible
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}
