import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  Theme,
} from '@react-navigation/native';

import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import LockScreen from '../screens/security/LockScreen';
import {
  AppColors,
  spacing,
  typography,
  useTheme,
  useThemedStyles,
} from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SecurityStack from './SecurityStack';

/** Feeds our palette into React Navigation so its own chrome matches. */
function makeNavTheme(c: AppColors, isDark: boolean): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.textPrimary,
      border: c.border,
    },
  };
}

/** Brand splash shown while stored session and preferences load. */
function SplashScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();

  return (
    <View style={styles.splash}>
      <Logo variant="stacked" width={220} />
      <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();
  const { ready, localeVersion } = usePreferences();
  const { colors, isDark } = useTheme();
  const navTheme = useMemo(() => makeNavTheme(colors, isDark), [colors, isDark]);

  if (!ready || status === 'loading') {
    return <SplashScreen />;
  }

  // The lock screen is a full-screen gate, not a route — it deliberately sits
  // outside the container so no navigator is mounted while the app is locked.
  if (status === 'locked') {
    return <LockScreen />;
  }

  return (
    // Remounting on locale change lets navigator titles pick up new translations.
    <NavigationContainer theme={navTheme} key={localeVersion}>
      {status === 'signedOut' ? (
        <AuthStack />
      ) : status === 'needsSecurity' ? (
        <SecurityStack />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    splash: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      backgroundColor: c.background,
    },
    tagline: {
      ...typography.overline,
      color: c.accentStrong,
      textAlign: 'center',
      letterSpacing: 1.6,
      fontSize: 10.5,
    },
  });
