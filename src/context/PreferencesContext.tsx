import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { I18nManager } from 'react-native';

import {
  applyLanguage,
  i18n,
  LanguageCode,
  LanguagePreference,
  resolveLanguage,
} from '../i18n';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPrefs,
} from '../types';
import { readJSON, StorageKeys, writeJSON } from '../services/storage';

type PreferencesValue = {
  ready: boolean;
  /** What the user picked — may be 'system'. */
  languagePreference: LanguagePreference;
  /** The concrete language currently rendering. */
  language: LanguageCode;
  /** True when the chosen language flipped layout direction and needs a restart. */
  rtlRestartRequired: boolean;
  setLanguage: (pref: LanguagePreference) => Promise<void>;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  /** Bumped on every language change so consumers re-render translated strings. */
  localeVersion: number;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const PreferencesContext = createContext<PreferencesValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [languagePreference, setLanguagePreference] =
    useState<LanguagePreference>('system');
  const [language, setLanguageState] = useState<LanguageCode>('en');
  const [rtlRestartRequired, setRtlRestartRequired] = useState(false);
  const [localeVersion, setLocaleVersion] = useState(0);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(
    DEFAULT_NOTIFICATION_PREFS,
  );

  useEffect(() => {
    (async () => {
      const [storedLang, storedPrefs] = await Promise.all([
        readJSON<LanguagePreference>(StorageKeys.language, 'system'),
        readJSON<NotificationPrefs>(
          StorageKeys.notificationPrefs,
          DEFAULT_NOTIFICATION_PREFS,
        ),
      ]);

      const resolved = resolveLanguage(storedLang);
      applyLanguage(resolved);

      setLanguagePreference(storedLang);
      setLanguageState(resolved);
      setNotificationPrefs(storedPrefs);
      setLocaleVersion(v => v + 1);
      setReady(true);
    })();
  }, []);

  const setLanguage = useCallback(async (pref: LanguagePreference) => {
    const resolved = resolveLanguage(pref);
    const directionChanged = applyLanguage(resolved);

    setLanguagePreference(pref);
    setLanguageState(resolved);
    setLocaleVersion(v => v + 1);
    if (directionChanged) {
      setRtlRestartRequired(true);
    }

    await writeJSON(StorageKeys.language, pref);
  }, []);

  const setNotificationPref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      setNotificationPrefs(prev => {
        const next = { ...prev, [key]: value };
        void writeJSON(StorageKeys.notificationPrefs, next);
        return next;
      });
    },
    [],
  );

  const t = useCallback(
    (key: string, options?: Record<string, unknown>) => i18n.t(key, options),
    // localeVersion is the dependency that makes `t` a new identity per language,
    // which is what pushes memoised children to re-render with new strings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localeVersion],
  );

  const value = useMemo<PreferencesValue>(
    () => ({
      ready,
      languagePreference,
      language,
      rtlRestartRequired,
      setLanguage,
      notificationPrefs,
      setNotificationPref,
      localeVersion,
      t,
    }),
    [
      ready,
      languagePreference,
      language,
      rtlRestartRequired,
      setLanguage,
      notificationPrefs,
      setNotificationPref,
      localeVersion,
      t,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}

/** Convenience hook for components that only need translation. */
export function useT() {
  return usePreferences().t;
}

/** True when the current layout direction is right-to-left. */
export function useIsRTL(): boolean {
  usePreferences(); // re-render on locale change
  return I18nManager.isRTL;
}
