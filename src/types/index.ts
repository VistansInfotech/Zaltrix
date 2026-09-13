export type User = {
  id: string;
  name: string;
  email: string;
  /**
   * Profile picture as a `data:image/...;base64,` URI, or null for none.
   *
   * Held inline rather than as a file path: it is a small square thumbnail, it
   * travels with the user record through one AsyncStorage write, and there is
   * no orphaned file to clean up when the account is removed.
   */
  avatar?: string | null;
  /** Contact number, free-form so international formats survive. */
  phone?: string | null;
  /** Job title / role, e.g. "Operations Manager". */
  position?: string | null;
  /** ISO timestamp of account creation. */
  createdAt: string;
  /**
   * What this account may do. Chosen at sign-up and fixed afterwards.
   *
   * Optional because accounts created before roles existed have none stored;
   * `roleOf()` treats those as plain users rather than silently granting
   * admin to whoever happens to be signed in.
   */
  role?: UserRole;
};

/**
 * `admin` runs enrolment and sees everyone's records; `user` can only mark
 * their own attendance.
 */
export type UserRole = 'admin' | 'user';

/** The role to assume when an account predates roles, or none is stored. */
export const DEFAULT_ROLE: UserRole = 'user';

/** Reads an account's role without trusting it to be present. */
export function roleOf(user: { role?: UserRole } | null | undefined): UserRole {
  return user?.role ?? DEFAULT_ROLE;
}

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
