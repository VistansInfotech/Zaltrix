import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { readJSON, StorageKeys, writeJSON } from '../services/storage';
import { AppColors, ColorScheme, schemes } from './colors';
import { shadows } from './elevation';

/** What the user picked. 'system' follows the OS appearance setting. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  'system',
  'light',
  'dark',
] as const;

type ThemeValue = {
  /** The user's choice — may be 'system'. */
  preference: ThemePreference;
  /** The concrete scheme currently rendering. */
  scheme: ColorScheme;
  isDark: boolean;
  colors: AppColors;
  shadow: (typeof shadows)['light'];
  setPreference: (pref: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Re-renders on its own whenever the OS appearance changes.
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  /** Set once the value is authoritative — hydrated from disk or chosen by the user. */
  const settled = useRef(false);

  useEffect(() => {
    (async () => {
      const stored = await readJSON<ThemePreference>(StorageKeys.theme, 'system');
      // If the user picked a theme while this read was in flight, their choice
      // wins — applying the stale stored value would silently revert them.
      if (!settled.current) {
        setPreferenceState(stored);
        settled.current = true;
      }
      // Children render immediately against the system scheme, so only a user
      // who overrode the OS setting sees a frame of the other scheme first.
    })();
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    settled.current = true;
    setPreferenceState(pref);
    await writeJSON(StorageKeys.theme, pref);
  }, []);

  const scheme: ColorScheme =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeValue>(
    () => ({
      preference,
      scheme,
      isDark: scheme === 'dark',
      colors: schemes[scheme],
      shadow: shadows[scheme],
      setPreference,
    }),
    [preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}

/** Shorthand for the common case of only needing the palette. */
export function useColors(): AppColors {
  return useTheme().colors;
}

/**
 * Builds a themed StyleSheet, rebuilding it only when the scheme changes.
 *
 * `factory` must be defined at module scope so its identity is stable —
 * an inline arrow would rebuild the sheet on every render.
 */
export function useThemedStyles<T>(factory: (c: AppColors, s: ThemeValue) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme.colors, theme), [factory, theme]);
}
