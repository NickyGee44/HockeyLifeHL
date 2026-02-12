import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@hockey-life/ui-native';
import type { CheckinStatus } from '@hockey-life/data';

interface CheckinButtonsProps {
  currentStatus: CheckinStatus | null;
  onStatusChange: (status: CheckinStatus) => void;
  loading?: boolean;
}

const buttons: { status: CheckinStatus; label: string; icon: string; activeColor: string; activeBg: string }[] = [
  { status: 'confirmed', label: 'IN', icon: 'checkmark-circle', activeColor: '#22c55e', activeBg: 'rgba(34,197,94,0.15)' },
  { status: 'tentative', label: 'MAYBE', icon: 'help-circle', activeColor: '#eab308', activeBg: 'rgba(234,179,8,0.15)' },
  { status: 'out', label: 'OUT', icon: 'close-circle', activeColor: '#ef4444', activeBg: 'rgba(239,68,68,0.15)' },
];

export function CheckinButtons({ currentStatus, onStatusChange, loading }: CheckinButtonsProps) {
  if (loading) {
    return (
      <View className="flex-row justify-center py-3">
        <ActivityIndicator size="small" color="#D4AF37" />
      </View>
    );
  }

  return (
    <View className="flex-row gap-3">
      {buttons.map((btn) => {
        const isActive = currentStatus === btn.status;
        return (
          <Pressable
            key={btn.status}
            onPress={() => onStatusChange(btn.status)}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl border"
            style={{
              backgroundColor: isActive ? btn.activeBg : 'transparent',
              borderColor: isActive ? btn.activeColor : '#404040',
            }}
          >
            <Ionicons
              name={btn.icon as any}
              size={18}
              color={isActive ? btn.activeColor : '#737373'}
            />
            <Text
              variant="body"
              className="ml-1.5 font-semibold text-sm"
              style={{ color: isActive ? btn.activeColor : '#737373' }}
            >
              {btn.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
