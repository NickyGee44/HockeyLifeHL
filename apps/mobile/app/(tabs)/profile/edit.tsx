import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Button, Input } from '@hockey-life/ui-native';
import { useCurrentPlayer, useUpdateProfile } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const { data: profile } = useCurrentPlayer(supabase, user?.id);
  const updateProfile = useUpdateProfile(supabase, user?.id || '');

  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPosition(profile.position || '');
    }
  }, [profile]);

  const handleSave = async () => {
    const result = await updateProfile.mutateAsync({
      full_name: fullName,
      position,
    });

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      router.back();
    }
  };

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Edit Profile</Text>
      </View>

      <View className="items-center py-6">
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="xl" />
        <Pressable className="mt-2">
          <Text className="text-gold-500 text-sm font-medium">Change photo</Text>
        </Pressable>
      </View>

      <View className="px-5 gap-4">
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
        />

        <Input
          label="Email"
          value={user?.email || ''}
          editable={false}
          className="opacity-50"
        />

        <Input
          label="Position"
          value={position}
          onChangeText={setPosition}
          placeholder="C, LW, RW, D, G"
        />

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={updateProfile.isPending}
          className="mt-4"
        />
      </View>
    </ScrollView>
  );
}
