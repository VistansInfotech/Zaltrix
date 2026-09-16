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
import type { WorkspaceStackScreenProps } from '../../navigation/types';

const HEADER_EDGES = ['left', 'right'] as const;

/**
 * Stands between the Workspace and the payslips.
 *
 * What someone is paid is the most sensitive thing in this app, and a phone
 * left on a desk is unlocked. The app-level lock guards the session; this
 * guards the one screen inside it worth a second look, the same way enrolment
 * is guarded on the attendance side.
 */
export default function SalaryGateScreen({
  navigation,
}: WorkspaceStackScreenProps<'SalaryGate'>) {
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
   * Opens salary *replacing* this screen, so Back returns to the Workspace
   * rather than re-asking for a password already given — and so the gate is
   * not sitting in the stack to be swiped back into.
   */
  const proceed = useCallback(() => {
    setPassword('');
    navigation.replace('Salary');
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
      t('workspace.salary.gateTitle'),
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

      <Text style={styles.title}>{t('workspace.salary.gateTitle')}</Text>
      <Text style={styles.lead}>{t('workspace.salary.gateLead')}</Text>

      {error ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={error} />
        </View>
      ) : null}

      <Card>
        <TextField
          label={t('attendance.gatePassword')}
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
