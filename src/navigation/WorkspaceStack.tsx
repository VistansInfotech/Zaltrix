import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePreferences } from '../context/PreferencesContext';
import MarkAttendanceScreen from '../screens/attendance/MarkAttendanceScreen';
import BookingListScreen from '../screens/workspace/BookingListScreen';
import NewBookingScreen from '../screens/workspace/NewBookingScreen';
import BookingTypesScreen from '../screens/workspace/BookingTypesScreen';
import PayslipScreen from '../screens/workspace/PayslipScreen';
import SalaryGateScreen from '../screens/workspace/SalaryGateScreen';
import SalaryScreen from '../screens/workspace/SalaryScreen';
import WorkspaceScreen from '../screens/workspace/WorkspaceScreen';
import { typography, useColors } from '../theme';
import type { WorkspaceStackParamList } from './types';

const Stack = createNativeStackNavigator<WorkspaceStackParamList>();

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

/**
 * One person's own corner of the app: their punches, their pay, their travel.
 *
 * A separate stack rather than a filtered AttendanceStack, so the screens a
 * plain user must not reach are not registered at all — there is no route for
 * a deep link or a stray navigate() call to land on. Admins get this tab too;
 * their own attendance and salary are as much theirs as anyone's.
 */
export default function WorkspaceStack() {
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
        name="WorkspaceHome"
        component={WorkspaceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SalaryGate"
        component={SalaryGateScreen}
        options={{ title: t('workspace.salary.title') }}
      />
      <Stack.Screen
        name="Salary"
        component={SalaryScreen}
        options={{ title: t('workspace.salary.title') }}
      />
      <Stack.Screen
        name="Payslip"
        component={PayslipScreen}
        options={{ title: t('workspace.salary.payslipTitle') }}
      />
      <Stack.Screen
        name="Bookings"
        component={BookingTypesScreen}
        // Raising a booking is the reason most people open this screen with
        // something in mind, so it gets the header slot rather than a button
        // below four blocks and a list.
        options={({ navigation }) => ({
          title: t('workspace.bookings.title'),
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('NewBooking')}
              accessibilityRole="button"
              accessibilityLabel={t('workspace.newBooking.title')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerAction,
                { backgroundColor: colors.primarySoft },
                pressed && styles.headerActionPressed,
              ]}>
              <Text style={[styles.headerActionText, { color: colors.primary }]}>
                +
              </Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="NewBooking"
        component={NewBookingScreen}
        options={{ title: t('workspace.newBooking.title') }}
      />
      <Stack.Screen
        name="BookingList"
        component={BookingListScreen}
        options={({ route }) => ({
          title: t(`workspace.bookings.type.${route.params.type}`),
        })}
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
