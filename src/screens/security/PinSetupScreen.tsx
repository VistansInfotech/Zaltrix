import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Banner from '../../components/Banner';
import Icon from '../../components/Icon';
import PinPad, { PinDots, PIN_LENGTH } from '../../components/PinPad';
import Screen from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { savePin } from '../../services/secureStore';
import { AppColors, radius, spacing, typography, useColors, useThemedStyles } from '../../theme';
import { isWeakPin } from '../../utils/validation';

type Stage = 'create' | 'confirm';

type Props = {
  /** 'change' is reached from Settings and returns instead of finishing setup. */
  mode: 'create' | 'change';
  onDone: () => void;
  onBack: () => void;
};

/**
 * Two-stage PIN entry (choose, then confirm) shared by first-run setup and the
 * "change PIN" flow in Settings.
 */
export default function PinSetupScreen({ mode, onDone, onBack }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { completeSecuritySetup, updateSecurity } = useAuth();
  const insets = useSafeAreaInsets();

  const [stage, setStage] = useState<Stage>('create');
  const [first, setFirst] = useState('');
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const commit = useCallback(
    async (pin: string) => {
      setSaving(true);
      const ok = await savePin(pin);
      setSaving(false);

      if (!ok) {
        setError(t('common.error'));
        setStage('create');
        setFirst('');
        setEntry('');
        return;
      }

      if (mode === 'change') {
        await updateSecurity({ pinEnabled: true });
      } else {
        await completeSecuritySetup({ pinEnabled: true, preferredMethod: 'pin' });
      }
      onDone();
    },
    [mode, completeSecuritySetup, updateSecurity, onDone, t],
  );

  // Advance whenever a full PIN has been entered.
  useEffect(() => {
    if (entry.length < PIN_LENGTH || saving) {
      return;
    }

    if (stage === 'create') {
      if (isWeakPin(entry)) {
        setError(t('pin.tooSimple'));
        setEntry('');
        return;
      }
      setFirst(entry);
      setEntry('');
      setError(null);
      setStage('confirm');
      return;
    }

    if (entry === first) {
      setError(null);
      void commit(entry);
    } else {
      setError(t('pin.mismatch'));
      setFirst('');
      setEntry('');
      setStage('create');
    }
  }, [entry, stage, first, saving, commit, t]);

  function onDigit(d: string) {
    setError(null);
    setEntry(prev => (prev.length >= PIN_LENGTH ? prev : prev + d));
  }

  function onDelete() {
    setError(null);
    setEntry(prev => prev.slice(0, -1));
  }

  function handleBack() {
    if (stage === 'confirm') {
      setStage('create');
      setFirst('');
      setEntry('');
      setError(null);
      return;
    }
    onBack();
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Icon
            name={I18nManager.isRTL ? 'chevronRight' : 'chevronLeft'}
            size={22}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.prompt}>
        <View style={styles.lockChip}>
          <Icon name="lock" size={26} color={colors.primary} strokeWidth={1.8} />
        </View>

        <Text style={styles.title}>
          {stage === 'create' ? t('pin.createTitle') : t('pin.confirmTitle')}
        </Text>
        <Text style={styles.subtitle}>
          {stage === 'create' ? t('pin.createSubtitle') : t('pin.confirmSubtitle')}
        </Text>

        <View style={styles.dotsWrap}>
          <PinDots filled={entry.length} error={!!error} />
        </View>

        <View style={styles.errorSlot}>
          {error ? <Banner tone="danger" message={error} /> : null}
        </View>
      </View>

      <View style={[styles.padWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PinPad
          onDigit={onDigit}
          onDelete={onDelete}
          deleteLabel={t('pin.delete')}
          disabled={saving}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    header: { flexDirection: 'row', paddingVertical: spacing.sm },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginStart: -spacing.sm,
    },
    pressed: { backgroundColor: c.surfaceAlt },
    prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    lockChip: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: { ...typography.title, color: c.textPrimary, textAlign: 'center' },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
    },
    dotsWrap: { marginTop: spacing.xl },
    // Fixed height keeps the keypad from jumping when an error appears.
    errorSlot: {
      height: 64,
      justifyContent: 'center',
      alignSelf: 'stretch',
      marginTop: spacing.md,
    },
    padWrap: { alignItems: 'center' },
  });
