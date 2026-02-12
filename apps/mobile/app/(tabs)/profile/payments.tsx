import React from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, Badge, LoadingScreen, EmptyState } from '@hockey-life/ui-native';
import { usePaymentHistory } from '@hockey-life/data';
import { useAuth } from '../../../src/lib/auth/provider';
import { supabase } from '../../../src/lib/supabase/client';
import type { PaymentRecord } from '@hockey-life/data/queries';

const statusVariant: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'neutral',
};

export default function PaymentsScreen() {
  const { user } = useAuth();
  const { data: payments, isLoading } = usePaymentHistory(supabase, user?.id);

  const renderPayment = ({ item }: { item: PaymentRecord }) => (
    <Card className="mx-5 mb-3 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text variant="body" className="text-neutral-200 font-medium">
            {item.description || item.league?.name || 'Payment'}
          </Text>
          <Text variant="caption" className="mt-0.5">
            {format(new Date(item.created_at), 'MMM d, yyyy')}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="body" className="text-neutral-100 font-semibold">
            ${(item.amount / 100).toFixed(2)}
          </Text>
          <Badge
            label={item.status}
            variant={statusVariant[item.status] || 'neutral'}
            size="sm"
          />
        </View>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-neutral-950">
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Payment History</Text>
      </View>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <FlatList
          data={payments || []}
          renderItem={renderPayment}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState title="No payments" description="Your payment history will appear here." />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
