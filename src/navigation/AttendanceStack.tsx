import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePreferences } from '../context/PreferencesContext';
import AttendanceHomeScreen from '../screens/attendance/AttendanceHomeScreen';
import GeofenceScreen from '../screens/attendance/GeofenceScreen';
import MarkAttendanceScreen from '../screens/attendance/MarkAttendanceScreen';
import PersonAttendanceScreen from '../screens/attendance/PersonAttendanceScreen';
import RegisteredUsersScreen from '../screens/attendance/RegisteredUsersScreen';
import RegisterFaceScreen from '../screens/attendance/RegisterFaceScreen';
import RegisterGateScreen from '../screens/attendance/RegisterGateScreen';
import { typography, useColors } from '../theme';
import type { AttendanceStackParamList } from './types';

const Stack = createNativeStackNavigator<AttendanceStackParamList>();

const styles = StyleSheet.create({
  headerAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPressed: { opacity: 0.6 },
  headerActionText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '500',
    // Optical centring: the glyph sits high in its line box.
    marginTop: -2,
  },
});

export default function AttendanceStack() {
  const { t } = usePreferences();
  const colors = useColors();

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
        name="AttendanceHome"
        component={AttendanceHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RegisterGate"
        component={RegisterGateScreen}
        options={{ title: t('attendance.registerTitle') }}
      />
      <Stack.Screen
        name="RegisterFace"
        component={RegisterFaceScreen}
        options={{ title: t('attendance.registerTitle') }}
      />
      <Stack.Screen
        name="RegisteredUsers"
        component={RegisteredUsersScreen}
        // Adding a person is the reason most people open this screen, so it
        // gets the header slot rather than a button below the fold. No second
        // password prompt: the gate that opened this screen already asked.
        options={({ navigation }) => ({
          title: t('attendance.usersTitle'),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('RegisterFace')}
              accessibilityRole="button"
              accessibilityLabel={t('attendance.newUser')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerAction,
                { backgroundColor: colors.primarySoft },
                pressed && styles.headerActionPressed,
              ]}>
              {/* A bare +, but the accessibility label still says what it
                  does, so a screen reader does not announce "plus". */}
              <Text style={[styles.headerActionText, { color: colors.primary }]}>
                +
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="PersonAttendance"
        component={PersonAttendanceScreen}
        options={{ title: t('attendance.historyTitle') }}
      />
      <Stack.Screen
        name="Geofence"
        component={GeofenceScreen}
        options={{ title: t('attendance.location.title') }}
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
