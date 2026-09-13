import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import SettingsRow from '../../components/SettingsRow';
import { usePreferences } from '../../context/PreferencesContext';
import {
  getNotificationStatus,
  NotificationStatus,
  openSystemSettings,
  requestNotificationPermission,
} from '../../services/notificationService';
import { colors, spacing, typography } from '../../theme';

export default function NotificationsScreen() {
  const { t, notificationPrefs, setNotificationPref } = usePreferences();

  const [status, setStatus] = useState<NotificationStatus>('not_asked');
  const [requesting, setRequesting] = useState(false);

  // Re-check on focus: the user may have flipped the switch in system settings.
  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setStatus);
    }, []),
  );

  async function onRequest() {
    setRequesting(true);
    const next = await requestNotificationPermission();
    setRequesting(false);
    setStatus(next);
  }

  const granted = status === 'granted';
  const blocked = status === 'blocked';

  const statusLabel: Record<NotificationStatus, string> = {
    granted: t('notifications.statusGranted'),
    denied: t('notifications.statusDenied'),
    blocked: t('notifications.statusBlocked'),
    unavailable: t('notifications.statusUnavailable'),
    not_asked: t('notifications.statusNotAsked'),
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.subtitle}>{t('notifications.subtitle')}</Text>

      <Card flush>
        <SettingsRow
          type="static"
          icon="bell"
          label={t('notifications.systemPermission')}
          value={statusLabel[status]}
          tint={granted ? colors.success : colors.primary}
          last
        />
      </Card>

      <View style={styles.permissionArea}>
        {granted ? (
          <Banner tone="success" message={t('notifications.grantedHelp')} />
        ) : blocked ? (
          <>
            <Banner tone="warning" message={t('notifications.blockedHelp')} />
            <Button
              label={t('notifications.openSettings')}
              variant="secondary"
              icon="external"
              onPress={openSystemSettings}
            />
          </>
        ) : (
          <Button
            label={t('notifications.requestButton')}
            icon="bell"
            loading={requesting}
            onPress={onRequest}
          />
        )}
      </View>

      <SectionHeader title={t('notifications.categories')} />

      <Card flush>
        <SettingsRow
          type="switch"
          label={t('notifications.pushUpdates')}
          subtitle={t('notifications.pushUpdatesSubtitle')}
          value={notificationPrefs.updates}
          onValueChange={v => setNotificationPref('updates', v)}
          disabled={!granted}
        />
        <SettingsRow
          type="switch"
          label={t('notifications.pushSecurity')}
          subtitle={t('notifications.pushSecuritySubtitle')}
          value={notificationPrefs.security}
          onValueChange={v => setNotificationPref('security', v)}
          disabled={!granted}
        />
        <SettingsRow
          type="switch"
          label={t('notifications.pushReminders')}
          subtitle={t('notifications.pushRemindersSubtitle')}
          value={notificationPrefs.reminders}
          onValueChange={v => setNotificationPref('reminders', v)}
          disabled={!granted}
          last
        />
      </Card>

      {!granted ? (
        <Text style={styles.disabledNote}>{t('notifications.disabledNote')}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  permissionArea: { gap: spacing.md, marginTop: spacing.lg },
  disabledNote: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
