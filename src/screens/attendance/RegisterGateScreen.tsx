import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  getBiometricCapability,
  promptBiometric,
  type BiometricCapability,
} from '../../services/biometricService';
import { verifyPassword } from '../../services/secureStore';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import type { AttendanceStackScreenProps } from '../../navigation/types';

/**
 * Stands between "Register a face" and the enrolment form.
 *
 * Enrolling a face is the one action here that cannot be judged after the
 * fact: whoever is enrolled can mark attendance as that person from then on.
 * Marking attendance proves who you are with your face; adding a *new* face
 * cannot, so it falls back to the account password.
 */
/**
 * This screen sits under a native stack header, which already clears the
 * status bar. Keeping the 'top' edge would inset the content a second time and
 * leave a band of empty space below the title.
 */
const HEADER_EDGES = ['left', 'right'] as const;

export default function RegisterGateScreen({
  navigation,
}: AttendanceStackScreenProps<'RegisterGate'>) {
  const { t } = usePreferences();
  const { user, security } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [biometry, setBiometry] = useState<BiometricCapability | null>(null);

  useEffect(() => {
    if (!security.biometricEnabled) {
      return;
    }
    let active = true;
    void getBiometricCapability().then(cap => {
      if (active && cap.available) {
        setBiometry(cap);
      }
    });
    return () => {
      active = false;
    };
  }, [security.biometricEnabled]);

  /**
   * Opens the people area, *replacing* this screen: going Back from the roster
   * should return to the attendance list, not re-ask for a password already
   * given. Adding a new user from there needs no second prompt.
   */
  const proceed = useCallback(() => {
    setPassword('');
    navigation.replace('RegisteredUsers');
  }, [navigation]);

  async function submit() {
    if (!user) {
      setError(t('attendance.gateNoAccount'));
      return;
    }
    if (password.length === 0) {
      setError(t('attendance.gateEmpty'));
      return;
    }

    setBusy(true);
    const ok = await verifyPassword(user.email, password);
    setBusy(false);

    if (!ok) {
      // Cleared rather than left on screen: a failed attempt should leave
      // nothing for the next person holding the phone to read.
      setPassword('');
      setError(t('attendance.gateWrong'));
      return;
    }
    proceed();
  }

  async function useBiometric() {
    const result = await promptBiometric(
      t('attendance.gateTitle'),
      t('common.cancel'),
    );
    if (result.status === 'success') {
      proceed();
      return;
    }
    if (result.status === 'failed') {
      setError(result.message ?? t('attendance.gateWrong'));
    }
  }

  return (
    <Screen scroll avoidKeyboard edges={HEADER_EDGES} contentStyle={styles.content}>
      <View style={styles.badge}>
        <Icon name="lock" size={26} strokeWidth={1.8} />
      </View>

      <Text style={styles.title}>{t('attendance.gateTitle')}</Text>
      <Text style={styles.lead}>{t('attendance.gateLead')}</Text>

      {error ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={error} />
        </View>
      ) : null}

      <Card>
        <TextField
          label={t('attendance.adminPassword')}
          placeholder={t('attendance.passwordPlaceholder')}
          value={password}
          onChangeText={v => {
            setPassword(v);
            setError(null);
          }}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />

        <Button
          label={t('attendance.gateSubmit')}
          onPress={() => void submit()}
          disabled={busy}
          style={styles.submit}
        />

        {biometry ? (
          <Button
            label={t('attendance.gateBiometric', {
              method: t(`biometric.${biometry.labelKey}`),
            })}
            variant="secondary"
            onPress={() => void useBiometric()}
            style={styles.secondary}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
      marginBottom: spacing.lg,
    },
    title: { ...typography.title, color: c.textPrimary },
    lead: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    bannerWrap: { marginBottom: spacing.lg },
    submit: { marginTop: spacing.lg },
    secondary: { marginTop: spacing.sm },
  });
