import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Card, LoadingScreen } from '@hockey-life/ui-native';
import { useNewsArticle } from '@hockey-life/data';
import { supabase } from '../../../../../src/lib/supabase/client';

export default function NewsArticleScreen() {
  const { leagueId, slug } = useLocalSearchParams<{ leagueId: string; slug: string }>();
  const { data: article, isLoading } = useNewsArticle(supabase, leagueId, slug);

  if (isLoading) return <LoadingScreen />;
  if (!article) return <LoadingScreen message="Article not found" />;

  const publishedDate = article.published_at
    ? format(new Date(article.published_at), 'EEEE, MMMM d, yyyy')
    : format(new Date(article.created_at), 'EEEE, MMMM d, yyyy');

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 48 }}>
      <View className="px-5 pt-16 pb-2">
        <Pressable onPress={() => router.back()} className="mb-4" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
      </View>

      {/* Hero image */}
      {article.image_url && (
        <Image
          source={{ uri: article.image_url }}
          style={{ width: '100%', aspectRatio: 2 }}
          contentFit="cover"
          alt={article.title || 'News article image'}
        />
      )}

      <View className="px-5 pt-5">
        {/* Title */}
        <Text variant="h1" className="text-2xl leading-tight">
          {article.title}
        </Text>

        {/* Author + date row */}
        <View className="flex-row items-center mt-4 mb-6 pb-4 border-b border-neutral-800">
          {article.author && (
            <View className="flex-row items-center mr-4">
              <Avatar
                uri={article.author.avatar_url}
                name={article.author.full_name}
                size="sm"
              />
              <Text variant="caption" className="ml-2 text-neutral-400">
                {article.author.full_name}
              </Text>
            </View>
          )}
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={14} color="#737373" />
            <Text variant="caption" className="ml-1 text-neutral-500">
              {publishedDate}
            </Text>
          </View>
        </View>

        {/* Content */}
        {article.content ? (
          article.content.split('\n').map((paragraph, index) =>
            paragraph.trim() ? (
              <Text
                key={index}
                variant="body"
                className="text-neutral-300 leading-relaxed mb-4"
              >
                {paragraph}
              </Text>
            ) : (
              <View key={index} style={{ height: 8 }} />
            ),
          )
        ) : (
          <Text variant="body" className="text-neutral-500 italic">
            No content available.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
