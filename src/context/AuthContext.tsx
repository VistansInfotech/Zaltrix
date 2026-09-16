import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { randomHex } from '../services/crypto';
import * as secure from '../services/secureStore';
import { readJSON, remove, StorageKeys, writeJSON } from '../services/storage';
import {
  AppStatus,
  AuthError,
  DEFAULT_SECURITY,
  Gender,
  SecurityConfig,
  UnlockMethod,
  User,
  UserRole,
} from '../types';
import { DEFAULT_ROLE } from '../types';

/**
 * Everything the sign-up form collects.
 *
 * An object rather than a growing list of positional arguments: the form now
 * gathers six things, and `signUp(name, email, password, role, dob, gender)`
 * is a call nobody can read and a pair of adjacent strings anyone can swap.
 */
export type SignUpDetails = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  /** `YYYY-MM-DD`, or null when not given. */
  dateOfBirth?: string | null;
  gender?: Gender | null;
};

type Result = { ok: true } | { ok: false; error: AuthError };

type AuthValue = {
  status: AppStatus;
  user: User | null;
  security: SecurityConfig;
  signUp: (details: SignUpDetails) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  /** Marks security setup complete and moves the app to the dashboard. */
  completeSecuritySetup: (config: Partial<SecurityConfig>) => Promise<void>;
  updateSecurity: (config: Partial<SecurityConfig>) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatar' | 'phone' | 'position'>>) => Promise<void>;
  unlock: () => void;
  lock: () => void;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

/** Grace period before a backgrounded app re-locks, so quick app switches don't nag. */
const LOCK_GRACE_MS = 30_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AppStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [security, setSecurity] = useState<SecurityConfig>(DEFAULT_SECURITY);

  const backgroundedAt = useRef<number | null>(null);
  const statusRef = useRef<AppStatus>('loading');
  statusRef.current = status;
  const securityRef = useRef<SecurityConfig>(security);
  securityRef.current = security;

  /* ------------------------------ bootstrap ----------------------------- */

  useEffect(() => {
    (async () => {
      const [storedUser, storedSecurity, hasSession] = await Promise.all([
        readJSON<User | null>(StorageKeys.user, null),
        readJSON<SecurityConfig>(StorageKeys.securityConfig, DEFAULT_SECURITY),
        readJSON<boolean>(StorageKeys.session, false),
      ]);

      setSecurity(storedSecurity);

      // One-time migration for accounts created before roles existed.
      //
      // Those accounts already had the run of the app, so leaving them without
      // a role would quietly take capability away from someone who had it.
      // Only an account with no role at all is upgraded — a stored 'user' is a
      // deliberate choice and is never promoted.
      const migrated =
        storedUser && storedUser.role === undefined
          ? { ...storedUser, role: 'admin' as const }
          : storedUser;
      if (migrated !== storedUser) {
        await writeJSON(StorageKeys.user, migrated);
      }

      if (!migrated || !hasSession) {
        setUser(migrated);
        setStatus('signedOut');
        return;
      }

      setUser(migrated);

      if (!storedSecurity.configured) {
        setStatus('needsSecurity');
        return;
      }

      // A returning session always starts locked when an unlock method exists.
      const hasUnlock =
        storedSecurity.biometricEnabled || storedSecurity.pinEnabled;
      setStatus(hasUnlock ? 'locked' : 'ready');
    })();
  }, []);

  /* --------------------------- background lock -------------------------- */

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const cfg = securityRef.current;
      const hasUnlock = cfg.biometricEnabled || cfg.pinEnabled;

      if (next === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;

        if (
          hasUnlock &&
          statusRef.current === 'ready' &&
          since !== null &&
          Date.now() - since > LOCK_GRACE_MS
        ) {
          setStatus('locked');
        }
      } else if (next === 'background') {
        backgroundedAt.current = Date.now();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  /* -------------------------------- auth -------------------------------- */

  const signUp = useCallback(
    async ({
      name,
      email,
      password,
      role = DEFAULT_ROLE,
      dateOfBirth = null,
      gender = null,
    }: SignUpDetails): Promise<Result> => {
      const normalised = email.trim().toLowerCase();
      const existing = await secure.hasStoredAccount();

      if (existing === normalised) {
        return { ok: false, error: 'accountExists' };
      }

      // A new sign-up replaces any previous device account and its secrets.
      await secure.clearAllSecrets();
      const saved = await secure.savePassword(normalised, password);
      if (!saved) {
        return { ok: false, error: 'unknown' };
      }

      const nextUser: User = {
        id: randomHex(12),
        name: name.trim(),
        email: normalised,
        createdAt: new Date().toISOString(),
        role,
        dateOfBirth,
        gender,
      };

      await Promise.all([
        writeJSON(StorageKeys.user, nextUser),
        writeJSON(StorageKeys.session, true),
        writeJSON(StorageKeys.securityConfig, DEFAULT_SECURITY),
      ]);

      setUser(nextUser);
      setSecurity(DEFAULT_SECURITY);
      setStatus('needsSecurity');
      return { ok: true };
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<Result> => {
      const normalised = email.trim().toLowerCase();
      const valid = await secure.verifyPassword(normalised, password);

      if (!valid) {
        return { ok: false, error: 'invalidCredentials' };
      }

      const storedUser = await readJSON<User | null>(StorageKeys.user, null);
      const nextUser: User = storedUser ?? {
        id: randomHex(12),
        name: normalised.split('@')[0],
        email: normalised,
        createdAt: new Date().toISOString(),
        // Reconstructed on login when the stored record is missing. It gets
        // the ordinary role: inventing an admin here would hand out the
        // enrolment tools to an account nobody granted them to.
        role: DEFAULT_ROLE,
      };

      const storedSecurity = await readJSON<SecurityConfig>(
        StorageKeys.securityConfig,
        DEFAULT_SECURITY,
      );

      await Promise.all([
        writeJSON(StorageKeys.user, nextUser),
        writeJSON(StorageKeys.session, true),
      ]);

      setUser(nextUser);
      setSecurity(storedSecurity);
      setStatus(storedSecurity.configured ? 'ready' : 'needsSecurity');
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    // The password stays in the keychain so the user can sign back in offline;
    // only the session and the app PIN are cleared.
    await Promise.all([
      remove(StorageKeys.session),
      writeJSON(StorageKeys.securityConfig, DEFAULT_SECURITY),
      secure.clearPin(),
    ]);
    setSecurity(DEFAULT_SECURITY);
    setStatus('signedOut');
  }, []);

  /* ------------------------------ security ------------------------------ */

  const persistSecurity = useCallback(async (next: SecurityConfig) => {
    setSecurity(next);
    await writeJSON(StorageKeys.securityConfig, next);
  }, []);

  const completeSecuritySetup = useCallback(
    async (config: Partial<SecurityConfig>) => {
      const next: SecurityConfig = {
        ...securityRef.current,
        ...config,
        configured: true,
      };
      await persistSecurity(next);
      setStatus('ready');
    },
    [persistSecurity],
  );

  const updateSecurity = useCallback(
    async (config: Partial<SecurityConfig>) => {
      await persistSecurity({ ...securityRef.current, ...config });
    },
    [persistSecurity],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'name' | 'avatar' | 'phone' | 'position'>>) => {
      setUser(prev => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, ...patch };
        void writeJSON(StorageKeys.user, next);
        return next;
      });
    },
    [],
  );

  const unlock = useCallback(() => setStatus('ready'), []);
  const lock = useCallback(() => setStatus('locked'), []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      security,
      signUp,
      login,
      logout,
      completeSecuritySetup,
      updateSecurity,
      updateProfile,
      unlock,
      lock,
    }),
    [
      status,
      user,
      security,
      signUp,
      login,
      logout,
      completeSecuritySetup,
      updateSecurity,
      updateProfile,
      unlock,
      lock,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

export type { UnlockMethod };
