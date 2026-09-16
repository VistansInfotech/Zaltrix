import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import SettingsRow from '../../components/SettingsRow';
import TextField from '../../components/TextField';
import { usePreferences } from '../../context/PreferencesContext';
import {
  distanceFromCentre,
  hasCentre,
  readGeofence,
  writeGeofence,
  RADIUS_CHOICES,
  type GeofenceConfig,
} from '../../services/geofenceStore';
import {
  describeLocation,
  formatCoordinates,
  formatDistance,
  getCurrentLocationWithAddress,
  LocationError,
  openLocationSettings,
  type PunchLocation,
} from '../../services/locationService';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { AttendanceStackScreenProps } from '../../navigation/types';

/** Sits under a native header, which has already cleared the status bar. */
const HEADER_EDGES = ['left', 'right'] as const;

/**
 * The admin's control over where attendance may be marked.
 *
 * Two switches and a pin. Recording a location and *requiring* one are kept
 * apart deliberately: an office wants both, a field team wants only the first,
 * and folding them into one switch would force the second on anyone who just
 * wanted to know where their staff were.
 *
 * The centre is pinned from the admin's own position rather than typed in.
 * Nobody knows their office's coordinates, and a mistyped digit puts the fence
 * in another country — where the failure shows up as the whole workforce
 * unable to punch in, tomorrow morning, with no clue why.
 */
