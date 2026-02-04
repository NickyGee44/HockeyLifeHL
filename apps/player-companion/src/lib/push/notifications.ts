/**
 * Push Notification Service
 * Handles Web Push API integration for game reminders and score updates
 */

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type NotificationType = 'game_reminder' | 'score_update' | 'schedule_change';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }
  return Notification.requestPermission();
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    // Create new subscription
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

/**
 * Show a local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Notifications are not supported');
  }

  const permission = getNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    ...options,
  });
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Format subscription for API transmission
 */
export function serializeSubscription(
  subscription: PushSubscription
): PushSubscriptionData {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      p256dh: json.keys?.p256dh || '',
      auth: json.keys?.auth || '',
    },
  };
}

/**
 * Pre-defined notification templates
 */
export const notificationTemplates = {
  gameReminder24h: (opponent: string, time: string): NotificationPayload => ({
    type: 'game_reminder',
    title: 'Game Tomorrow',
    body: `You play ${opponent} at ${time}`,
    tag: 'game-reminder-24h',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'directions', title: 'Get Directions' },
    ],
  }),

  gameReminder2h: (opponent: string, venue: string): NotificationPayload => ({
    type: 'game_reminder',
    title: 'Game in 2 Hours',
    body: `vs ${opponent} at ${venue}`,
    tag: 'game-reminder-2h',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'directions', title: 'Get Directions' },
    ],
  }),

  scoreUpdate: (
    homeTeam: string,
    awayTeam: string,
    homeScore: number,
    awayScore: number
  ): NotificationPayload => ({
    type: 'score_update',
    title: 'Final Score',
    body: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
    tag: 'score-update',
    actions: [{ action: 'view', title: 'View Game' }],
  }),

  scheduleChange: (
    changeType: 'rescheduled' | 'cancelled',
    opponent: string,
    newInfo?: string
  ): NotificationPayload => ({
    type: 'schedule_change',
    title: changeType === 'cancelled' ? 'Game Cancelled' : 'Game Rescheduled',
    body:
      changeType === 'cancelled'
        ? `Game vs ${opponent} has been cancelled`
        : `Game vs ${opponent} moved to ${newInfo}`,
    tag: 'schedule-change',
    actions: [{ action: 'view', title: 'View Schedule' }],
  }),
};
