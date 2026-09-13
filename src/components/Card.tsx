import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { AppColors, radius, spacing, useThemedStyles } from '../theme';
import type { shadows } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Removes inner padding for rows that draw their own. */
  flush?: boolean;
};

export default function Card({ children, style, flush = false }: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={[styles.card, !flush && styles.padded, style]}>{children}</View>
  );
}

const makeStyles = (c: AppColors, t: { shadow: (typeof shadows)['light'] }) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      overflow: 'hidden',
      ...(t.shadow.card as object),
    },
    padded: { padding: spacing.lg },
  });
