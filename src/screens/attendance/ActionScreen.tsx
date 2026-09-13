import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Button from '../../components/Button';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AttendanceRecord,
  listAttendance,
  listEnrolled,
} from '../../services/attendanceStore';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useThemedStyles,
} from '../../theme';
import type { ActionStackScreenProps } from '../../navigation/types';

/**
 * What a non-admin account gets instead of the full Bio Attendance tab.
 *
 * One thing to do — mark your attendance — plus the punch that just happened,
 * so a person can confirm the scan landed. No roster, no other people's
 * histories, no way to enrol a face: those are the admin's tools, and showing
 * them here would only be a locked door to rattle.
 */
export default function ActionScreen({
  navigation,
}: ActionStackScreenProps<'ActionHome'>) {
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);

  const [latest, setLatest] = useState<AttendanceRecord | undefined>();
  const [enrolled, setEnrolled] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [log, roster] = await Promise.all([listAttendance(), listEnrolled()]);
        if (!active) {
          return;
        }
        const today = new Date().toDateString();
        // The log is newest-first, so the first of today's rows is the latest.
        setLatest(log.find(r => new Date(r.at).toDateString() === today));
        setEnrolled(roster.length);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.title}>{t('attendance.actionTitle')}</Text>
      <Text style={styles.lead}>{t('attendance.actionLead')}</Text>

      <Button
        label={t('attendance.markAction')}
        onPress={() => navigation.navigate('MarkAttendance')}
        disabled={enrolled === 0}
        style={styles.mark}
      />
      {enrolled === 0 ? (
        <Text style={styles.blocked}>{t('attendance.markBlocked')}</Text>
      ) : null}

      <Text style={styles.sectionHeading}>{t('attendance.actionLast')}</Text>
      <Card>
        {latest ? (
          <View style={styles.punchRow}>
            <View
              style={[
                styles.dot,
                latest.kind === 'in' ? styles.dotIn : styles.dotOut,
              ]}
            />
            <View style={styles.punchText}>
              <Text style={styles.punchName} numberOfLines={1}>
                {latest.name}
              </Text>
              <Text style={styles.punchMeta}>
                {t(
                  latest.kind === 'in'
                    ? 'attendance.statusIn'
                    : 'attendance.statusOut',
                  {
                    time: new Date(latest.at).toLocaleTimeString(language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                )}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Icon name="faceId" size={28} strokeWidth={1.6} />
            <Text style={styles.emptyText}>{t('attendance.actionNone')}</Text>
          </View>
        )}
      </Card>

      <Text style={styles.note}>{t('attendance.actionAdminOnly')}</Text>
      <Text style={styles.privacy}>{t('attendance.privacyNote')}</Text>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    title: { ...typography.display, color: c.textPrimary, paddingTop: spacing.sm },
    lead: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: 4,
      marginBottom: spacing.xl,
    },
    mark: { marginBottom: spacing.xs },
    blocked: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },

    sectionHeading: {
      ...typography.caption,
      color: c.textTertiary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    punchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dot: { width: 10, height: 10, borderRadius: 5 },
    dotIn: { backgroundColor: c.success },
    dotOut: { backgroundColor: c.accentStrong },
    punchText: { flex: 1, gap: 2 },
    punchName: { ...typography.bodyStrong, color: c.textPrimary },
    punchMeta: { ...typography.caption, color: c.textSecondary },

    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },

    note: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
    privacy: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
  });
