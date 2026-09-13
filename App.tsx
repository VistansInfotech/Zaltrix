/**
 * Zaltrix — React Native app entry point.
 *
 * Providers wrap a single root navigator that swaps between the auth flow,
 * first-run security setup, the lock screen and the tabbed dashboard.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme';

/** Lives inside ThemeProvider so the bar follows the active scheme. */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  // RN 0.87 dropped StatusBar's `backgroundColor`; on Android the bar colour
  // comes from the native theme instead (see values-night/styles.xml).
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <PreferencesProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
