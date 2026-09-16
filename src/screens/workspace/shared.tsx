/**
 * The pieces the Workspace sections share.
 *
 * A payslip row looks the same on the hub as it does on the salary screen, and
 * so does a booking. Written once here rather than twice, because the pair that
 * drifts is always the one nobody is looking at.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Icon, { IconName } from '../../components/Icon';
import {
  Booking,
  BookingStatus,
  BookingType,
  netPay,
  Payslip,
  PayslipStatus,
} from '../../services/workspaceData';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import { formatMoney, formatMonthKey } from '../../utils/format';

export type Translate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

/** Colour per state, drawn from the theme so both schemes stay legible. */
type Tone = { fg: string; bg: string };

export const payslipTone = (
  status: PayslipStatus,
  c: AppColors,
): Tone => {
  switch (status) {
    case 'paid':
      return { fg: c.success, bg: c.successSoft };
    case 'processing':
      return { fg: c.info, bg: c.infoSoft };
    case 'pending':
      return { fg: c.accentStrong, bg: c.accentSoft };
  }
};

export const bookingTone = (status: BookingStatus, c: AppColors): Tone => {
  switch (status) {
    case 'confirmed':
      return { fg: c.success, bg: c.successSoft };
    case 'new':
      return { fg: c.info, bg: c.infoSoft };
    case 'completed':
      return { fg: c.textTertiary, bg: c.surfaceAlt };
    case 'cancelled':
      return { fg: c.danger, bg: c.dangerSoft };
  }
};

/**
 * One colour per kind of booking.
 *
 * Shared so the grid on the bookings page and the picker on the form cannot
 * drift apart — a flight that is purple in one place and green in the other
 * teaches a person nothing, and the colour is doing real work here: it is how
 * the five are told apart at a glance.
 */
export function bookingTypeTint(type: BookingType, c: AppColors): Tone {
  switch (type) {
    case 'flight':
      return { fg: c.primary, bg: c.primarySoft };
    case 'hotel':
      return { fg: c.success, bg: c.successSoft };
    case 'car':
      return { fg: c.accentStrong, bg: c.accentSoft };
    case 'train':
      return { fg: c.info, bg: c.infoSoft };
    case 'bus':
      return { fg: c.danger, bg: c.dangerSoft };
  }
}

export const BOOKING_ICONS: Record<BookingType, IconName> = {
  flight: 'flight',
  hotel: 'hotel',
  car: 'car',
  train: 'train',
  bus: 'bus',
};

/** A small uppercase state label — PAID, CONFIRMED, and so on. */
export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.chipText, { color: tone.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A section as a tile: what it holds, and a way in.
 *
 * Stacked vertically inside, and meant to sit beside its sibling rather than
 * above it — two tiles across one row read as two choices of equal weight,
 * where two full-width bars read as a list you are supposed to work down.
 * Salary and Bookings are neither more nor less important than each other.
 */
export function EntryCard({
  icon,
  title,
  subtitle,
  tone,
  badge,
  onPress,
  hint,
  locked = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  tone: Tone;
  /** A short count worth seeing before tapping, e.g. bookings not yet ticketed. */
  badge?: string;
  onPress: () => void;
  hint?: string;
  /** Shows a padlock, for a section that asks for a password on the way in. */
  locked?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint ?? subtitle}
      style={({ pressed }) => [
        styles.tile,
        // The tile wears its own state: a pending payslip and a confirmed trip
        // are told apart across the room, not by reading the chip.
        { backgroundColor: tone.bg, borderColor: tone.fg },
        pressed && styles.tilePressed,
      ]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: colors.surface }]}>
          <Icon name={icon} size={24} color={tone.fg} strokeWidth={1.9} />
        </View>
        {locked ? <Icon name="lock" size={16} color={tone.fg} strokeWidth={2} /> : null}
      </View>

      <Text style={styles.tileTitle} numberOfLines={1}>
        {title}
      </Text>
      {/* Three lines of room: a month and a masked figure wrap on a narrow
          phone, and clipping the second half would hide which month it is. */}
      <Text style={styles.tileSubtitle} numberOfLines={3}>
        {subtitle}
      </Text>

      <View style={styles.tileFoot}>
        {badge ? (
          <View style={[styles.tileBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tileBadgeText, { color: tone.fg }]} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <Icon name="chevronRight" size={18} color={tone.fg} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}

/** Lays two tiles side by side, left and right. */
export function EntryRow({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.tileRow}>{children}</View>;
}

/* -------------------------------- payslip -------------------------------- */

export function PayslipRow({
  slip,
  locale,
  t,
  onPress,
  last = false,
}: {
  slip: Payslip;
  locale: string;
  t: Translate;
  onPress: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const tone = payslipTone(slip.status, colors);
  const month = formatMonthKey(slip.month, locale);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={month}
      accessibilityHint={t('workspace.salary.payslipTitle')}
      style={({ pressed }) => [
        styles.row,
        last && styles.rowLast,
        pressed && styles.rowPressed,
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: tone.bg }]}>
        <Icon name="wallet" size={20} color={tone.fg} strokeWidth={1.9} />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {month}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {slip.paidOn
            ? t('workspace.salary.paidOn', {
                date: new Date(slip.paidOn).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                }),
              })
            : t('workspace.salary.net')}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={styles.amount} numberOfLines={1}>
          {formatMoney(netPay(slip), slip.currency, locale)}
        </Text>
        <StatusChip label={t(`workspace.salary.status.${slip.status}`)} tone={tone} />
      </View>
    </Pressable>
  );
}

