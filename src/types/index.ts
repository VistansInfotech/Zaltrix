export type User = {
  id: string;
  name: string;
  email: string;
  /** ISO timestamp of account creation. */
  createdAt: string;
};

export type UnlockMethod = 'biometric' | 'pin';

export type SecurityConfig = {
  /** True once the user has completed (or explicitly skipped) the setup step. */
  configured: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  preferredMethod: UnlockMethod | null;
};

export const DEFAULT_SECURITY: SecurityConfig = {
  configured: false,
  biometricEnabled: false,
  pinEnabled: false,
  preferredMethod: null,
};

export type NotificationPrefs = {
  updates: boolean;
  security: boolean;
  reminders: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  updates: true,
  security: true,
  reminders: false,
};

/** Top-level gate that decides which navigator is mounted. */
export type AppStatus =
  | 'loading'
  | 'signedOut'
  | 'needsSecurity'
  | 'locked'
  | 'ready';

export type AuthError =
  | 'accountExists'
  | 'invalidCredentials'
  | 'unknown';
