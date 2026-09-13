import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  detectDeviceLanguage,
  LanguagePreference,
  SUPPORTED_LANGUAGES,
} from '../../i18n';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';

export default function LanguageScreen() {
  const { t, languagePreference, setLanguage, rtlRestartRequired } =
    usePreferences();
  const styles = useThemedStyles(makeStyles);

  const deviceLanguage = detectDeviceLanguage();
  const deviceName =
    SUPPORTED_LANGUAGES.find(l => l.code === deviceLanguage)?.nativeName ?? '';

  function select(pref: LanguagePreference) {
    if (pref !== languagePreference) {
      void setLanguage(pref);
    }
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={styles.subtitle}>{t('language.subtitle')}</Text>

      {rtlRestartRequired ? (
        <View style={styles.bannerWrap}>
          <Banner tone="warning" message={t('language.rtlNotice')} />
        </View>
      ) : null}

      <Card flush>
        <LanguageOption
          title={t('language.systemDefault')}
          subtitle={`${t('language.systemDefaultSubtitle')} · ${deviceName}`}
          selected={languagePreference === 'system'}
          onPress={() => select('system')}
        />

        {SUPPORTED_LANGUAGES.map((lang, index) => (
          <LanguageOption
            key={lang.code}
            title={lang.nativeName}
            subtitle={lang.englishName}
            selected={languagePreference === lang.code}
            onPress={() => select(lang.code)}
            last={index === SUPPORTED_LANGUAGES.length - 1}
          />
        ))}
      </Card>

      <Text style={styles.hint}>{t('language.restartHint')}</Text>
    </Screen>
  );
}

function LanguageOption({
  title,
  subtitle,
  selected,
  onPress,
  last = false,
}: {
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
      <View style={styles.rowText}>
        <Text
          style={[styles.rowTitle, selected && styles.rowTitleSelected]}
          numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.check, selected && styles.checkOn]}>
        {selected ? (
          <Icon
            name="check"
            size={14}
            color={colors.textOnPrimary}
            strokeWidth={3}
          />
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
    bannerWrap: { marginBottom: spacing.lg },

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

    hint: {
      ...typography.caption,
      color: c.textTertiary,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
  });
