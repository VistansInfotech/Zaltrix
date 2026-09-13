import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';

import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import LockScreen from '../screens/security/LockScreen';
import { colors } from '../theme';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import SecurityStack from './SecurityStack';

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
  },
};

/** Brand splash shown while stored session and preferences load. */
function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Logo variant="stacked" width={180} />
    </View>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();
  const { ready, localeVersion } = usePreferences();

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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
