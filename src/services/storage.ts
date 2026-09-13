import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  user: '@zaltrix/user',
  session: '@zaltrix/session',
  language: '@zaltrix/language',
  theme: '@zaltrix/theme',
  securityConfig: '@zaltrix/security',
  notificationPrefs: '@zaltrix/notification-prefs',
  onboarded: '@zaltrix/onboarded',
  enrolledFaces: '@zaltrix/enrolled-faces',
  attendanceLog: '@zaltrix/attendance-log',
} as const;

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage failures are non-fatal — the app still works for this session.
  }
}

export async function remove(...keys: string[]): Promise<void> {
  try {
    await AsyncStorage.removeMany(keys);
  } catch {
    // ignore
  }
}
