import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import { colors, spacing, typography } from '../../theme';
import { formatLongDate } from '../../utils/format';

const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;

/** Last substantive revision of the terms copy. */
const LAST_UPDATED = new Date('2026-09-01T00:00:00Z');

export default function TermsScreen() {
  const { t, language } = usePreferences();

  const formattedDate = formatLongDate(LAST_UPDATED, language);

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.updated}>
        {t('terms.lastUpdated', { date: formattedDate })}
      </Text>

      <Text style={styles.intro}>{t('terms.intro')}</Text>

      {SECTIONS.map(key => (
        <View key={key} style={styles.section}>
          <Text style={styles.heading}>{t(`terms.${key}Title`)}</Text>
          <Text style={styles.body}>{t(`terms.${key}Body`)}</Text>
        </View>
      ))}

      <View style={styles.footer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  updated: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  intro: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  heading: { ...typography.subtitle, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
  footer: { height: spacing.xxl },
});
