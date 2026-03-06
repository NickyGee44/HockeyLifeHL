import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/lib/auth/provider';
import { LoadingScreen } from '@hockey-life/ui-native';

export default function TabLayout() {
  const { session, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: '#0a0a0a',
          paddingTop: insets.top,
        },
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#262626',
          borderTopWidth: 1,
          height: 60 + Math.max(insets.bottom, 12),
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 8,
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Leagues',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
