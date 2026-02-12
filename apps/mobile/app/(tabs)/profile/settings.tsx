import React from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, Divider } from '@hockey-life/ui-native';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}

function MenuItem({ icon, label, value, onPress }: MenuItemProps) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3.5 px-4 active:bg-neutral-800">
      <Ionicons name={icon} size={20} color="#a3a3a3" />
      <Text className="flex-1 ml-3 text-base text-neutral-200">{label}</Text>
      {value && <Text variant="caption" className="mr-2">{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color="#525252" />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView className="flex-1 bg-neutral-950" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="px-5 pt-16 pb-4 flex-row items-center">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#a3a3a3" />
        </Pressable>
        <Text variant="h1" className="ml-4">Settings</Text>
      </View>

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
    </ScrollView>
  );
}
