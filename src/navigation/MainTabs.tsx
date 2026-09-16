import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute, type RouteProp } from '@react-navigation/native';

import Icon from '../components/Icon';
import { usePreferences } from '../context/PreferencesContext';
import FeedScreen from '../screens/main/FeedScreen';
import { AppColors, typography, useColors, useThemedStyles } from '../theme';
import { useAuth } from '../context/AuthContext';
import { canManageAttendance, roleOf } from '../types';
import WorkspaceStack from './WorkspaceStack';
import AttendanceStack from './AttendanceStack';
import SettingsStack from './SettingsStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * A tab whose content is a stack keeps the tab bar on the stack's root screen
 * and hides it once the user pushes into a detail screen, so detail screens get
 * the full height and read as "deeper" rather than as another tab.
 *
 * The focused route name is undefined until the nested navigator has rendered,
 * which is exactly the moment it is still showing its root — hence the fallback.
 */
function tabBarVisibility<T extends keyof MainTabParamList>(
  route: RouteProp<MainTabParamList, T>,
  rootScreen: string,
) {
  const focused = getFocusedRouteNameFromRoute(route) ?? rootScreen;
  return focused === rootScreen;
}

export default function MainTabs() {
  const { t } = usePreferences();
  const { user } = useAuth();
  // Absent or unknown role means the ordinary one; the attendance tab is
  // granted, never assumed. Admin and HR both manage attendance.
  const canManage = canManageAttendance(roleOf(user));
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: t('tabs.feed'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="feed"
              size={23}
              color={color}
              strokeWidth={focused ? 2.4 : 1.9}
            />
          ),
        }}
      />
      {/* Everyone can mark a punch. */}
      <Tab.Screen
        name="WorkspaceTab"
        component={WorkspaceStack}
        options={({ route }) => ({
          title: t('tabs.action'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="checkCircle"
              size={23}
              color={color}
              strokeWidth={focused ? 2.4 : 1.9}
            />
          ),
          tabBarStyle: tabBarVisibility(route, 'WorkspaceHome')
            ? styles.tabBar
            : styles.tabBarHidden,
        })}
      />

      {/* Admin and HR only. Rendering nothing rather than a disabled tab: the
          screens are not registered at all, so there is no route for a deep
          link or a stray navigate() to reach. */}
      {canManage ? (
      <Tab.Screen
        name="AttendanceTab"
        component={AttendanceStack}
        options={({ route }) => ({
          title: t('tabs.attendance'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="faceId"
              size={23}
              color={color}
              strokeWidth={focused ? 2.4 : 1.9}
            />
          ),
          tabBarStyle: tabBarVisibility(route, 'AttendanceHome')
            ? styles.tabBar
            : styles.tabBarHidden,
        })}
      />
      ) : null}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={({ route }) => ({
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="settings"
              size={23}
              color={color}
              strokeWidth={focused ? 2.2 : 1.7}
            />
          ),
          tabBarStyle: tabBarVisibility(route, 'SettingsHome')
            ? styles.tabBar
            : styles.tabBarHidden,
        })}
      />
    </Tab.Navigator>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      height: Platform.OS === 'ios' ? 86 : 64,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    },
    // `display: none` rather than unmounting: the bar keeps its identity, so
    // returning to the root screen restores it without a re-layout flash.
    tabBarHidden: { display: 'none' as const },
    tabItem: { paddingTop: 2 },
    tabLabel: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 2,
    },
  });
