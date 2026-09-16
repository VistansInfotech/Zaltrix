import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AttendanceRecord,
  EnrolledPerson,
  listAttendance,
  listEnrolled,
} from '../../services/attendanceStore';
import {
  AttendanceDay,
  formatDuration,
  groupPersonDays,
} from '../../services/attendanceSummary';
import { describeLocation } from '../../services/locationService';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useThemedStyles,
} from '../../theme';
import type { AttendanceStackScreenProps } from '../../navigation/types';

/**
 * One person's punch history, newest day first.
 *
 * The stored log is a flat list of scans; this is where it becomes readable —
 * grouped into days, with each punch in matched to the punch out that closed it.
 */
/**
 * This screen sits under a native stack header, which already clears the
 * status bar. Keeping the 'top' edge would inset the content a second time and
 * leave a band of empty space below the title.
 */
const HEADER_EDGES = ['left', 'right'] as const;

export default function PersonAttendanceScreen({
  route,
}: AttendanceStackScreenProps<'PersonAttendance'>) {
  const { personId } = route.params;
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);

  const [person, setPerson] = useState<EnrolledPerson | undefined>();
  const [log, setLog] = useState<AttendanceRecord[]>([]);
  /**
   * `null` means every day at once. Otherwise a single day is shown and the
   * arrows step through the calendar — including days with nothing on them,
   * because "I was off that day" is an answer too.
   */
  const [selected, setSelected] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [roster, records] = await Promise.all([
          listEnrolled(),
          listAttendance(),
        ]);
        if (active) {
          setPerson(roster.find(p => p.id === personId));
          setLog(records);
        }
      })();
      return () => {
        active = false;
      };
    }, [personId]),
  );

  const days = useMemo(() => groupPersonDays(log, personId), [log, personId]);
  const punches = useMemo(
    () => days.reduce((sum, day) => sum + day.records.length, 0),
    [days],
  );

  const shown = useMemo(() => {
    if (!selected) {
      return days;
    }
    const key = selected.toDateString();
    return days.filter(day => day.key === key);
  }, [days, selected]);

  /** Steps the chosen day, starting from today when none is chosen yet. */
  function stepDay(delta: number) {
    const from = selected ?? new Date();
    const next = new Date(from);
    next.setDate(next.getDate() + delta);
    next.setHours(0, 0, 0, 0);
    // Never past today: there is nothing to look at in the future.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelected(next > today ? today : next);
  }

  const name = person?.name ?? personId;

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      <View style={styles.header}>
        {person?.photo ? (
          <Image
            source={{ uri: person.photo }}
            style={styles.photo}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={name}
          />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Text style={styles.initial}>
              {name.trim().charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {t('attendance.idLabel')} · {personId}
          </Text>
        </View>
      </View>

      <View style={styles.statRow}>
        <Card style={[styles.stat, styles.statPrimary]}>
          <Text style={[styles.statValue, styles.statValuePrimary]}>{days.length}</Text>
          <Text style={styles.statLabel}>{t('attendance.statDays')}</Text>
        </Card>
        <Card style={[styles.stat, styles.statSecond]}>
          <Text style={[styles.statValue, styles.statValueSecond]}>{punches}</Text>
          <Text style={styles.statLabel}>{t('attendance.statPunches')}</Text>
        </Card>
      </View>

      {/* Day picker. Two arrows and a toggle rather than a modal calendar:
          checking "was I in last Tuesday" is a few taps back, and the toggle
          returns to the whole history without hunting for a reset. */}
      <View style={styles.dayBar}>
        <Pressable
          onPress={() => stepDay(-1)}
          accessibilityRole="button"
          accessibilityLabel={t('attendance.prevDay')}
          hitSlop={8}
          style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed]}>
          <Icon name="chevronLeft" size={18} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={() => setSelected(selected ? null : new Date())}
          accessibilityRole="button"
          accessibilityLabel={selected ? t('attendance.allDays') : t('attendance.pickDay')}
          style={({ pressed }) => [styles.dayLabel, pressed && styles.stepperPressed]}>
          <Text style={styles.dayLabelText}>
            {selected
              ? dayHeading(selected, language, t)
              : t('attendance.allDays')}
          </Text>
          <Text style={styles.dayLabelHint}>
            {selected ? t('attendance.allDays') : t('attendance.pickDay')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => stepDay(1)}
          accessibilityRole="button"
          accessibilityLabel={t('attendance.nextDay')}
          hitSlop={8}
          style={({ pressed }) => [styles.stepper, pressed && styles.stepperPressed]}>
          <Icon name="chevronRight" size={18} strokeWidth={2.2} />
        </Pressable>
      </View>

      {shown.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <Icon name="fileText" size={28} strokeWidth={1.6} />
            <Text style={styles.emptyText}>
              {selected
                ? t('attendance.nothingOn', {
                    date: selected.toLocaleDateString(language, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }),
                  })
                : t('attendance.historyEmpty', { name })}
            </Text>
          </View>
        </Card>
      ) : (
        shown.map(day => (
          <DayCard key={day.key} day={day} locale={language} t={t} />
        ))
      )}
    </Screen>
  );
}

