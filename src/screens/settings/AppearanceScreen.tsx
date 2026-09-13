import React from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import Card from '../../components/Card';
import Icon, { IconName } from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AppColors,
  radius,
  spacing,
  ThemePreference,
  THEME_PREFERENCES,
  typography,
  useColors,
  useTheme,
  useThemedStyles,
} from '../../theme';

const icons: Record<ThemePreference, IconName> = {
  system: 'contrast',
  light: 'eye',
  dark: 'lock',
};

export default function AppearanceScreen() {
  const { t } = usePreferences();
  const { preference, setPreference } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const systemScheme = useColorScheme();

  const systemName =
    systemScheme === 'dark' ? t('appearance.dark') : t('appearance.light');

  function select(pref: ThemePreference) {
    if (pref !== preference) {
      void setPreference(pref);
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.subtitle}>{t('appearance.subtitle')}</Text>

      <Card flush>
        {THEME_PREFERENCES.map((pref, index) => (
          <AppearanceOption
            key={pref}
            icon={icons[pref]}
            title={t(`appearance.${pref}`)}
            subtitle={
              pref === 'system'
                ? `${t('appearance.systemSubtitle')} · ${systemName}`
                : t(`appearance.${pref}Subtitle`)
            }
            selected={preference === pref}
            onPress={() => select(pref)}
            last={index === THEME_PREFERENCES.length - 1}
          />
        ))}
      </Card>

      <View style={styles.previewWrap}>
        <Text style={styles.previewLabel}>{t('appearance.previewLabel')}</Text>
        <Card style={styles.preview}>
          <View style={styles.previewRow}>
            <View style={styles.swatchPrimary} />
            <View style={styles.previewText}>
              <Text style={styles.previewTitle}>{t('appearance.previewTitle')}</Text>
              <Text style={styles.previewBody}>{t('appearance.previewBody')}</Text>
            </View>
          </View>
        </Card>
      </View>

      <Text style={styles.hint}>{t('appearance.hint')}</Text>
    </Screen>
  );
}

function AppearanceOption({
  icon,
  title,
  subtitle,
  selected,
  onPress,
  last = false,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.row,
        last && styles.rowLast,
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.iconChip}>
        <Icon name={icon} size={18} color={colors.primary} strokeWidth={1.9} />
      </View>

      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, selected && styles.rowTitleSelected]}
          numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? (
          <Icon name="check" size={14} color={colors.textOnPrimary} strokeWidth={3} />
        ) : null}
      </View>
    </Pressable>
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

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: 62,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowPressed: { backgroundColor: c.surfaceAlt },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: radius.sm + 2,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: c.textPrimary, fontSize: 16 },
    rowTitleSelected: { color: c.primary },
    rowSubtitle: { ...typography.caption, color: c.textSecondary },

    check: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: c.primary, borderColor: c.primary },

    previewWrap: { marginTop: spacing.xxl },
    previewLabel: {
      ...typography.overline,
      color: c.textTertiary,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    preview: {},
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    swatchPrimary: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    previewText: { flex: 1, gap: 3 },
    previewTitle: { ...typography.bodyStrong, color: c.textPrimary },
    previewBody: { ...typography.caption, color: c.textSecondary },

    hint: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
  });
