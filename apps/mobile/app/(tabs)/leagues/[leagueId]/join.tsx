import React, { useState } from 'react';
import { View, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  TeamLogo,
  Card,
  Badge,
  LoadingScreen,
  EmptyState,
} from '@hockey-life/ui-native';
import {
  useTeamsForJoin,
  useMyJoinRequests,
  useCurrentSeason,
  useSubmitJoinRequest,
  useCancelJoinRequest,
} from '@hockey-life/data';
import { useAuth } from '../../../../src/lib/auth/provider';
import { supabase } from '../../../../src/lib/supabase/client';
import type { TeamForJoin, TeamJoinRequest } from '@hockey-life/data';

export default function JoinTeamScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuth();
  const { data: teams, isLoading: teamsLoading } = useTeamsForJoin(supabase, leagueId);
  const { data: myRequests } = useMyJoinRequests(supabase, user?.id, leagueId);
  const { data: season } = useCurrentSeason(supabase, leagueId);
  const submitRequest = useSubmitJoinRequest(supabase, user?.id || '', leagueId || '');
  const cancelRequest = useCancelJoinRequest(supabase, user?.id || '', leagueId || '');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const pendingRequests = (myRequests || []).filter((r) => r.status === 'pending');

  const getRequestForTeam = (teamId: string): TeamJoinRequest | undefined =>
    myRequests?.find((r) => r.team_id === teamId && r.status === 'pending');

  const handleSubmit = async (teamId: string) => {
    if (!season) {
      Alert.alert('Error', 'No active season found');
      return;
    }
    const result = await submitRequest.mutateAsync({
      teamId,
      seasonId: season.id,
      message: message.trim() || undefined,
    });
    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setExpandedTeam(null);
      setMessage('');
    }
  };

  const handleCancel = (requestId: string) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this join request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => cancelRequest.mutate(requestId),
      },
    ]);
  };

  const renderTeam = ({ item }: { item: TeamForJoin }) => {
    const existingRequest = getRequestForTeam(item.id);
    const isExpanded = expandedTeam === item.id;

    return (
      <Card className="mx-5 mb-3 p-4">
        <View className="flex-row items-center">
          <TeamLogo
            uri={item.logo_url}
            teamName={item.name}
            size="md"
          />
          <View className="flex-1 ml-3">
            <Text variant="body" className="text-neutral-200 font-semibold">
              {item.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              {item.division_name && (
                <Text variant="caption" className="text-xs">{item.division_name}</Text>
              )}
              <Text variant="caption" className="text-xs text-neutral-600">
                {item.roster_count} player{item.roster_count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {existingRequest ? (
            <Pressable onPress={() => handleCancel(existingRequest.id)}>
              <Badge label="Pending" variant="warning" size="sm" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setExpandedTeam(isExpanded ? null : item.id)}
              className="px-3 py-1.5 rounded-lg bg-gold-500/10 border border-gold-500/30"
            >
              <Text className="text-gold-400 text-xs font-semibold">
                {isExpanded ? 'Cancel' : 'Join'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Expanded join form */}
        {isExpanded && !existingRequest && (
          <View className="mt-3 pt-3 border-t border-neutral-800">
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Optional message to the team..."
              placeholderTextColor="#525252"
              className="bg-neutral-900 text-neutral-200 rounded-lg px-3 py-2.5 text-sm mb-3"
              multiline
              maxLength={200}
            />
            <Pressable
              onPress={() => handleSubmit(item.id)}
              disabled={submitRequest.isPending}
              className="bg-gold-500 py-2.5 rounded-lg items-center"
              style={{ opacity: submitRequest.isPending ? 0.6 : 1 }}
            >
              <Text className="text-neutral-950 font-semibold text-sm">
                {submitRequest.isPending ? 'Sending...' : 'Request to Join'}
              </Text>
            </Pressable>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-4 pb-4">
        <Pressable onPress={() => router.back()} className="mb-3" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1">Join a Team</Text>
        {season && (
          <Text variant="caption" className="mt-1 text-gold-500">{season.name}</Text>
        )}
      </View>

      {/* Pending requests banner */}
      {pendingRequests.length > 0 && (
        <Card className="mx-5 mb-4 p-3 border-gold-500/20">
          <Text variant="caption" className="text-gold-400 font-medium mb-1">
            Pending Requests ({pendingRequests.length})
          </Text>
          {pendingRequests.map((req) => (
            <View key={req.id} className="flex-row items-center justify-between py-1">
              <Text variant="caption" className="text-neutral-400">
                {req.team?.name || 'Unknown Team'}
              </Text>
              <Pressable onPress={() => handleCancel(req.id)}>
                <Text variant="caption" className="text-red-400 text-xs">Cancel</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      {teamsLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={teams || []}
          renderItem={renderTeam}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="No teams available"
              description="There are no teams accepting players at this time."
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
