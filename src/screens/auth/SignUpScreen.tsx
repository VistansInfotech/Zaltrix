import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import TextField, { TextFieldHandle } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { colors, radius, spacing, typography } from '../../theme';
import {
  isValidEmail,
  passwordStrength,
  STRENGTH_KEYS,
} from '../../utils/validation';
import type { AuthStackScreenProps } from '../../navigation/types';
import AuthHeader from './AuthHeader';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const { t } = usePreferences();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRef = useRef<TextFieldHandle>(null);
  const passwordRef = useRef<TextFieldHandle>(null);
  const confirmRef = useRef<TextFieldHandle>(null);

  const strength = useMemo(() => passwordStrength(password), [password]);

  function validate(): boolean {
    const next: Errors = {};

    if (!name.trim()) {
      next.name = t('auth.errors.nameRequired');
    } else if (name.trim().length < 2) {
      next.name = t('auth.errors.nameTooShort');
    }

    if (!email.trim()) {
      next.email = t('auth.errors.emailRequired');
    } else if (!isValidEmail(email)) {
      next.email = t('auth.errors.emailInvalid');
    }

    if (!password) {
      next.password = t('auth.errors.passwordRequired');
    } else if (password.length < 8) {
      next.password = t('auth.errors.passwordTooShort');
    }

    if (confirm !== password) {
      next.confirm = t('auth.errors.confirmMismatch');
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
    const result = await signUp(name, email, password);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(t(`auth.errors.${result.error}`));
    }
    // On success the root navigator swaps to the security-setup flow.
  }

  return (
    <Screen scroll avoidKeyboard contentStyle={styles.content}>
      <AuthHeader onBack={() => navigation.goBack()} />

      <View style={styles.logoRow}>
        <Logo variant="horizontalLight" width={150} />
      </View>

      <Text style={styles.title}>{t('auth.signUpTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.signUpSubtitle')}</Text>

      {formError ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={formError} />
        </View>
      ) : null}

      <TextField
        label={t('auth.fullName')}
        placeholder={t('auth.fullNamePlaceholder')}
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
      />

      <TextField
        ref={emailRef}
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />

      {password.length > 0 ? (
        <View style={styles.strength}>
          <View style={styles.strengthBars}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.strengthBar,
                  i < strength && { backgroundColor: STRENGTH_COLORS[strength] },
                ]}
              />
            ))}
          </View>
          <Text style={styles.strengthLabel}>
            {t('auth.passwordStrength.label')}:{' '}
            {t(`auth.passwordStrength.${STRENGTH_KEYS[strength]}`)}
          </Text>
        </View>
      ) : null}

      <TextField
        ref={confirmRef}
        label={t('auth.confirmPassword')}
        placeholder={t('auth.passwordPlaceholder')}
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
        secure
        showLabel={t('auth.showPassword')}
        hideLabel={t('auth.hidePassword')}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <Button
        label={t('auth.signUp')}
        onPress={onSubmit}
        loading={submitting}
        style={styles.submit}
      />

      <Text style={styles.terms}>{t('auth.termsAgree')}</Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.haveAccount')}</Text>
        <Button
          label={t('auth.login')}
          variant="ghost"
          fullWidth={false}
          onPress={() => navigation.replace('Login')}
        />
      </View>
    </Screen>
  );
}

const STRENGTH_COLORS = [
  colors.danger,
  colors.warning,
  colors.accent,
  colors.success,
];

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl },
  logoRow: { alignItems: 'flex-start', marginBottom: spacing.xl },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  bannerWrap: { marginBottom: spacing.lg },
  strength: { marginTop: -spacing.sm, marginBottom: spacing.lg, gap: spacing.xs },
  strengthBars: { flexDirection: 'row', gap: spacing.xs },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  strengthLabel: { ...typography.caption, color: colors.textTertiary },
  submit: { marginTop: spacing.sm },
  terms: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: { ...typography.body, color: colors.textSecondary },
});
