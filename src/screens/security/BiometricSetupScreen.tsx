import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Icon, { IconName } from '../../components/Icon';
import Screen from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  BiometricCapability,
  getBiometricCapability,
  promptBiometric,
} from '../../services/biometricService';
import {
  AppColors,
  radius,
  shadows,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import type { SecurityStackScreenProps } from '../../navigation/types';

export default function BiometricSetupScreen({
  navigation,
}: SecurityStackScreenProps<'BiometricSetup'>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { completeSecuritySetup } = useAuth();

  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    getBiometricCapability().then(setCapability);
  }, []);

  const biometricLabel = capability
    ? t(`biometric.${capability.labelKey}`)
    : t('biometric.biometrics');

  const biometricIcon: IconName =
    capability?.kind === 'FaceID' ? 'faceId' : 'fingerprint';

  async function onEnableBiometric() {
    if (!capability?.available) {
      return;
    }

    setEnabling(true);
    const result = await promptBiometric(
      t('biometric.promptSubtitle', { type: biometricLabel }),
      t('common.cancel'),
    );
    setEnabling(false);

    if (result.status === 'success') {
      await completeSecuritySetup({
        biometricEnabled: true,
        preferredMethod: 'biometric',
      });
      return;
    }

    if (result.status === 'failed') {
      Alert.alert(t('common.error'), t('biometric.failed'));
    }
  }

  function onSkip() {
    Alert.alert(t('biometric.title'), t('biometric.skipWarning'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.skip'),
        style: 'destructive',
        onPress: () => completeSecuritySetup({ preferredMethod: null }),
      },
    ]);
  }

  const insets = useSafeAreaInsets();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.shieldChip}>
          <Icon name="shield" size={30} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>{t('biometric.title')}</Text>
        <Text style={styles.subtitle}>{t('biometric.subtitle')}</Text>
      </View>

      <View style={styles.options}>
        <OptionCard
          icon={biometricIcon}
          title={t('biometric.useBiometric', { type: biometricLabel })}
          description={
            capability && !capability.available
              ? t('biometric.unavailable', { type: biometricLabel })
              : t('biometric.biometricHint')
          }
          onPress={onEnableBiometric}
          disabled={!capability?.available || enabling}
          loading={enabling}
          recommended
        />

        <OptionCard
          icon="lock"
          title={t('biometric.usePin')}
          description={t('biometric.pinHint')}
          onPress={() => navigation.navigate('PinSetup', { mode: 'create' })}
        />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label={t('common.skip')} variant="ghost" onPress={onSkip} />
      </View>
    </Screen>
  );
}

function OptionCard({
  icon,
  title,
  description,
  onPress,
  disabled = false,
  loading = false,
  recommended = false,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  recommended?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => [
        styles.card,
        recommended && styles.cardRecommended,
        pressed && !disabled && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}>
      <View
        style={[
          styles.cardIcon,
          recommended && { backgroundColor: colors.primary },
        ]}>
        <Icon
          name={icon}
          size={26}
          color={recommended ? colors.textOnPrimary : colors.primary}
          strokeWidth={1.8}
        />
      </View>

      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: AppColors, t: { shadow: (typeof shadows)['light'] }) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    header: {
      alignItems: 'center',
      paddingTop: spacing.xxxl,
      gap: spacing.sm,
    },
    shieldChip: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { ...typography.display, color: c.textPrimary, textAlign: 'center' },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.sm,
    },
    options: { flex: 1, justifyContent: 'center', gap: spacing.md },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      ...(t.shadow.card as object),
    },
    cardRecommended: { borderColor: c.primary },
    cardPressed: { transform: [{ scale: 0.99 }], backgroundColor: c.primarySoft },
    cardDisabled: { opacity: 0.5 },
    cardIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: { flex: 1, gap: 3 },
    cardTitle: { ...typography.subtitle, color: c.textPrimary },
    cardDescription: { ...typography.caption, color: c.textSecondary },
    footer: { alignItems: 'center' },
  });
