import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  BOOKING_TYPES,
  listBookings,
  type Booking,
  type BookingType,
} from '../../services/workspaceData';
import {
  AppColors,
  radius,
  shadows,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import {
  BOOKING_ICONS,
  BookingRow,
  bookingDates,
  bookingTypeTint,
} from './shared';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

const HEADER_EDGES = ['left', 'right'] as const;

/** How many recent bookings the page lists under the grid. */
const LATEST_ROWS = 3;

/**
 * What was booked, as four blocks.
 *
 * A flight and a hotel are different enough that a person arrives already
 * knowing which they came for, so the kind is chosen first and the list they
 * land on is entirely theirs.
 *
 * Each block carries the count *and* when that kind next happens — the count
 * alone was printed twice, once as a figure and once as "3 booked", which told
 * nobody anything they had not read a line earlier.
 */
export default function BookingTypesScreen({
  navigation,
}: WorkspaceStackScreenProps<'Bookings'>) {
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [bookings, setBookings] = useState<Booking[]>([]);

  // On focus, not on mount: coming back from the form has to show the row
  // that was just added.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listBookings().then(rows => {
        if (active) {
          setBookings(rows);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  /**
   * Per kind: how many, and the one to name on its block — the soonest trip
   * still to come, or failing that the most recent one taken.
   */
  const byType = useMemo(() => {
    const now = Date.now();
    const summary = {} as Record<
      BookingType,
      { count: number; next?: Booking; last?: Booking }
    >;

    for (const type of BOOKING_TYPES) {
      const mine = bookings.filter(booking => booking.type === type);
      const upcoming = mine
        .filter(
          booking =>
            booking.status !== 'cancelled' &&
            new Date(booking.startsAt).getTime() >= now,
        )
        .sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      summary[type] = {
        count: mine.length,
        next: upcoming[0],
        // `mine` arrives newest-first, so its head is the most recent.
        last: mine[0],
      };
    }
    return summary;
  }, [bookings]);

  const nextOverall = useMemo(() => {
    const now = Date.now();
    return [...bookings]
      .filter(
        booking =>
          booking.status !== 'cancelled' &&
          new Date(booking.startsAt).getTime() >= now,
      )
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )[0];
  }, [bookings]);

  const latest = bookings.slice(0, LATEST_ROWS);

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      {/* One line that answers "anything coming up?" before any tapping. */}
      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="ticket" size={26} color={colors.textOnPrimary} strokeWidth={1.9} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.heroCount}>
            {t('workspace.bookings.summaryCount', { count: bookings.length })}
          </Text>
          <Text style={styles.heroNext} numberOfLines={2}>
            {nextOverall
              ? t('workspace.bookings.summaryNext', {
                  date: bookingDates(nextOverall, language),
                })
              : t('workspace.bookings.summaryNone')}
          </Text>
        </View>
      </Card>

      <Text style={styles.heading}>{t('workspace.bookings.chooseType')}</Text>

      <View style={styles.grid}>
        {BOOKING_TYPES.map(type => {
          const { count, next, last } = byType[type] ?? { count: 0 };
          const tint = bookingTypeTint(type, colors);
          const label = t(`workspace.bookings.type.${type}`);
          const when = next
            ? t('workspace.bookings.nextShort', {
                date: bookingDates(next, language),
              })
            : last
            ? t('workspace.bookings.lastShort', {
                date: bookingDates(last, language),
              })
            : t('workspace.bookings.typeNone');

          return (
            <Pressable
              key={type}
              onPress={() => navigation.navigate('BookingList', { type })}
              // Disabled rather than hidden: a kind with nothing in it is an
              // answer, and a grid that changes shape as data arrives is
              // harder to aim at than one that does not.
              disabled={count === 0}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ disabled: count === 0 }}
              accessibilityHint={
                count === 0
                  ? t('workspace.bookings.typeNone')
                  : t('workspace.bookings.openType', { type: label })
              }
              style={({ pressed }) => [
                styles.block,
                { backgroundColor: tint.bg, borderColor: tint.fg },
                count === 0 && styles.blockEmpty,
                pressed && styles.blockPressed,
              ]}>
              <View style={styles.blockTop}>
                <View style={[styles.blockIcon, { backgroundColor: tint.fg }]}>
                  <Icon
                    name={BOOKING_ICONS[type]}
                    size={22}
                    color={colors.textOnPrimary}
                    strokeWidth={2}
                  />
                </View>
                {count > 0 ? (
                  <View style={[styles.blockCount, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.blockCountText, { color: tint.fg }]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.blockLabel} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.blockMeta} numberOfLines={2}>
                {when}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The grid alone left the lower half of the screen blank; these are the
          rows a person would most likely have opened a block to find. */}
      {latest.length > 0 ? (
        <>
          <Text style={styles.heading}>{t('workspace.bookings.latest')}</Text>
          <Card flush>
            {latest.map((booking, index) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                locale={language}
                t={t}
                last={index === latest.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}

      <Text style={styles.note}>{t('workspace.staticNote')}</Text>
    </Screen>
  );
}

const makeStyles = (c: AppColors, theme: { shadow: (typeof shadows)['light'] }) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroText: { flex: 1, gap: 2 },
    heroCount: { ...typography.title, color: c.textOnPrimary },
    heroNext: { ...typography.caption, color: 'rgba(255,255,255,0.82)' },

    heading: {
      ...typography.caption,
      color: c.textTertiary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    block: {
      // Two to a row at any width, rather than a fixed size, so the pair still
      // fits a narrow phone and still fills a wide one.
      width: '48%',
      flexGrow: 1,
      gap: 2,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      // Lifted off the page: four flat rectangles read as a chart, four raised
      // ones read as things to press.
      ...(theme.shadow.card as object),
    },
    blockEmpty: { opacity: 0.5 },
    blockPressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
    blockTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    blockIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockCount: {
      minWidth: 30,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    blockCountText: { ...typography.bodyStrong, fontSize: 15 },
    blockLabel: { ...typography.subtitle, color: c.textPrimary },
    blockMeta: {
      ...typography.caption,
      color: c.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },

    note: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
  });
