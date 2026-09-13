import { Linking, Platform } from 'react-native';
import {
  checkNotifications,
  requestNotifications,
  RESULTS,
} from 'react-native-permissions';

export type NotificationStatus =
  | 'granted'
  | 'denied'       // asked and refused, but we may ask again
  | 'blocked'      // refused permanently — only system settings can change it
  | 'unavailable'
  | 'not_asked';

function mapResult(status: string): NotificationStatus {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    default:
      return 'unavailable';
  }
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  try {
    const { status } = await checkNotifications();
    // On Android 12 and below the permission does not exist, so anything the
    // library cannot determine is effectively already allowed.
    if (
      Platform.OS === 'android' &&
      Platform.Version < 33 &&
      status === RESULTS.UNAVAILABLE
    ) {
      return 'granted';
    }
    return mapResult(status);
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  try {
    const { status } = await requestNotifications(['alert', 'badge', 'sound']);
    return mapResult(status);
  } catch {
    return 'unavailable';
  }
}

export async function openSystemSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // ignore — the button simply does nothing if the OS refuses
  }
}
