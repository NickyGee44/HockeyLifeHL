import React from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Card, Divider, LoadingScreen } from '@hockey-life/ui-native';
import { useCurrentPlayer, usePlayerTeams } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3.5 px-4 active:bg-neutral-800"
    >
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#a3a3a3'} />
      <Text
        className={`flex-1 ml-3 text-base ${danger ? 'text-red-400' : 'text-neutral-200'}`}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#525252" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useCurrentPlayer(supabase, user?.id);
  const { data: teams } = usePlayerTeams(supabase, user?.id);

  if (isLoading) return <LoadingScreen />;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="items-center pt-4 pb-6 px-5">
        <Avatar uri={profile?.avatar_url} name={profile?.full_name} size="xl" />
        <Text variant="h1" className="mt-4">
          {profile?.full_name || 'Player'}
        </Text>
        <Text variant="caption" className="mt-1">
          {user?.email}
        </Text>
      </View>

      {/* Teams */}
      {teams && teams.length > 0 && (
        <View className="mx-5 mb-6">
          <Text variant="label" className="mb-2 px-4">MY TEAMS</Text>
          <Card>
            {teams.map((team, i) => (
              <React.Fragment key={team.id}>
                {i > 0 && <Divider />}
                <View className="flex-row items-center py-3 px-4">
                  <Text variant="body" className="flex-1 text-neutral-200">
                    {team.name}
                  </Text>
                  {team.division && (
                    <Text variant="caption">{team.division.name}</Text>
                  )}
                </View>
              </React.Fragment>
            ))}
          </Card>
        </View>
      )}

      {/* Menu sections */}
      <View className="mx-5 mb-6">
        <Text variant="label" className="mb-2 px-4">ACCOUNT</Text>
        <Card>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => router.push('/(tabs)/profile/edit' as any)}
          />
          <Divider />
          <MenuItem
            icon="card-outline"
            label="Payment History"
            onPress={() => router.push('/(tabs)/profile/payments' as any)}
          />
          <Divider />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => router.push('/(tabs)/profile/notifications' as any)}
          />
        </Card>
      </View>

      <View className="mx-5 mb-6">
        <Text variant="label" className="mb-2 px-4">APP</Text>
        <Card>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/(tabs)/profile/settings' as any)}
          />
          <Divider />
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            danger
          />
        </Card>
      </View>
    </ScrollView>
  );
}
