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
import {
  AppColors,
  radius,
  spacing,
  typography,
  useTheme,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { SettingsStackScreenProps } from '../../navigation/types';

export default function SettingsScreen({
  navigation,
}: SettingsStackScreenProps<'SettingsHome'>) {
  const { t, language, languagePreference } = usePreferences();
  const { user, security, logout } = useAuth();
  const { preference: themePreference } = useTheme();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

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

  const appearanceName = t(`appearance.${themePreference}`);

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
            uri={user?.avatar}
            label={t('profile.initialsAlt')}
          />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email}
            </Text>
            {user?.position ? (
              <Text style={styles.profilePosition} numberOfLines={1}>
                {user.position}
              </Text>
            ) : null}
            <Text style={styles.profileMeta} numberOfLines={1}>
              {t('profile.userId')} · {user?.id ?? '—'}
            </Text>
            {user?.phone ? (
              <Text style={styles.profileMeta} numberOfLines={1}>
                {t('profile.phone')} · {user.phone}
              </Text>
            ) : null}
          </View>
        </View>

        <SettingsRow
          icon="user"
          label={t('settings.profile')}
          tint={colors.primary}
          tintSoft={colors.primarySoft}
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
          tint={colors.info}
          tintSoft={colors.infoSoft}
          label={t('settings.language')}
          value={languageName}
          onPress={() => navigation.navigate('Language')}
        />
        <SettingsRow
          icon="contrast"
          tint={colors.accent}
          tintSoft={colors.accentSoft}
          label={t('settings.appearance')}
          value={appearanceName}
          onPress={() => navigation.navigate('Appearance')}
        />
        <SettingsRow
          icon="bell"
          tint={colors.warning}
          tintSoft={colors.warningSoft}
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
          tint={colors.success}
          tintSoft={colors.successSoft}
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
          tint={colors.info}
          tintSoft={colors.infoSoft}
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
        <Logo variant="horizontal" width={168} />
        <Text style={styles.tagline}>{t('settings.appTagline')}</Text>
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    screenTitle: {
      ...typography.display,
      color: c.textPrimary,
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
      borderBottomColor: c.border,
    },
    profileText: { flex: 1, gap: 3 },
    profileName: { ...typography.subtitle, color: c.textPrimary },
    profileEmail: { ...typography.caption, color: c.textSecondary },
    profilePosition: {
      ...typography.caption,
      color: c.primary,
      fontWeight: '600',
    },
    profileMeta: { ...typography.caption, color: c.textTertiary, fontSize: 11 },

    about: {
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xxl,
      paddingTop: spacing.lg,
    },
    tagline: {
      ...typography.overline,
      color: c.accentStrong,
      textAlign: 'center',
      alignSelf: 'center',
      // Small, wide-tracked and only semi-bold: a quiet footer line rather
      // than a second headline competing with the wordmark above it.
      fontSize: 8,
      lineHeight: 12,
      letterSpacing: 1.1,
      fontWeight: '600',
      marginTop: spacing.xs,
    },
    version: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: spacing.sm,
    },
    copyright: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
  });
