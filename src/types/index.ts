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
  /**
   * Date of birth as `YYYY-MM-DD` — a calendar date, not an instant.
   *
   * Stored without a time or a zone on purpose: a birthday is the same day
   * everywhere, and an ISO timestamp would shift it across the date line for
   * anyone who travels.
   */
  dateOfBirth?: string | null;
  gender?: Gender | null;
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
 * What an account may do.
 *
 * `admin` and `hr` are the same permissions under two job titles — HR is a
 * label on the profile, not a separate boundary — while `user` can only mark
 * their own attendance. They are still distinct values rather than one role
 * with a cosmetic name, so the day the two diverge there is something to
 * change; `canManageAttendance` is the single place that decision lives.
 */
export type UserRole = 'admin' | 'hr' | 'user';

/** Every role, in the order the sign-up form offers them. */
export const USER_ROLES: readonly UserRole[] = ['user', 'hr', 'admin'] as const;

/**
 * Whether this role runs enrolment, sees everyone's records, and sets the
 * workplace boundary — i.e. gets the Bio Attendance tab rather than the
 * cut-down one.
 *
 * Every gate in the app asks this rather than comparing to a role name, so
 * adding or re-scoping a role is one edit here and not a hunt for equality
 * checks that were each written from memory.
 */
export function canManageAttendance(role: UserRole): boolean {
  return role === 'admin' || role === 'hr';
}

/**
 * How someone describes themselves.
 *
 * `undisclosed` is a real, first-class answer rather than the absence of one,
 * so the field can be asked for without anyone being made to disclose. Absent
 * entirely means an account created before the question was asked.
 */
export type Gender = 'female' | 'male' | 'other' | 'undisclosed';

export const GENDERS: readonly Gender[] = [
  'female',
  'male',
  'other',
  'undisclosed',
] as const;

/** Nobody sensible is older than this; guards a mis-scrolled year. */
export const MAX_AGE_YEARS = 120;
/** The youngest date of birth the sign-up form will take. */
export const MIN_AGE_YEARS = 13;

/** `YYYY-MM-DD` in local time — never `toISOString`, which shifts the day. */
export function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses a `YYYY-MM-DD` key back to local midnight, or null if malformed. */
export function fromDateKey(key: string | null | undefined): Date | null {
  if (!key) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // Rejects 2024-02-31, which the Date constructor would roll into March.
  return date.getMonth() === Number(month) - 1 ? date : null;
}

/** Whole years between a date of birth and today. */
export function ageFrom(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = now.getMonth() - dateOfBirth.getMonth();
  // Birthday not yet reached this year.
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

/** The role to assume when an account predates roles, or none is stored. */
export const DEFAULT_ROLE: UserRole = 'user';

/**
 * Reads an account's role without trusting it to be present — or valid.
 *
 * The stored value is JSON on disk. Anything that is not a role this build
 * knows about falls back to the lesser privilege, so a corrupted, hand-edited
 * or newer-than-this-build value can never grant more than it should.
 */
export function roleOf(user: { role?: UserRole } | null | undefined): UserRole {
  const stored = user?.role;
  return stored && USER_ROLES.includes(stored) ? stored : DEFAULT_ROLE;
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
