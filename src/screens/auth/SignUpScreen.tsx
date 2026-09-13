import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { UserRole } from '../../types';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import TextField, { TextFieldHandle } from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { AppColors, radius, spacing, typography, useColors, useThemedStyles } from '../../theme';
import {
  isValidEmail,
  passwordStrength,
  STRENGTH_KEYS,
} from '../../utils/validation';
import type { AuthStackScreenProps } from '../../navigation/types';
import AuthHeader from './AuthHeader';

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Fixed once the account exists, so it defaults to the lesser privilege:
  // an admin picked by accident is a permission nobody intended to grant.
  const [role, setRole] = useState<UserRole>('user');

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
    const result = await signUp(name, email, password, role);
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
                  i < strength && { backgroundColor: strengthColors(colors)[strength] },
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

      <Text style={styles.roleHeading}>{t('auth.accountType')}</Text>
      <View style={styles.roleRow}>
        {(['user', 'admin'] as const).map(option => {
          const selected = role === option;
          return (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={t(
                option === 'admin' ? 'auth.roleAdmin' : 'auth.roleUser',
              )}
              accessibilityHint={t(
                option === 'admin' ? 'auth.roleAdminHint' : 'auth.roleUserHint',
              )}
              style={({ pressed }) => [
                styles.roleCard,
                selected && styles.roleCardSelected,
                pressed && styles.rolePressed,
              ]}>
              <Text
                style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
                {t(option === 'admin' ? 'auth.roleAdmin' : 'auth.roleUser')}
              </Text>
              <Text style={styles.roleHint}>
                {t(option === 'admin' ? 'auth.roleAdminHint' : 'auth.roleUserHint')}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

/** Weakest to strongest; indexed by the computed strength score. */
const strengthColors = (c: AppColors) => [c.danger, c.warning, c.accent, c.success];

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
    strength: { marginTop: -spacing.sm, marginBottom: spacing.lg, gap: spacing.xs },
    strengthBars: { flexDirection: 'row', gap: spacing.xs },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.border,
    },
    strengthLabel: { ...typography.caption, color: c.textTertiary },
    roleHeading: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    roleRow: { flexDirection: 'row', gap: spacing.sm },
    roleCard: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      gap: 2,
    },
    roleCardSelected: { borderColor: c.primary, backgroundColor: c.primarySoft },
    rolePressed: { opacity: 0.7 },
    roleLabel: { ...typography.bodyStrong, color: c.textPrimary },
    roleLabelSelected: { color: c.primary },
    roleHint: { ...typography.caption, color: c.textSecondary, fontSize: 11 },
    submit: { marginTop: spacing.sm },
    terms: {
      ...typography.caption,
      color: c.textTertiary,
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
    footerText: { ...typography.body, color: c.textSecondary },
  });
