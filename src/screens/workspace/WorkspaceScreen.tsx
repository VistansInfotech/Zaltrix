import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  distanceFromCentre,
  readGeofence,
  summariseGeofence,
  type GeofenceConfig,
} from '../../services/geofenceStore';
import {
  describeLocation,
  formatDistance,
  getCurrentLocationWithAddress,
  getLocationPermission,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermission,
  type PunchLocation,
} from '../../services/locationService';
import {
  listBookings,
  listPayslips,
  type Booking,
  type Payslip,
} from '../../services/workspaceData';
import { formatMonthKey } from '../../utils/format';
import { describeGeofence } from '../attendance/geofenceCopy';
import {
  bookingDates,
  bookingTone,
  EntryCard,
  EntryRow,
  payslipTone,
} from './shared';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

/**
 * One person's own corner of the app.
 *
 * Three things that are theirs — the punch they are about to make, the pay
 * they are owed, the travel booked for them — each shown as the most recent
 * slice with a way through to the whole history. A hub, not a wall: the full
 * lists want filters and breakdowns, and those want their own screens.
 *
 * No roster, no other people's records, no way to enrol a face. Those are the
 * admin's tools and live on the Bio Attendance tab; showing them here would
 * only be a locked door to rattle.
 */
export default function WorkspaceScreen({
  navigation,
}: WorkspaceStackScreenProps<'WorkspaceHome'>) {
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [latest, setLatest] = useState<AttendanceRecord | undefined>();
  const [enrolled, setEnrolled] = useState(0);
  const [fence, setFence] = useState<GeofenceConfig | null>(null);
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  /** Where this person is now, for the readout above the button. */
  const [here, setHere] = useState<PunchLocation | null>(null);
  const [locating, setLocating] = useState(false);
  /**
   * What the system says about location access. Null until it has been asked,
   * which is how the card tells "not checked yet" from "checked and refused".
   */
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  /**
   * The system prompt appears once per install, so it is asked for once per
   * mount. A refusal leaves `here` null, which is why that cannot be the guard:
   * the effect would re-run and ask again on every render.
   */
  const asked = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /**
   * Asks for location as soon as this screen is reached, on both platforms,
   * whether or not stamping is currently switched on.
   *
   * Asking up front costs something: the dialog appears once per install on
   * iOS, and a second refusal on Android means "don't ask again" — so a no
   * given today, while the feature is off, is a no that still stands the
   * morning an admin turns the geofence on. The card's Allow button and the
   * route into system settings are what make that recoverable.
   */
  useEffect(() => {
    if (asked.current) {
      return;
    }
    asked.current = true;
    void requestAccess();
  }, []);

  /**
   * Raises the system dialog, then reads the position if it was allowed.
   *
   * Also the retry behind the card's own button: a person who said no, or who
   * turned location off in system settings, can get back here without
   * reinstalling.
   */
  async function requestAccess() {
    setLocating(true);
    try {
      const status = await requestLocationPermission();
      if (!alive.current) {
        return;
      }
      setPermission(status);
      if (status !== 'granted') {
        return;
      }
      const fix = await getCurrentLocationWithAddress();
      if (alive.current) {
        setHere(fix);
      }
    } catch {
      // A fix that failed for some reason other than permission — no signal,
      // say. The card reports the absence; the punch takes its own fix and
      // reports its own failure, so there is nothing to raise twice.
    } finally {
      if (alive.current) {
        setLocating(false);
      }
    }
  }

  /**
   * Re-reads the status on every return to the screen, without prompting.
   *
   * Someone who leaves to grant access in system settings has to come back to
   * a screen that noticed. `check` never raises a dialog, so this is free.
   */
  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const status = await getLocationPermission();
        if (!alive.current || status === permission) {
          return;
        }
        setPermission(status);
        // Granted while away: pick up the position that was refused before.
        if (status === 'granted' && !here) {
          void requestAccess();
        }
      })();
      // `here` and `permission` are read, not depended on: adding them would
      // re-run this on every state change it causes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const [log, roster, geofence, payslips, trips] = await Promise.all([
          listAttendance(),
          listEnrolled(),
          readGeofence(),
          listPayslips(),
          listBookings(),
        ]);
        if (!active) {
          return;
        }
        const today = new Date().toDateString();
        // The log is newest-first, so the first of today's rows is the latest.
        setLatest(log.find(r => new Date(r.at).toDateString() === today));
        setEnrolled(roster.length);
        setFence(geofence);
        setSlips(payslips);
        setBookings(trips);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const latestSlip = slips[0];
  const salaryTone = latestSlip
    ? payslipTone(latestSlip.status, colors)
    : { fg: colors.textTertiary, bg: colors.surfaceAlt };

  const newBookings = bookings.filter(b => b.status === 'new').length;
  /**
   * The next trip, not the most recent row: a list sorted newest-first has a
   * past trip at the top, and "next Mumbai → Pune" about a flight taken last
   * month would be wrong in the one word that matters.
   */
  const nextBooking = useMemo(() => {
    const now = Date.now();
    return [...bookings]
      .filter(b => b.status !== 'cancelled' && new Date(b.startsAt).getTime() >= now)
      .sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      )[0];
  }, [bookings]);

  const bookingsTone = bookings.length
    ? bookingTone(nextBooking ? 'confirmed' : 'completed', colors)
    : { fg: colors.textTertiary, bg: colors.surfaceAlt };

  const bookingsSummary =
    bookings.length === 0
      ? t('workspace.bookingsCardEmpty')
      : nextBooking
      ? t('workspace.bookingsCard', {
          count: bookings.length,
          next: bookingDates(nextBooking, language),
        })
      : t('workspace.bookingsCardNone', { count: bookings.length });

  const summary = fence ? summariseGeofence(fence) : { state: 'off' as const };
  const enforcing = summary.state === 'enforced';
  const distance = distanceFromCentre(fence, here);
  const inside =
    distance !== null && fence !== null && distance <= fence.radiusMeters;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.title}>{t('workspace.title')}</Text>
      <Text style={styles.lead}>{t('workspace.subtitle')}</Text>

      {/* --------------------------- salary & travel ------------------------ */}
      {/* Side by side, not stacked: two tiles across one row read as two
          choices of equal weight, where two full-width bars read as a list to
          be worked down. Neither of these outranks the other. */}
      <Text style={[styles.sectionHeading, styles.sectionHeadingFirst]}>
        {t('workspace.sectionMine')}
      </Text>
      <EntryRow>
        <EntryCard
          icon="wallet"
          title={t('workspace.salary.title')}
          tone={salaryTone}
          subtitle={
            latestSlip
              ? t('workspace.salaryCard', {
                  month: formatMonthKey(latestSlip.month, language),
                })
              : t('workspace.salaryCardEmpty')
          }
          badge={
            latestSlip
              ? t(`workspace.salary.status.${latestSlip.status}`)
              : undefined
          }
          hint={t('workspace.salary.gateLocked')}
          locked
          onPress={() => navigation.navigate('SalaryGate')}
        />

        <EntryCard
          icon="ticket"
          title={t('workspace.bookings.title')}
          tone={bookingsTone}
          subtitle={bookingsSummary}
          badge={
            newBookings > 0
              ? `${newBookings} ${t('workspace.bookings.status.new')}`
              : undefined
          }
          hint={t('workspace.openHint')}
          onPress={() => navigation.navigate('Bookings')}
        />
      </EntryRow>

      <Text style={styles.sectionHeading}>{t('workspace.sectionAttendance')}</Text>

      {/* Read-only on purpose. This is the same card the admin taps into, but
          a person who can switch the radius check off is a person who can
          punch in from home, so here it states the rule and nothing more. */}
      <Card style={styles.fenceCard}>
        <View style={styles.fenceRow}>
          <View
            style={[
              styles.fenceIcon,
              { backgroundColor: enforcing ? colors.accentSoft : colors.surfaceAlt },
            ]}>
            <Icon
              name="mapPin"
              size={22}
              color={enforcing ? colors.accentStrong : colors.textTertiary}
              strokeWidth={1.9}
            />
          </View>
          <View style={styles.fenceText}>
            <Text style={styles.fenceTitle}>{t('attendance.location.adminAction')}</Text>
            <Text style={styles.fenceSummary}>{describeGeofence(fence, t)}</Text>
          </View>
        </View>

        {/* Said before the punch, not after it. Someone about to walk into a
            refusal should learn where they stand while they can still move. */}
        {fence?.captureLocation ? (
          <View style={styles.fenceStatus}>
            {/* Refused access is its own state, not an empty readout. Without
                this the screen said "Location not recorded" and gave no clue
                that a permission was the reason, nor any way to fix it.
                Shown only inside this block, which needs stamping to be on:
                a refusal that currently blocks nothing is not worth a warning. */}
            {permission === 'blocked' || permission === 'denied' ? (
              <>
                <Text style={styles.fenceWhy}>
                  {t('attendance.location.permissionWhy')}
                </Text>
                <Text style={styles.fenceRefused}>
                  {t(
                    permission === 'blocked'
                      ? 'attendance.location.error.blocked'
                      : 'attendance.location.error.permission',
                  )}
                </Text>
                <Button
                  label={t(
                    permission === 'blocked'
                      ? 'attendance.location.openSettings'
                      : 'attendance.location.allow',
                  )}
                  variant="secondary"
                  icon="mapPin"
                  loading={locating}
                  onPress={() =>
                    // Once blocked, only system settings can change it — the
                    // dialog will not appear again however often it is asked.
                    permission === 'blocked'
                      ? openLocationSettings()
                      : void requestAccess()
                  }
                  style={styles.fenceButton}
                />
              </>
            ) : here ? (
              <>
                <Text style={styles.fencePlace} numberOfLines={2}>
                  {describeLocation(here)}
                </Text>
                {enforcing && distance !== null ? (
                  <Text
                    style={[
                      styles.fenceVerdict,
                      inside ? styles.fenceInside : styles.fenceOutside,
                    ]}>
                    {t('attendance.location.distanceFromCentre', {
                      distance: formatDistance(distance),
                    })}
                    {' · '}
                    {t(
                      inside
                        ? 'attendance.location.insideNow'
                        : 'attendance.location.outsideNow',
                    )}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.fencePlace}>
                {locating
                  ? t('attendance.location.checking')
                  : t('attendance.location.none')}
              </Text>
            )}
          </View>
        ) : null}
      </Card>

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
              <Text style={styles.punchDate}>
                {new Date(latest.at).toLocaleDateString(language, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              {latest.location ? (
                <View style={styles.punchPlace}>
                  <Icon
                    name="mapPin"
                    size={13}
                    color={colors.textTertiary}
                    strokeWidth={2}
                  />
                  <Text style={styles.punchPlaceText} numberOfLines={2}>
                    {describeLocation(latest.location)}
                  </Text>
                </View>
              ) : fence?.captureLocation ? (
                <Text style={styles.punchPlaceText}>
                  {t('attendance.location.none')}
                </Text>
              ) : null}
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
      {fence?.captureLocation ? (
        <Text style={styles.privacy}>{t('attendance.location.privacyNote')}</Text>
      ) : null}
      <Text style={styles.privacy}>{t('workspace.staticNote')}</Text>
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
    fenceCard: { marginBottom: spacing.xl },
    fenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    fenceIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fenceText: { flex: 1, gap: 2 },
    fenceTitle: { ...typography.subtitle, color: c.textPrimary },
    fenceSummary: { ...typography.caption, color: c.textSecondary, lineHeight: 17 },
    fenceStatus: {
      gap: 2,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    fencePlace: { ...typography.caption, color: c.textSecondary },
    fenceWhy: { ...typography.caption, color: c.textSecondary, lineHeight: 17 },
    fenceRefused: {
      ...typography.caption,
      color: c.danger,
      lineHeight: 17,
      marginTop: 2,
    },
    fenceButton: { marginTop: spacing.md },
    fenceVerdict: { ...typography.caption, fontWeight: '700', marginTop: 2 },
    fenceInside: { color: c.success },
    fenceOutside: { color: c.danger },

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
    /**
     * The topmost heading needs no gap above it — the lead's own bottom margin
     * already separates them, and both together left 56pt of nothing at the
     * very top of the page.
     */
    sectionHeadingFirst: { marginTop: 0 },
    punchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    dot: { width: 10, height: 10, borderRadius: 5 },
    dotIn: { backgroundColor: c.success },
    dotOut: { backgroundColor: c.accentStrong },
    punchText: { flex: 1, gap: 2 },
    punchName: { ...typography.bodyStrong, color: c.textPrimary },
    punchMeta: { ...typography.caption, color: c.textSecondary },
    punchDate: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
    punchPlace: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 2 },
    punchPlaceText: {
      ...typography.caption,
      color: c.textTertiary,
      fontSize: 11,
      flexShrink: 1,
      lineHeight: 15,
    },

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
