import React, { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Banner from '../../components/Banner';
import Card from '../../components/Card';
import Icon, { IconName } from '../../components/Icon';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AttendanceRecord,
  EnrolledPerson,
  listAttendance,
  listEnrolled,
} from '../../services/attendanceStore';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { AttendanceStackScreenProps } from '../../navigation/types';

export default function AttendanceHomeScreen({
  navigation,
  route,
}: AttendanceStackScreenProps<'AttendanceHome'>) {
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);

  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [log, setLog] = useState<AttendanceRecord[]>([]);

  // Set by the register screen on its way back here.
  const justRegistered = route.params?.registered;

  // Both lists change on the other screens, so refresh whenever we come back.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [enrolled, records] = await Promise.all([
          listEnrolled(),
          listAttendance(),
        ]);
        if (active) {
          setPeople(enrolled);
          setLog(records);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const today = new Date().toDateString();
  const todayCount = log.filter(r => new Date(r.at).toDateString() === today).length;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.screenTitle}>{t('attendance.title')}</Text>
      <Text style={styles.subtitle}>{t('attendance.subtitle')}</Text>

      {justRegistered ? (
        <View style={styles.bannerWrap}>
          <Banner
            tone="success"
            message={t('attendance.registeredBanner', { name: justRegistered })}
          />
        </View>
      ) : null}

      <View style={styles.statRow}>
        <Stat
          label={t('attendance.statEnrolled')}
          value={people.length}
          tone="primary"
        />
        <Stat label={t('attendance.statToday')} value={todayCount} tone="success" />
        <Stat label={t('attendance.statTotal')} value={log.length} tone="accent" />
      </View>

      <SectionHeader title={t('attendance.sectionMark')} />
      <Action
        icon="faceId"
        title={t('attendance.markAction')}
        subtitle={
          people.length === 0
            ? t('attendance.markBlocked')
            : t('attendance.markActionSubtitle')
        }
        disabled={people.length === 0}
        onPress={() => navigation.navigate('MarkAttendance')}
        primary
      />

      <SectionHeader title={t('attendance.sectionPeople')} />
      {/* One door into the people area, and it goes through the password.
          Adding a face grants the ability to mark attendance as that person,
          so the roster and the enrolment form sit behind the same gate. */}
      <Action
        icon="feed"
        title={t('attendance.usersTitle')}
        subtitle={t('attendance.registerLocked')}
        onPress={() => navigation.navigate('RegisterGate')}
        tone="success"
      />

      {/* Per person, not a flat feed: one person punching in and out a few
          times filled the whole screen with near-identical rows, and answered
          nobody's actual question, which is "how did today go for X". */}
      <SectionHeader title={t('attendance.byPerson')} />
      <Card flush>
        {people.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="user" size={30} strokeWidth={1.6} />
            <Text style={styles.emptyText}>{t('attendance.noPeopleYet')}</Text>
          </View>
        ) : (
          people.map((person, index) => (
            <RegistrationRow
              key={person.id}
              person={person}
              log={log}
              locale={language}
              t={t}
              last={index === people.length - 1}
              onPress={() =>
                navigation.navigate('PersonAttendance', { personId: person.id })
              }
            />
          ))
        )}
      </Card>
      {people.length > 0 ? (
        <Text style={styles.listHint}>{t('attendance.byPersonHint')}</Text>
      ) : null}

      <Text style={styles.privacy}>{t('attendance.privacyNote')}</Text>
    </Screen>
  );
}

type ActionTone = 'primary' | 'accent' | 'success';

/**
 * Icon tints per action. Drawn from the theme rather than hard-coded hexes so
 * the colours still work when the scheme flips to dark.
 */
const TONES: Record<
  ActionTone,
  (c: AppColors) => { background: string; foreground: string }
> = {
  primary: c => ({ background: c.primarySoft, foreground: c.primary }),
  accent: c => ({ background: c.accentSoft, foreground: c.accentStrong }),
  success: c => ({ background: c.successSoft, foreground: c.success }),
};

/**
 * One headline number.
 *
 * Each stat carries its own colour on the number, the border and a wash of
 * background, so three figures side by side read as three different things
 * rather than one repeated card.
 */
function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ActionTone;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const tint = TONES[tone](colors);

  return (
    <Card
      style={[
        styles.stat,
        { backgroundColor: tint.background, borderColor: tint.foreground },
      ]}>
      <Text style={[styles.statValue, { color: tint.foreground }]}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </Card>
  );
}

