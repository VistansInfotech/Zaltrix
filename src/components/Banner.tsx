import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../theme';
import Icon, { IconName } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneFor = (
  c: AppColors,
): Record<Tone, { bg: string; fg: string; icon: IconName }> => ({
  info: { bg: c.primarySoft, fg: c.primaryDark, icon: 'info' },
  success: { bg: c.successSoft, fg: c.success, icon: 'check' },
  warning: { bg: c.accentSoft, fg: c.accentStrong, icon: 'alert' },
  danger: { bg: c.dangerSoft, fg: c.danger, icon: 'alert' },
});

export default function Banner({
  tone = 'info',
  message,
}: {
  tone?: Tone;
  message: string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const scheme = toneFor(colors)[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: scheme.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Icon name={scheme.icon} size={18} color={scheme.fg} strokeWidth={2} />
      <Text style={[styles.text, { color: scheme.fg }]}>{message}</Text>
    </View>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    text: { ...typography.caption, flex: 1, lineHeight: 19 },
  });
