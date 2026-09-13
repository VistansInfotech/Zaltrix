import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Icon from '../components/Icon';
import { usePreferences } from '../context/PreferencesContext';
import FeedScreen from '../screens/main/FeedScreen';
import { colors, typography } from '../theme';
import SettingsStack from './SettingsStack';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const { t } = usePreferences();

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
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name="settings"
              size={23}
              color={color}
              strokeWidth={focused ? 2.2 : 1.7}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  tabItem: { paddingTop: 2 },
  tabLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
