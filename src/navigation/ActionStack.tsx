import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePreferences } from '../context/PreferencesContext';
import ActionScreen from '../screens/attendance/ActionScreen';
import MarkAttendanceScreen from '../screens/attendance/MarkAttendanceScreen';
import { typography, useColors } from '../theme';
import type { ActionStackParamList } from './types';

const Stack = createNativeStackNavigator<ActionStackParamList>();

/**
 * The non-admin half of attendance: mark a punch, and nothing else.
 *
 * A separate stack rather than a filtered AttendanceStack, so the screens a
 * plain user must not reach are not registered at all — there is no route for
 * a deep link or a stray navigate() call to land on.
 */
export default function ActionStack() {
  const { t } = usePreferences();
  const colors = useColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { ...typography.subtitle, color: colors.textPrimary },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="ActionHome"
        component={ActionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MarkAttendance"
        component={MarkAttendanceScreen}
        // The camera runs edge to edge; the screen draws its own close button.
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
