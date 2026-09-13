import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import type { AuthStackScreenProps } from '../../navigation/types';

export default function WelcomeScreen({
  navigation,
}: AuthStackScreenProps<'Welcome'>) {
  const { t } = usePreferences();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Logo variant="stacked" width={248} />
        <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={styles.headline}>{t('welcome.headline')}</Text>
        <Text style={styles.body}>{t('welcome.body')}</Text>
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          label={t('welcome.createAccount')}
          onPress={() => navigation.navigate('SignUp')}
        />
        <Button
          label={t('welcome.signIn')}
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    tagline: {
      ...typography.overline,
      color: c.accentStrong,
      textAlign: 'center',
      letterSpacing: 1.6,
      fontSize: 10.5,
    },
    copy: { gap: spacing.md, marginBottom: spacing.xxl },
    headline: {
      ...typography.display,
      color: c.textPrimary,
      textAlign: 'center',
    },
    body: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    actions: { gap: spacing.sm },
  });
