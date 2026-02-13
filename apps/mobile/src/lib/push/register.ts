import * as Notifications from 'expo-notifications';
import * as Device from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';

/**
 * Configure notification handler (call once at app start)
 */
export function configurePushNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request push notification permissions and register device token.
 * Stores token in push_device_tokens table via Supabase.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.default.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Get the Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Device.default.expoConfig?.extra?.eas?.projectId,
  });
  const token = tokenData.data;

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
    });
  }

  // Register token in database
  await supabase.from('push_device_tokens').upsert(
    {
      user_id: userId,
      device_token: token,
      platform: Platform.OS as 'ios' | 'android',
      app_version: Device.default.expoConfig?.version ?? '1.0.0',
      is_active: true,
    },
    { onConflict: 'user_id,device_token' },
  );

  return token;
}

/**
 * Deactivate push token (on logout)
 */
export async function deactivatePushToken(userId: string, token: string) {
  await supabase
    .from('push_device_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('device_token', token);
}