export default function GeofenceScreen(
  _props: AttendanceStackScreenProps<'Geofence'>,
) {
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [config, setConfig] = useState<GeofenceConfig | null>(null);
  const [label, setLabel] = useState('');
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  /** The admin's own position, for the live "you are here" readout. */
  const [here, setHere] = useState<PunchLocation | null>(null);
  const [locating, setLocating] = useState(false);

  /** Guards every setState behind an await against an unmounted screen. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const stored = await readGeofence();
        if (!alive.current) {
          return;
        }
        setConfig(stored);
        setLabel(stored.label ?? '');
      })();
    }, []),
  );

  /**
   * Whether the readout has already had its one go at reading the position.
   *
   * The effect below cannot use `here` as its own guard: a failed read leaves
   * `here` null, the effect's dependencies change as `locating` settles back,
   * and a permanently denied permission becomes an endless retry against the
   * GPS. One attempt, and the Pin button is the way to try again.
   */
  const attempted = useRef(false);

  /**
   * Only reads the position once the feature is on. Waking the GPS to draw a
   * readout on a screen where location is switched off would be asking for a
   * permission the admin has not agreed to need yet.
   */
  useEffect(() => {
    if (!config?.captureLocation || attempted.current) {
      return;
    }
    attempted.current = true;
    setLocating(true);
    void (async () => {
      try {
        const fix = await getCurrentLocationWithAddress();
        if (alive.current) {
          setHere(fix);
        }
      } catch {
        // The readout is a convenience; its absence is not worth an alarm.
      } finally {
        if (alive.current) {
          setLocating(false);
        }
      }
    })();
  }, [config?.captureLocation]);

  async function save(patch: Partial<GeofenceConfig>) {
    const next = await writeGeofence(patch);
    if (alive.current) {
      setConfig(next);
    }
  }

  async function pinHere() {
    setPinning(true);
    setError(null);
    setBlocked(false);
    try {
      const fix = await getCurrentLocationWithAddress();
      if (!alive.current) {
        return;
      }
      setHere(fix);
      await save({
        latitude: fix.latitude,
        longitude: fix.longitude,
        address: fix.address,
      });
    } catch (e) {
      if (!alive.current) {
        return;
      }
      const reason = e instanceof LocationError ? e.reason : 'failed';
      setError(t(`attendance.location.error.${reason}`));
      setBlocked(reason === 'blocked');
    } finally {
      if (alive.current) {
        setPinning(false);
      }
    }
  }

  if (!config) {
    // Nothing to show until the stored config lands — a frame of defaults
    // would flash "off" at an admin who has it switched on.
    return (
      <Screen edges={HEADER_EDGES} contentStyle={styles.content}>
        <View />
      </Screen>
    );
  }

  const centred = hasCentre(config);
  const distance = distanceFromCentre(config, here);
  const inside = distance !== null && distance <= config.radiusMeters;

  return (
    <Screen scroll avoidKeyboard edges={HEADER_EDGES} contentStyle={styles.content}>
      <Text style={styles.lead}>{t('attendance.location.subtitle')}</Text>

      {error ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={error} />
          {blocked ? (
            <Pressable
              onPress={openLocationSettings}
              accessibilityRole="button"
              style={({ pressed }) => [styles.settingsLink, pressed && styles.pressed]}>
              <Text style={styles.settingsLinkText}>
                {t('attendance.location.openSettings')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ----------------------------- recording ---------------------------- */}
      <SectionHeader title={t('attendance.location.sectionRecording')} />
      <Card flush>
        <SettingsRow
          type="switch"
          icon="mapPin"
          tint={colors.info}
          tintSoft={colors.infoSoft}
          label={t('attendance.location.captureLabel')}
          subtitle={t('attendance.location.captureHint')}
          value={config.captureLocation}
          onValueChange={next =>
            // Turning recording off takes enforcement with it, rather than
            // leaving a fence armed against a position nothing will measure.
            void save(
              next
                ? { captureLocation: true }
                : { captureLocation: false, enforceRadius: false },
            )
          }
          last
        />
      </Card>

      {/* ------------------------------ centre ------------------------------ */}
      <SectionHeader title={t('attendance.location.centreTitle')} />
      <Card>
        <View style={styles.centreRow}>
          <View
            style={[
              styles.centreIcon,
              { backgroundColor: centred ? colors.successSoft : colors.surfaceAlt },
            ]}>
            <Icon
              name="crosshair"
              size={22}
              color={centred ? colors.success : colors.textTertiary}
              strokeWidth={1.9}
            />
          </View>
          <View style={styles.centreText}>
            {centred ? (
              <>
                <Text style={styles.centreTitle} numberOfLines={2}>
                  {config.address ??
                    formatCoordinates(config.latitude!, config.longitude!)}
                </Text>
                <Text style={styles.centreMeta} numberOfLines={1}>
                  {formatCoordinates(config.latitude!, config.longitude!)}
                </Text>
                {config.updatedAt ? (
                  <Text style={styles.centreMetaFaint} numberOfLines={1}>
                    {t('attendance.location.updatedAt', {
                      date: new Date(config.updatedAt).toLocaleDateString(language, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }),
                    })}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.centreEmpty}>
                {t('attendance.location.centreNone')}
              </Text>
            )}
          </View>
        </View>

        <Button
          label={
            pinning
              ? t('attendance.location.pinning')
              : centred
              ? t('attendance.location.repin')
              : t('attendance.location.useCurrent')
          }
          variant={centred ? 'secondary' : 'primary'}
          icon="mapPin"
          loading={pinning}
          onPress={() => void pinHere()}
          style={styles.pinButton}
        />

        <TextField
          label={t('attendance.location.labelField')}
          placeholder={t('attendance.location.labelPlaceholder')}
          value={label}
          onChangeText={setLabel}
          // Saved on blur, not on every keystroke: an AsyncStorage write per
          // character would be a write per character.
          onBlur={() => void save({ label: label.trim() || null })}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Card>

      {/* ------------------------------ radius ------------------------------ */}
      <SectionHeader title={t('attendance.location.radiusTitle')} />
      <View style={styles.radiusRow}>
        {RADIUS_CHOICES.map(meters => {
          const active = config.radiusMeters === meters;
          return (
            <Pressable
              key={meters}
              onPress={() => void save({ radiusMeters: meters })}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={formatDistance(meters)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {formatDistance(meters)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ---------------------------- enforcement --------------------------- */}
      <SectionHeader title={t('attendance.location.sectionFence')} />
      <Card flush>
        <SettingsRow
          type="switch"
          icon="shield"
          tint={colors.success}
          tintSoft={colors.successSoft}
          label={t('attendance.location.enforceLabel')}
          subtitle={
            !config.captureLocation
              ? t('attendance.location.enforceNeedsCapture')
              : !centred
              ? t('attendance.location.enforceNeedsCentre')
              : t('attendance.location.enforceHint')
          }
          value={config.enforceRadius}
          disabled={!config.captureLocation || !centred}
          onValueChange={next => void save({ enforceRadius: next })}
          last
        />
      </Card>

      {/* --------------------------- you are here --------------------------- */}
      {config.captureLocation ? (
        <>
          <SectionHeader title={t('attendance.location.yourPosition')} />
          <Card>
            {here ? (
              <>
                <Text style={styles.hereAddress}>{describeLocation(here)}</Text>
                <Text style={styles.hereCoords}>
                  {formatCoordinates(here.latitude, here.longitude)}
                  {here.accuracy !== null
                    ? ` · ${t('attendance.location.accuracy', {
                        meters: formatDistance(here.accuracy),
                      })}`
                    : ''}
                </Text>
                {distance !== null ? (
                  <Text
                    style={[
                      styles.hereVerdict,
                      inside ? styles.hereInside : styles.hereOutside,
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
              <Text style={styles.hereCoords}>
                {locating
                  ? t('attendance.location.checking')
                  : t('attendance.location.none')}
              </Text>
            )}
          </Card>
        </>
      ) : null}

      <Text style={styles.privacy}>{t('attendance.location.privacyNote')}</Text>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    lead: { ...typography.body, color: c.textSecondary },

    bannerWrap: { marginTop: spacing.lg, gap: spacing.xs },
    settingsLink: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
    settingsLinkText: { ...typography.caption, color: c.primary, fontWeight: '700' },
    pressed: { opacity: 0.65 },

    centreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    centreIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centreText: { flex: 1, gap: 2 },
    centreTitle: { ...typography.bodyStrong, color: c.textPrimary },
    centreMeta: { ...typography.caption, color: c.textSecondary },
    centreMetaFaint: { ...typography.caption, color: c.textTertiary, fontSize: 11 },
    centreEmpty: { ...typography.body, color: c.textTertiary },
    pinButton: { marginBottom: spacing.lg },

    radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { ...typography.caption, color: c.textSecondary, fontWeight: '600' },
    chipTextActive: { color: c.textOnPrimary },

    hereAddress: { ...typography.bodyStrong, color: c.textPrimary },
    hereCoords: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    hereVerdict: { ...typography.caption, fontWeight: '700', marginTop: spacing.sm },
    hereInside: { color: c.success },
    hereOutside: { color: c.danger },

    privacy: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.md,
    },
  });