/* -------------------------------- booking -------------------------------- */

/** `12 Sep` for a single day, `12–14 Sep` when it spans some. */
export function bookingDates(booking: Booking, locale: string): string {
  const start = new Date(booking.startsAt);
  const short: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!booking.endsAt) {
    return start.toLocaleDateString(locale, short);
  }
  const end = new Date(booking.endsAt);
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString(locale, short);
  }
  // Same month: say the month once. "12–14 Sep", not "12 Sep – 14 Sep".
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString(locale, { day: 'numeric' })}–${end.toLocaleDateString(
      locale,
      short,
    )}`;
  }
  return `${start.toLocaleDateString(locale, short)} – ${end.toLocaleDateString(
    locale,
    short,
  )}`;
}

export function BookingRow({
  booking,
  locale,
  t,
  last = false,
}: {
  booking: Booking;
  locale: string;
  t: Translate;
  last?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const tone = bookingTone(booking.status, colors);

  return (
    <View
      style={[styles.row, last && styles.rowLast]}
      accessible
      accessibilityLabel={`${t(`workspace.bookings.type.${booking.type}`)} · ${booking.title}`}>
      <View style={[styles.rowIcon, { backgroundColor: tone.bg }]}>
        <Icon
          name={BOOKING_ICONS[booking.type]}
          size={20}
          color={tone.fg}
          strokeWidth={1.9}
        />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowTitle,
            booking.status === 'cancelled' && styles.cancelled,
          ]}
          numberOfLines={1}>
          {booking.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {bookingDates(booking, locale)} ·{' '}
          {t('workspace.bookings.reference', { reference: booking.reference })}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {/* A cancelled booking cost nothing, so showing a price would be
            claiming money was spent that was not. */}
        {booking.status !== 'cancelled' ? (
          <Text style={styles.amount} numberOfLines={1}>
            {formatMoney(booking.amount, booking.currency, locale)}
          </Text>
        ) : null}
        <StatusChip
          label={t(`workspace.bookings.status.${booking.status}`)}
          tone={tone}
        />
      </View>
    </View>
  );
}

/** The `SEPTEMBER 2026` heading above each month's rows. */
export function MonthHeading({ month }: { month: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.monthHeading}>{month}</Text>;
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 64,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowPressed: { backgroundColor: c.surfaceAlt },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: c.textPrimary },
    cancelled: { textDecorationLine: 'line-through', color: c.textTertiary },
    rowMeta: { ...typography.caption, color: c.textSecondary },
    rowRight: { alignItems: 'flex-end', gap: 4, maxWidth: '38%' },
    amount: { ...typography.bodyStrong, color: c.textPrimary, fontSize: 15 },

    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    chipText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },


    tileRow: { flexDirection: 'row', gap: spacing.md },
    tile: {
      // Equal halves of the row at any width, rather than a fixed size, so the
      // pair still fits a narrow phone and still fills a wide one.
      flex: 1,
      gap: 2,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      minHeight: 172,
    },
    tilePressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
    tileTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    tileIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTitle: { ...typography.subtitle, color: c.textPrimary },
    tileSubtitle: {
      ...typography.caption,
      color: c.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    tileFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
      // Pinned to the bottom, so the chevrons line up across a pair of tiles
      // whose subtitles ran to different numbers of lines.
      marginTop: 'auto',
      paddingTop: spacing.sm,
    },
    tileBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
      flexShrink: 1,
    },
    tileBadgeText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },

    monthHeading: {
      ...typography.caption,
      color: c.textTertiary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
  });
