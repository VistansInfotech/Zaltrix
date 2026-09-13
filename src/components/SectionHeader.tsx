import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppColors, spacing, typography, useThemedStyles } from '../theme';

export default function SectionHeader({ title }: { title: string }) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>{title}</Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: spacing.xs,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    text: { ...typography.overline, color: c.textTertiary },
  });
