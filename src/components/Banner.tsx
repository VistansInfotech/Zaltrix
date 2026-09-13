import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import Icon, { IconName } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: colors.primarySoft, fg: colors.primaryDark, icon: 'info' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'check' },
  warning: { bg: colors.accentSoft, fg: '#7A5E10', icon: 'alert' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert' },
};

export default function Banner({
  tone = 'info',
  message,
}: {
  tone?: Tone;
  message: string;
}) {
  const scheme = tones[tone];

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

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { ...typography.caption, flex: 1, lineHeight: 19 },
});
