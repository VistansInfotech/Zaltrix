import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';

import Avatar from '../../components/Avatar';
import Card from '../../components/Card';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import SettingsRow from '../../components/SettingsRow';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import {
  getBiometricCapability,
  BiometricCapability,
} from '../../services/biometricService';
import {
  getNotificationStatus,
  NotificationStatus,
} from '../../services/notificationService';
import { colors, spacing, typography } from '../../theme';
import type { SettingsStackScreenProps } from '../../navigation/types';

export default function SettingsScreen({
  navigation,
}: SettingsStackScreenProps<'SettingsHome'>) {
  const { t, language, languagePreference } = usePreferences();
  const { user, security, logout } = useAuth();

  const [notifStatus, setNotifStatus] = useState<NotificationStatus>('not_asked');
  const [capability, setCapability] = useState<BiometricCapability | null>(null);

  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  // The user can change the permission in system settings and come back.
  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setNotifStatus);
    }, []),
  );

  const version = DeviceInfo.getVersion();
  const build = DeviceInfo.getBuildNumber();

  const languageName =
    languagePreference === 'system'
      ? t('language.systemDefault')
      : SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName ?? '';

  const notifLabel: Record<NotificationStatus, string> = {
    granted: t('notifications.statusGranted'),
    denied: t('notifications.statusDenied'),
    blocked: t('notifications.statusBlocked'),
    unavailable: t('notifications.statusUnavailable'),
    not_asked: t('notifications.statusNotAsked'),
  };

  const biometricLabel = capability
    ? t(`biometric.${capability.labelKey}`)
    : t('biometric.biometrics');

  const securitySummary = security.biometricEnabled
    ? biometricLabel
    : security.pinEnabled
    ? t('security.pinLabel')
    : t('security.pinNotSet');

  function confirmLogout() {
    Alert.alert(
      t('settings.logoutConfirmTitle'),
      t('settings.logoutConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logoutConfirm'),
          style: 'destructive',
          onPress: () => {
            void logout();
          },
        },
      ],
    );
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.screenTitle}>{t('settings.title')}</Text>

      {/* ------------------------------ profile ----------------------------- */}
      <Card style={styles.profileCard} flush>
        <View style={styles.profileTop}>
          <Avatar
            name={user?.name ?? '?'}
            size={60}
            label={t('profile.initialsAlt')}
          />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <SettingsRow
          icon="user"
          label={t('settings.profile')}
          subtitle={t('settings.profileSubtitle')}
          onPress={() => navigation.navigate('Profile')}
          last
        />
      </Card>

      {/* ---------------------------- preferences --------------------------- */}
      <SectionHeader title={t('settings.sectionPreferences')} />
      <Card flush>
        <SettingsRow
          icon="globe"
          label={t('settings.language')}
          value={languageName}
          onPress={() => navigation.navigate('Language')}
        />
        <SettingsRow
          icon="bell"
          label={t('settings.notifications')}
          subtitle={t('settings.notificationsSubtitle')}
          value={notifLabel[notifStatus]}
          onPress={() => navigation.navigate('Notifications')}
          last
        />
      </Card>

      {/* ----------------------------- security ----------------------------- */}
      <SectionHeader title={t('settings.sectionSecurity')} />
      <Card flush>
        <SettingsRow
          icon="shield"
          label={t('settings.security')}
          subtitle={t('settings.securitySubtitle')}
          value={securitySummary}
          onPress={() => navigation.navigate('Security')}
          last
        />
      </Card>

      {/* ------------------------------ legal ------------------------------- */}
      <SectionHeader title={t('settings.sectionLegal')} />
      <Card flush>
        <SettingsRow
          icon="fileText"
          label={t('settings.terms')}
          onPress={() => navigation.navigate('Terms')}
          last
        />
      </Card>

      {/* ------------------------------ account ----------------------------- */}
      <SectionHeader title={t('settings.sectionAccount')} />
      <Card flush>
        <SettingsRow
          icon="logOut"
          label={t('settings.logout')}
          destructive
          onPress={confirmLogout}
          last
        />
      </Card>

      {/* ------------------------------- about ------------------------------ */}
      <View style={styles.about}>
        <Logo variant="horizontalLight" width={132} />
        <Text style={styles.version}>
          {t('settings.version', { version, build })}
        </Text>
        <Text style={styles.copyright}>
          {t('settings.copyright', { year: new Date().getFullYear() })}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl },
  screenTitle: {
    ...typography.display,
    color: colors.textPrimary,
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
  },
  profileCard: { overflow: 'hidden' },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  profileText: { flex: 1, gap: 3 },
  profileName: { ...typography.subtitle, color: colors.textPrimary },
  profileEmail: { ...typography.caption, color: colors.textSecondary },

  about: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxl,
    paddingTop: spacing.lg,
  },
  version: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  copyright: { ...typography.caption, color: colors.textTertiary, fontSize: 11 },
});
