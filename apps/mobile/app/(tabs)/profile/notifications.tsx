import React, { useState } from 'react';
import { View, ScrollView, Switch, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, Divider } from '@hockey-life/ui-native';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onValueChange }: ToggleRowProps) {
  return (
    <View className="flex-row items-center py-3 px-4">
      <View className="flex-1 mr-4">
        <Text variant="body" className="text-neutral-200">{label}</Text>
        <Text variant="caption" className="mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#404040', true: '#D4AF37' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [gameReminders, setGameReminders] = useState(true);
  const [scores, setScores] = useState(true);
  const [payments, setPayments] = useState(true);
  const [announcements, setAnnouncements] = useState(true);

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-4 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Notifications</Text>
      </View>

      <View className="mx-5 mt-4">
        <Text variant="label" className="mb-2 px-4">PUSH NOTIFICATIONS</Text>
        <Card>
          <ToggleRow
            label="Game Reminders"
            description="Get notified before your upcoming games"
            value={gameReminders}
            onValueChange={setGameReminders}
          />
          <Divider />
          <ToggleRow
            label="Live Scores"
            description="Get notified when games finish"
            value={scores}
            onValueChange={setScores}
          />
          <Divider />
          <ToggleRow
            label="Payment Reminders"
            description="Get notified about upcoming payment deadlines"
            value={payments}
            onValueChange={setPayments}
          />
          <Divider />
          <ToggleRow
            label="League Announcements"
            description="News and updates from your leagues"
            value={announcements}
            onValueChange={setAnnouncements}
          />
        </Card>
      </View>
    </ScrollView>
  );
}
