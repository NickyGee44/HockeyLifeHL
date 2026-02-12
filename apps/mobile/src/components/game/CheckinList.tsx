import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, Card } from '@hockey-life/ui-native';
import { useGameCheckins } from '@hockey-life/data';
import type { SupabaseClientArg, GameCheckin, CheckinStatus } from '@hockey-life/data';

interface CheckinListProps {
  supabase: SupabaseClientArg;
  gameId: string;
  teamId: string;
  teamName: string;
}

const statusConfig: Record<CheckinStatus, { label: string; icon: string; color: string }> = {
  confirmed: { label: 'In', icon: 'checkmark-circle', color: '#22c55e' },
  tentative: { label: 'Maybe', icon: 'help-circle', color: '#eab308' },
  out: { label: 'Out', icon: 'close-circle', color: '#ef4444' },
};

const statusOrder: CheckinStatus[] = ['confirmed', 'tentative', 'out'];

export function CheckinList({ supabase, gameId, teamId, teamName }: CheckinListProps) {
  const { data: checkins } = useGameCheckins(supabase, gameId, teamId);
  const [expanded, setExpanded] = useState(false);

  if (!checkins || checkins.length === 0) return null;

  const grouped = statusOrder.reduce(
    (acc, status) => {
      acc[status] = checkins.filter((c) => c.status === status);
      return acc;
    },
    {} as Record<CheckinStatus, GameCheckin[]>,
  );

  const confirmedCount = grouped.confirmed.length;
  const totalCount = checkins.length;

  return (
    <Card className="mt-3 p-4">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center">
          <Text variant="body" className="text-neutral-200 font-semibold">
            {teamName}
          </Text>
          <Text variant="caption" className="ml-2">
            {confirmedCount}/{totalCount} in
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#737373"
        />
      </Pressable>

      {expanded && (
        <View className="mt-3">
          {statusOrder.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const config = statusConfig[status];

            return (
              <View key={status} className="mb-3">
                <View className="flex-row items-center mb-2">
                  <Ionicons name={config.icon as any} size={14} color={config.color} />
                  <Text variant="caption" className="ml-1" style={{ color: config.color }}>
                    {config.label} ({items.length})
                  </Text>
                </View>
                {items.map((checkin) => (
                  <View key={checkin.id} className="flex-row items-center py-1.5 pl-5">
                    <Avatar
                      uri={checkin.profile?.avatar_url}
                      name={checkin.profile?.full_name}
                      size="sm"
                    />
                    <Text variant="body" className="ml-2 text-neutral-300 text-sm">
                      {checkin.profile?.full_name || 'Unknown Player'}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
