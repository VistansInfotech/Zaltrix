import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import SettingsRow from '../../components/SettingsRow';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  BiometricCapability,
  getBiometricCapability,
  promptBiometric,
} from '../../services/biometricService';
import { clearPin } from '../../services/secureStore';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import type { SettingsStackScreenProps } from '../../navigation/types';

export default function SecurityScreen({
  navigation,
}: SettingsStackScreenProps<'Security'>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { security, updateSecurity } = useAuth();

  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  const biometricLabel = capability
    ? t(`biometric.${capability.labelKey}`)
    : t('biometric.biometrics');

  const biometricAvailable = capability?.available ?? false;

  async function onToggleBiometric(next: boolean) {
    if (busy) {
      return;
    }

    if (!next) {
      await updateSecurity({
        biometricEnabled: false,
        preferredMethod: security.pinEnabled ? 'pin' : null,
      });
      return;
    }

    setBusy(true);
    const result = await promptBiometric(
      t('biometric.promptSubtitle', { type: biometricLabel }),
      t('common.cancel'),
    );
    setBusy(false);

    if (result.status === 'success') {
      await updateSecurity({
        biometricEnabled: true,
        preferredMethod: 'biometric',
      });
    } else if (result.status === 'failed') {
      Alert.alert(t('common.error'), t('biometric.failed'));
    }
  }

  function onRemovePin() {
    Alert.alert(t('security.removePin'), t('security.removePinConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('security.removePin'),
        style: 'destructive',
        onPress: async () => {
          await clearPin();
          await updateSecurity({
            pinEnabled: false,
            preferredMethod: security.biometricEnabled ? 'biometric' : null,
          });
        },
      },
    ]);
  }

  const noMethod = !security.biometricEnabled && !security.pinEnabled;

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.subtitle}>{t('security.subtitle')}</Text>

      {noMethod ? (
        <View style={styles.bannerWrap}>
          <Banner tone="warning" message={t('biometric.skipWarning')} />
        </View>
      ) : null}

      <Card flush>
        <SettingsRow
          type="switch"
          icon={capability?.kind === 'FaceID' ? 'faceId' : 'fingerprint'}
          label={t('security.biometricUnlock', { type: biometricLabel })}
          subtitle={
            biometricAvailable
              ? t('security.biometricUnlockSubtitle', { type: biometricLabel })
              : t('security.notAvailable')
          }
          value={security.biometricEnabled}
          onValueChange={onToggleBiometric}
          disabled={!biometricAvailable || busy}
          last
        />
      </Card>

      <View style={styles.spacer} />

      <Card flush>
        <SettingsRow
          icon="lock"
          label={t('security.pinLabel')}
          subtitle={
            security.pinEnabled ? t('security.pinSet') : t('security.pinNotSet')
          }
          onPress={() => navigation.navigate('ChangePin')}
          value={
            security.pinEnabled ? t('security.changePin') : t('security.setPin')
          }
          last={!security.pinEnabled}
        />

        {security.pinEnabled ? (
          <SettingsRow
            label={t('security.removePin')}
            destructive
            onPress={onRemovePin}
            last
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      marginBottom: spacing.xl,
    },
    bannerWrap: { marginBottom: spacing.lg },
    spacer: { height: spacing.lg },
  });
