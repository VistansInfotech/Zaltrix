import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePreferences } from '../context/PreferencesContext';
import SettingsScreen from '../screens/main/SettingsScreen';
import ChangePinScreen from '../screens/settings/ChangePinScreen';
import LanguageScreen from '../screens/settings/LanguageScreen';
import NotificationsScreen from '../screens/settings/NotificationsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import TermsScreen from '../screens/settings/TermsScreen';
import { colors, typography } from '../theme';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsStack() {
  const { t } = usePreferences();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          ...typography.subtitle,
          color: colors.textPrimary,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title') }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ title: t('language.title') }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('notifications.title') }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{ title: t('security.title') }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: t('terms.title') }}
      />
      <Stack.Screen
        name="ChangePin"
        component={ChangePinScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
