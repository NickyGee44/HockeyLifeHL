import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, Divider } from '@hockey-life/ui-native';
import {
  requestAccountDeletion,
  cancelAccountDeletion,
  getAccountDeletionStatus,
} from '../../../src/lib/account/delete-account';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, danger }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3.5 px-4 active:bg-neutral-800">
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#a3a3a3'} />
      <Text className={`flex-1 ml-3 text-base ${danger ? 'text-red-400' : 'text-neutral-200'}`}>{label}</Text>
      {value && <Text variant="caption" className="mr-2">{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color="#525252" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const [deletionStatus, setDeletionStatus] = useState<{
    hasPendingDeletion: boolean;
    scheduledFor?: string;
    daysRemaining?: number;
  } | null>(null);

  useEffect(() => {
    getAccountDeletionStatus().then(setDeletionStatus);
  }, []);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Your account will be scheduled for deletion in 30 days. You can cancel during the grace period.\n\nAll your personal data will be permanently removed after 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Reason (Optional)',
              'Tell us why you\'re leaving — it helps us improve:',
              [
                { text: 'Skip', onPress: () => confirmDeletion() },
                { text: 'Submit', onPress: (reason?: string) => confirmDeletion(reason) },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const confirmDeletion = async (reason?: string) => {
    const result = await requestAccountDeletion(reason);
    if (result.success) {
      Alert.alert(
        'Account Deletion Scheduled',
        'Your account will be deleted in 30 days. You will now be signed out.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to request account deletion');
    }
  };

  const handleCancelDeletion = () => {
    Alert.alert(
      'Cancel Deletion',
      'Restore your account and cancel the pending deletion?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Restore Account',
          onPress: async () => {
            const result = await cancelAccountDeletion();
            if (result.success) {
              Alert.alert('Account Restored', 'Your account deletion has been cancelled.');
              getAccountDeletionStatus().then(setDeletionStatus);
            } else {
              Alert.alert('Error', result.error || 'Failed to cancel deletion');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Settings</Text>
      </View>

      {/* Pending Deletion Banner */}
      {deletionStatus?.hasPendingDeletion && (
        <View className="mx-5 mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <Text className="text-yellow-400 font-semibold text-base mb-1">
            Account Deletion Pending
          </Text>
          <Text className="text-yellow-300/80 text-sm mb-3">
            Your account will be deleted on{' '}
            {new Date(deletionStatus.scheduledFor!).toLocaleDateString()}.{' '}
            {deletionStatus.daysRemaining} day(s) remaining.
          </Text>
          <Pressable
            onPress={handleCancelDeletion}
            className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg py-2 px-4 self-start"
          >
            <Text className="text-yellow-300 text-sm font-medium">Cancel Deletion</Text>
          </Pressable>
        </View>
      )}

      <View className="mx-5 mt-4 mb-6">
        <Text variant="label" className="mb-2 px-4">ABOUT</Text>
        <Card>
          <MenuItem
            icon="information-circle-outline"
            label="App Version"
            value={appVersion}
            onPress={() => {}}
          />
          <Divider />
          <MenuItem
            icon="globe-outline"
            label="Visit Website"
            onPress={() => Linking.openURL('https://beerleaguehockey.ca')}
          />
          <Divider />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://beerleaguehockey.ca/privacy')}
          />
          <Divider />
          <MenuItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://beerleaguehockey.ca/terms')}
          />
        </Card>
      </View>

      <View className="mx-5 mb-6">
        <Text variant="label" className="mb-2 px-4">SUPPORT</Text>
        <Card>
          <MenuItem
            icon="help-circle-outline"
            label="Help & FAQ"
            onPress={() => Linking.openURL('https://beerleaguehockey.ca/help')}
          />
          <Divider />
          <MenuItem
            icon="mail-outline"
            label="Contact Us"
            onPress={() => Linking.openURL('mailto:support@beerleaguehockey.ca')}
          />
        </Card>
      </View>

      <View className="mx-5 mb-6">
        <Text variant="label" className="mb-2 px-4">ACCOUNT & PRIVACY</Text>
        <Card>
          {!deletionStatus?.hasPendingDeletion && (
            <MenuItem
              icon="trash-outline"
              label="Delete Account"
              onPress={handleDeleteAccount}
              danger
            />
          )}
          {deletionStatus?.hasPendingDeletion && (
            <MenuItem
              icon="refresh-outline"
              label="Cancel Account Deletion"
              onPress={handleCancelDeletion}
            />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
