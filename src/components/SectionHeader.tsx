import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export default function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  text: { ...typography.overline, color: colors.textTertiary },
});
