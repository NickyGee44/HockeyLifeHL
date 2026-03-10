import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', user.id);
    }
  } catch (_) {}

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

export async function scheduleGameReminder(game: { id: string; scheduledAt: string; homeTeam: string; awayTeam: string }) {
  const gameTime = new Date(game.scheduledAt);
  const twoHoursBefore = new Date(gameTime.getTime() - 2 * 60 * 60 * 1000);
  if (twoHoursBefore <= new Date()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Game Today!',
      body: `${game.awayTeam} @ ${game.homeTeam} starts in 2 hours`,
      data: { gameId: game.id },
    },
    trigger: { date: twoHoursBefore } as any,
  });
}

export async function cancelAllGameReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
