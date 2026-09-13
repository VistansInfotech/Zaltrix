import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { AttendanceStackScreenProps } from '../../navigation/types';

/**
 * Everyone enrolled on this device.
 *
 * The roster is the source of truth for who attendance can be matched against,
 * so it doubles as the management screen: see the face that was saved, search
 * it, re-capture a bad one, or remove someone entirely.
 */
/**
 * This screen sits under a native stack header, which already clears the
 * status bar. Keeping the 'top' edge would inset the content a second time and
 * leave a band of empty space below the title.
 */
const HEADER_EDGES = ['left', 'right'] as const;

export default function RegisteredUsersScreen({
  navigation,
}: AttendanceStackScreenProps<'RegisteredUsers'>) {
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [people, setPeople] = useState<EnrolledPerson[]>([]);
  const [log, setLog] = useState<AttendanceRecord[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const [roster, records] = await Promise.all([listEnrolled(), listAttendance()]);
    setPeople(roster);
    setLog(records);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [roster, records] = await Promise.all([listEnrolled(), listAttendance()]);
        if (active) {
          setPeople(roster);
          setLog(records);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return people;
    }
    return people.filter(
      p =>
        p.name.toLowerCase().includes(needle) || p.id.toLowerCase().includes(needle),
    );
  }, [people, query]);

  const withPhoto = people.filter(p => p.photo).length;

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      <Text style={styles.lead}>{t('attendance.usersLeadTap')}</Text>

      <View style={styles.statRow}>
        <Card style={[styles.stat, styles.statPrimary]}>
          <Text style={[styles.statValue, styles.statValuePrimary]}>{people.length}</Text>
          <Text style={styles.statLabel}>{t('attendance.statEnrolled')}</Text>
        </Card>
        <Card style={[styles.stat, styles.statSecond]}>
          <Text style={[styles.statValue, styles.statValueSecond]}>{withPhoto}</Text>
          <Text style={styles.statLabel}>{t('attendance.statWithPhoto')}</Text>
        </Card>
      </View>

      {people.length > 3 ? (
        // A search bar, not a form field: the stacked label and hint a
        // TextField brings cost three lines to explain a box that explains
        // itself. The placeholder carries the hint instead.
        <View style={styles.searchBar}>
          <Icon name="user" size={16} strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('attendance.searchHint')}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('attendance.searchLabel')}
            style={styles.searchInput}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear')}
              hitSlop={10}
              style={({ pressed }) => [pressed && styles.searchClearPressed]}>
              <Icon name="close" size={16} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Card flush>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="user" size={30} strokeWidth={1.6} />
            <Text style={styles.emptyText}>
              {people.length === 0
                ? t('attendance.noRegistrations')
                : t('attendance.noMatches')}
            </Text>
          </View>
        ) : (
          filtered.map((person, index) => (
            <UserRow
              key={person.id}
              person={person}
              log={log}
              locale={language}
              t={t}
              last={index === filtered.length - 1}
              onOpen={() =>
                navigation.navigate('PersonAttendance', { personId: person.id })
              }
            />
          ))
        )}
      </Card>

      <Text style={styles.privacy}>{t('attendance.privacyNote')}</Text>
    </Screen>
  );
}

function UserRow({
  person,
  log,
  locale,
  t,
  last,
  onOpen,
}: {
  person: EnrolledPerson;
  log: AttendanceRecord[];
  locale: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  last: boolean;
  onOpen: () => void;
}) {
  const styles = useThemedStyles(makeStyles);

  const today = new Date().toDateString();
  const lastToday = log.find(
    r => r.personId === person.id && new Date(r.at).toDateString() === today,
  );

  const status = lastToday
    ? t(lastToday.kind === 'in' ? 'attendance.statusIn' : 'attendance.statusOut', {
        time: new Date(lastToday.at).toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : t('attendance.statusNone');

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      {/* Only the photo and name open the history; the icons keep their own
          hit areas so a mis-tap does not navigate away from a delete. */}
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={person.name}
        accessibilityHint={t('attendance.historyHint')}
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}>
      {person.photo ? (
        <Image
          source={{ uri: person.photo }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel={person.name}
        />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.initial}>
            {person.name.trim().charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}

      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t('attendance.idLabel')} · {person.id}
        </Text>
        <Text style={styles.metaFaint} numberOfLines={1}>
          {t('attendance.enrolledOn', {
            date: new Date(person.enrolledAt).toLocaleDateString(locale),
          })}
        </Text>
        <Text
          style={[
            styles.status,
            lastToday?.kind === 'in' && styles.statusIn,
            lastToday?.kind === 'out' && styles.statusOut,
          ]}
          numberOfLines={1}>
          {status}
        </Text>
      </View>

        <Icon name="chevronRight" size={18} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      ...typography.body,
      color: c.textPrimary,
      // Android adds its own vertical padding to TextInput; zeroing it keeps
      // the bar the height it says it is on both platforms.
      paddingVertical: 0,
    },
    searchClearPressed: { opacity: 0.5 },
    lead: { ...typography.body, color: c.textSecondary, marginBottom: spacing.xl },

    statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
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
    statSecond: { backgroundColor: c.successSoft, borderColor: c.success },
    statValue: { ...typography.title, lineHeight: 28 },
    statValuePrimary: { color: c.primary },
    statValueSecond: { color: c.success },
    statLabel: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 14,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    rowPressed: { opacity: 0.6 },
    photo: {
      // Portrait, matching the roster on the register screen.
      width: 56,
      height: 74,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
    },
    photoEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    initial: { ...typography.subtitle, color: c.primary, fontWeight: '700' },
    rowText: { flex: 1, gap: 2 },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    metaFaint: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
    status: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
    statusIn: { color: c.success, fontWeight: '600' },
    statusOut: { color: c.accentStrong, fontWeight: '600' },


    empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
    privacy: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
