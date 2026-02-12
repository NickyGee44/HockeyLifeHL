import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@hockey-life/ui-native';
import { openCheckout } from '../../lib/payments/checkout';
import type { PaymentDue } from '@hockey-life/data/queries';
import { useAuth } from '../../lib/auth/provider';

interface PaymentBannerProps {
  payment: PaymentDue;
}

export function PaymentBanner({ payment }: PaymentBannerProps) {
  const { user } = useAuth();
  const remaining = payment.amount_due - payment.amount_paid;
  const isOverdue = payment.status === 'overdue';

  const handlePay = () => {
    if (!user) return;
    openCheckout({
      leagueId: payment.league_id,
      seasonId: payment.season_id,
      playerId: user.id,
      amount: remaining,
    });
  };

  return (
    <Pressable
      onPress={handlePay}
      className={`flex-row items-center p-4 rounded-xl mb-2 ${
        isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-gold-500/10 border border-gold-500/30'
      }`}
    >
      <Ionicons
        name={isOverdue ? 'warning' : 'card'}
        size={20}
        color={isOverdue ? '#ef4444' : '#D4AF37'}
      />
      <View className="flex-1 ml-3">
        <Text className={`text-sm font-medium ${isOverdue ? 'text-red-400' : 'text-gold-400'}`}>
          {isOverdue ? 'Payment overdue' : 'Payment due'}
        </Text>
        <Text variant="caption">
          {payment.league?.name} · ${(remaining / 100).toFixed(2)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#737373" />
    </Pressable>
  );
}
