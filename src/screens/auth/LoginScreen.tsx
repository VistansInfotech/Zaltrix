import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import TextField, { TextFieldHandle } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import { isValidEmail } from '../../utils/validation';
import type { AuthStackScreenProps } from '../../navigation/types';
import AuthHeader from './AuthHeader';

type Errors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen({ navigation }: AuthStackScreenProps<'Login'>) {
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef<TextFieldHandle>(null);

  function validate(): boolean {
    const next: Errors = {};

    if (!email.trim()) {
      next.email = t('auth.errors.emailRequired');
    } else if (!isValidEmail(email)) {
      next.email = t('auth.errors.emailInvalid');
    }

    if (!password) {
      next.password = t('auth.errors.passwordRequired');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit() {
    setFormError(null);
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(t(`auth.errors.${result.error}`));
    }
  }

  return (
    <Screen scroll avoidKeyboard contentStyle={styles.content}>
      <AuthHeader onBack={() => navigation.goBack()} />

      <View style={styles.logoRow}>
        <Logo variant="horizontalLight" width={150} />
      </View>

      <Text style={styles.title}>{t('auth.loginTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>

      {formError ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={formError} />
        </View>
      ) : null}

      <TextField
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />

      <TextField
        ref={passwordRef}
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secure
        showLabel={t('auth.showPassword')}
        hideLabel={t('auth.hidePassword')}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Button label={t('auth.login')} onPress={onSubmit} loading={submitting} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.noAccount')}</Text>
        <Button
          label={t('auth.signUp')}
          variant="ghost"
          fullWidth={false}
          onPress={() => navigation.replace('SignUp')}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl },
    logoRow: { alignItems: 'flex-start', marginBottom: spacing.xl },
    title: { ...typography.display, color: c.textPrimary },
    subtitle: {
      ...typography.body,
      color: c.textSecondary,
      marginTop: spacing.xs,
      marginBottom: spacing.xl,
    },
    bannerWrap: { marginBottom: spacing.lg },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.lg,
    },
    footerText: { ...typography.body, color: c.textSecondary },
  });