/** Relative names for the two days people actually look at. */
function dayHeading(
  date: Date,
  locale: string,
  t: (key: string) => string,
): string {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const key = date.toDateString();

  if (key === today) {
    return t('attendance.dayToday');
  }
  if (key === yesterday) {
    return t('attendance.dayYesterday');
  }
  return date.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function DayCard({
  day,
  locale,
  t,
}: {
  day: AttendanceDay;
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const styles = useThemedStyles(makeStyles);

  const time = (record?: { at: string }) =>
    record
      ? new Date(record.at).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined;

  /**
   * The place under a punch, indented to hang off its dot.
   *
   * Only rendered when there is one: a blank "location not recorded" line
   * against every punch from before the feature existed would bury the times
   * that the screen is actually for.
   */
  const place = (record?: AttendanceRecord) =>
    record?.location ? (
      <Text style={styles.punchPlace} numberOfLines={2}>
        {describeLocation(record.location)}
      </Text>
    ) : null;

  return (
    <View style={styles.day}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{dayHeading(day.date, locale, t)}</Text>
        <Text style={[styles.dayTotal, day.open && styles.dayOpen]}>
          {day.open
            ? t('attendance.dayOpen')
            : t('attendance.dayTotal', { duration: formatDuration(day.workedMs) })}
        </Text>
      </View>

      <Card flush>
        {day.pairs.map((pair, index) => {
          const inTime = time(pair.punchIn);
          const outTime = time(pair.punchOut);
          return (
            <View
              key={pair.punchIn?.recordId ?? pair.punchOut?.recordId ?? index}
              style={[styles.shift, index === day.pairs.length - 1 && styles.shiftLast]}>
              <View style={styles.punch}>
                <View style={[styles.dot, styles.dotIn]} />
                <Text style={[styles.punchText, !inTime && styles.punchMissing]}>
                  {inTime
                    ? t('attendance.punchInAt', { time: inTime })
                    : t('attendance.punchMissing')}
                </Text>
              </View>
              {place(pair.punchIn)}

              <View style={styles.punch}>
                <View style={[styles.dot, styles.dotOut]} />
                <Text style={[styles.punchText, !outTime && styles.punchMissing]}>
                  {outTime
                    ? t('attendance.punchOutAt', { time: outTime })
                    : t('attendance.punchMissing')}
                </Text>
              </View>
              {place(pair.punchOut)}

              {pair.durationMs !== undefined ? (
                <Text style={styles.shiftDuration}>
                  {formatDuration(pair.durationMs)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    photo: {
      width: 64,
      height: 84,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    photoEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    initial: { ...typography.title, color: c.primary, fontWeight: '700' },
    headerText: { flex: 1, gap: 2 },
    name: { ...typography.title, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },

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
    statPrimary: { backgroundColor: c.primarySoft, borderColor: c.primary },
    statSecond: { backgroundColor: c.accentSoft, borderColor: c.accentStrong },
    statValue: { ...typography.title, lineHeight: 28 },
    statValuePrimary: { color: c.primary },
    statValueSecond: { color: c.accentStrong },
    statLabel: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 14,
    },

    day: { marginBottom: spacing.xl },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    dayTitle: { ...typography.bodyStrong, color: c.textPrimary },
    dayTotal: { ...typography.caption, color: c.textSecondary },
    dayOpen: { color: c.success, fontWeight: '600' },

    shift: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    shiftLast: { borderBottomWidth: 0 },
    punch: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotIn: { backgroundColor: c.success },
    dotOut: { backgroundColor: c.accentStrong },
    punchText: { ...typography.body, color: c.textPrimary },
    punchMissing: { color: c.textTertiary, fontStyle: 'italic' },
    /** Indented past the dot and its gap, so it reads as belonging to it. */
    punchPlace: {
      ...typography.caption,
      color: c.textTertiary,
      fontSize: 11,
      lineHeight: 15,
      marginLeft: spacing.sm + 8,
      marginTop: -1,
    },
    shiftDuration: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: 2,
      marginLeft: spacing.sm + 8,
    },

    dayBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    stepper: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },
    stepperPressed: { opacity: 0.6 },
    dayLabel: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    dayLabelText: { ...typography.bodyStrong, color: c.textPrimary },
    dayLabelHint: { ...typography.caption, color: c.textTertiary, fontSize: 11 },

    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
  });
