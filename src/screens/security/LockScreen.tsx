import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import type { IconName } from '../../components/Icon';
import Logo from '../../components/Logo';
import PinPad, { PinDots, PIN_LENGTH } from '../../components/PinPad';
import Screen from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  BiometricCapability,
  getBiometricCapability,
  promptBiometric,
} from '../../services/biometricService';
import { verifyPin } from '../../services/secureStore';
import { colors, spacing, typography } from '../../theme';

const MAX_ATTEMPTS = 5;

export default function LockScreen() {
  const { t } = usePreferences();
  const { security, unlock, logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  /** Shown only after biometrics are dismissed, or when PIN is the only method. */
  const [showPad, setShowPad] = useState(!security.biometricEnabled);

  const promptedRef = useRef(false);

  const biometricLabel = capability
    ? t(`biometric.${capability.labelKey}`)
    : t('biometric.biometrics');

  const biometricIcon: IconName =
    capability?.kind === 'FaceID' ? 'faceId' : 'fingerprint';

  const runBiometric = useCallback(async () => {
    const result = await promptBiometric(
      t('lock.unlockWith', { type: biometricLabel }),
      t('common.cancel'),
    );

    if (result.status === 'success') {
      unlock();
      return;
    }
    // Cancelled or failed — fall back to the PIN pad when one is configured.
    if (security.pinEnabled) {
      setShowPad(true);
    }
    if (result.status === 'failed') {
      setError(t('biometric.failed'));
    }
  }, [biometricLabel, security.pinEnabled, t, unlock]);

  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  // Auto-prompt once, as soon as we know the sensor is usable.
  useEffect(() => {
    if (
      !capability?.available ||
      !security.biometricEnabled ||
      promptedRef.current
    ) {
      return;
    }
    promptedRef.current = true;
    void runBiometric();
  }, [capability, security.biometricEnabled, runBiometric]);

  // If biometrics turned out to be unusable, make sure a way in is visible.
  useEffect(() => {
    if (capability && !capability.available) {
      setShowPad(true);
    }
  }, [capability]);

  useEffect(() => {
    if (entry.length < PIN_LENGTH || checking) {
      return;
    }

    (async () => {
      setChecking(true);
      const ok = await verifyPin(entry);
      setChecking(false);

      if (ok) {
        unlock();
        return;
      }

      const next = attempts + 1;
      setAttempts(next);
      setEntry('');

      if (next >= MAX_ATTEMPTS) {
        setError(t('pin.lockedOut'));
        void logout();
      } else {
        setError(t('pin.incorrect', { count: MAX_ATTEMPTS - next }));
      }
    })();
  }, [entry, checking, attempts, unlock, logout, t]);

  const canUseBiometric = security.biometricEnabled && capability?.available;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Logo variant="stacked" width={132} />
        <Text style={styles.title}>{t('lock.title')}</Text>
        <Text style={styles.subtitle}>
          {user?.email ?? t('lock.subtitle')}
        </Text>
      </View>

      {showPad && security.pinEnabled ? (
        <>
          <View style={styles.pinArea}>
            <PinDots filled={entry.length} error={!!error} />
            <View style={styles.errorSlot}>
              {error ? <Banner tone="danger" message={error} /> : null}
            </View>
          </View>

          <View style={[styles.padWrap, { paddingBottom: insets.bottom + spacing.md }]}>
            <PinPad
              onDigit={d => {
                setError(null);
                setEntry(prev => (prev.length >= PIN_LENGTH ? prev : prev + d));
              }}
              onDelete={() => {
                setError(null);
                setEntry(prev => prev.slice(0, -1));
              }}
              deleteLabel={t('pin.delete')}
              actionIcon={canUseBiometric ? biometricIcon : undefined}
              onAction={canUseBiometric ? runBiometric : undefined}
              actionLabel={t('pin.useBiometricInstead', { type: biometricLabel })}
              disabled={checking}
            />
            <Button
              label={t('lock.logOut')}
              variant="ghost"
              onPress={logout}
              style={styles.logout}
            />
          </View>
        </>
      ) : (
        <View style={[styles.centerActions, { paddingBottom: insets.bottom + spacing.lg }]}>
          {error ? <Banner tone="danger" message={error} /> : null}

          {canUseBiometric ? (
            <Button
              label={t('lock.unlockWith', { type: biometricLabel })}
              icon={biometricIcon}
              onPress={runBiometric}
            />
          ) : null}

          {security.pinEnabled ? (
            <Button
              label={t('lock.usePin')}
              variant="secondary"
              onPress={() => setShowPad(true)}
            />
          ) : null}

          <Button label={t('lock.logOut')} variant="ghost" onPress={logout} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  subtitle: { ...typography.body, color: colors.textSecondary },
  pinArea: { flex: 1, justifyContent: 'center', gap: spacing.md },
  errorSlot: { height: 64, justifyContent: 'center' },
  padWrap: { alignItems: 'center', gap: spacing.xs },
  logout: { marginTop: spacing.xs },
  centerActions: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
