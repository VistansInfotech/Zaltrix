import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Removes inner padding for rows that draw their own. */
  flush?: boolean;
};

export default function Card({ children, style, flush = false }: Props) {
  return (
    <View style={[styles.card, !flush && styles.padded, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...(shadow.card as object),
  },
  padded: { padding: spacing.lg },
});
