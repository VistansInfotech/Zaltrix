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
  SecurityConfig,
  UnlockMethod,
  User,
} from '../types';

type Result = { ok: true } | { ok: false; error: AuthError };

type AuthValue = {
  status: AppStatus;
  user: User | null;
  security: SecurityConfig;
  signUp: (name: string, email: string, password: string) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  /** Marks security setup complete and moves the app to the dashboard. */
  completeSecuritySetup: (config: Partial<SecurityConfig>) => Promise<void>;
  updateSecurity: (config: Partial<SecurityConfig>) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'name'>>) => Promise<void>;
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

      if (!storedUser || !hasSession) {
        setUser(storedUser);
        setStatus('signedOut');
        return;
      }

      setUser(storedUser);

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
    async (name: string, email: string, password: string): Promise<Result> => {
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
    async (patch: Partial<Pick<User, 'name'>>) => {
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