function Action({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
  primary = false,
  tone = 'primary',
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  /** Tints the icon so the three actions are told apart at a glance. */
  tone?: ActionTone;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const tint = TONES[tone](colors);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.action,
        primary && styles.actionPrimary,
        pressed && !disabled && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}>
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: tint.background },
          primary && styles.actionIconPrimary,
        ]}>
        <Icon
          name={icon}
          size={24}
          color={primary ? colors.textOnPrimary : tint.foreground}
          strokeWidth={1.9}
        />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>
          {title}
        </Text>
        <Text
          style={[styles.actionSubtitle, primary && styles.actionSubtitlePrimary]}
          numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

/** One saved registration: the stored face plus everything held with it. */
function RegistrationRow({
  person,
  log,
  locale,
  t,
  last,
  onPress,
}: {
  person: EnrolledPerson;
  log: AttendanceRecord[];
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  last: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);

  const today = new Date().toDateString();
  const lastToday = log.find(
    r => r.personId === person.id && new Date(r.at).toDateString() === today,
  );
  const punches = log.filter(
    r => r.personId === person.id && new Date(r.at).toDateString() === today,
  ).length;

  const status = lastToday
    ? t(lastToday.kind === 'in' ? 'attendance.statusIn' : 'attendance.statusOut', {
        time: new Date(lastToday.at).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : t('attendance.statusNone');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={person.name}
      accessibilityHint={t('attendance.historyHint')}
      style={({ pressed }) => [
        styles.regRow,
        last && styles.rowLast,
        pressed && styles.personRowPressed,
      ]}>
      {person.photo ? (
        <Image
          source={{ uri: person.photo }}
          style={styles.enrolledPhoto}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel={person.name}
        />
      ) : (
        <View style={[styles.enrolledPhoto, styles.enrolledPhotoEmpty]}>
          <Text style={styles.avatarText}>
            {person.name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {t('attendance.idLabel')} · {person.id}
        </Text>
        <Text style={styles.rowMetaFaint} numberOfLines={1}>
          {t('attendance.enrolledOn', {
            date: new Date(person.enrolledAt).toLocaleDateString(locale),
          })}
        </Text>
        <Text
          style={[
            styles.regStatus,
            lastToday?.kind === 'in' && styles.regStatusIn,
            lastToday?.kind === 'out' && styles.regStatusOut,
          ]}
          numberOfLines={1}>
          {status}
          {punches > 0 ? ` · ${t('attendance.punchCount', { count: punches })}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    screenTitle: {
      ...typography.display,
      color: c.textPrimary,
      paddingTop: spacing.md,
    },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },

    bannerWrap: { marginBottom: spacing.lg },
    statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    stat: {
      // Compact: these are a glance, not the content. A tall card pushed the
      // list that people actually came for below the fold.
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    statValue: { ...typography.title, lineHeight: 28 },
    statLabel: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 14,
    },

    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      marginBottom: spacing.md,
    },
    actionPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    actionPressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
    actionDisabled: { opacity: 0.45 },
    actionIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIconPrimary: { backgroundColor: 'rgba(255,255,255,0.18)' },
    actionText: { flex: 1, gap: 3 },
    actionTitle: { ...typography.subtitle, color: c.textPrimary },
    actionTitlePrimary: { color: c.textOnPrimary },
    actionSubtitle: { ...typography.caption, color: c.textSecondary },
    actionSubtitlePrimary: { color: 'rgba(255,255,255,0.85)' },

    rowLast: { borderBottomWidth: 0 },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: c.textPrimary },
    rowMeta: { ...typography.caption, color: c.textSecondary },
    score: { ...typography.caption, color: c.textTertiary },
    avatarChip: {
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...typography.caption, color: c.primary, fontWeight: '700' },
    /** Large enough to actually judge the stored face, not just identify it. */
    enrolledPhoto: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    enrolledPhotoEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    rowMetaFaint: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
    regRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    regStatus: {
      ...typography.caption,
      color: c.textTertiary,
      fontSize: 11,
      marginTop: 2,
    },
    regStatusIn: { color: c.success, fontWeight: '600' },
    regStatusOut: { color: c.accentStrong, fontWeight: '600' },

    empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },

    listHint: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },

    personRowPressed: { backgroundColor: c.surfaceAlt },

    privacy: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
  });
