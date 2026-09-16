import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import { listBookings, type Booking } from '../../services/workspaceData';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import { formatMonthKey, groupByMonth } from '../../utils/format';
import { BookingRow, MonthHeading } from './shared';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

const HEADER_EDGES = ['left', 'right'] as const;

/**
 * One kind of booking, newest month first.
 *
 * The type was chosen on the way in, so there is no filter row here and no
 * mixed list to scan: every row on this screen is the thing the person came
 * for. Months with nothing left in them simply do not appear — an empty
 * heading reads as a loading bug.
 */
export default function BookingListScreen({
  route,
}: WorkspaceStackScreenProps<'BookingList'>) {
  const { type } = route.params;
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);

  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listBookings().then(rows => {
        if (active) {
          setBookings(rows.filter(booking => booking.type === type));
        }
      });
      return () => {
        active = false;
      };
    }, [type]),
  );

  const months = useMemo(
    () => groupByMonth(bookings ?? [], booking => new Date(booking.startsAt)),
    [bookings],
  );

  const loaded = bookings !== null;

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      <Text style={styles.lead}>
        {t('workspace.bookings.typeTitle', {
          type: t(`workspace.bookings.type.${type}`),
        })}
      </Text>

      {loaded && months.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <Icon name="ticket" size={28} strokeWidth={1.6} />
            <Text style={styles.emptyText}>{t('workspace.bookings.empty')}</Text>
          </View>
        </Card>
      ) : null}

      {months.map(month => (
        <View key={month.key}>
          <MonthHeading month={formatMonthKey(month.key, language)} />
          <Card flush>
            {month.items.map((booking, index) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                locale={language}
                t={t}
                last={index === month.items.length - 1}
              />
            ))}
          </Card>
        </View>
      ))}

      <Text style={styles.note}>{t('workspace.staticNote')}</Text>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    lead: { ...typography.body, color: c.textSecondary, marginBottom: spacing.lg },

    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
    note: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
  });
