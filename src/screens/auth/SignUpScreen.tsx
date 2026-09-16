import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ageFrom,
  GENDERS,
  MAX_AGE_YEARS,
  MIN_AGE_YEARS,
  toDateKey,
  USER_ROLES,
  type Gender,
  type UserRole,
} from '../../types';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import DateField from '../../components/DateField';
import Logo from '../../components/Logo';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
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

type Errors = Partial<
  Record<'name' | 'email' | 'dob' | 'gender' | 'password' | 'confirm', string>
>;

/** Copy keys per role, so the card list stays a plain map over USER_ROLES. */
const ROLE_KEYS: Record<UserRole, { label: string; hint: string }> = {
  user: { label: 'auth.roleUser', hint: 'auth.roleUserHint' },
  hr: { label: 'auth.roleHr', hint: 'auth.roleHrHint' },
  admin: { label: 'auth.roleAdmin', hint: 'auth.roleAdminHint' },
};

/** Years back from today, at local midnight. */
function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function SignUpScreen({ navigation }: AuthStackScreenProps<'SignUp'>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t, language } = usePreferences();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  // No default. A pre-selected gender is an answer the form gave on someone's
  // behalf, and most people would never notice it had.
  const [gender, setGender] = useState<Gender | null>(null);
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

  // Hoisted out of render: these are the picker's bounds, not per-keystroke
  // values, and `new Date()` inside the JSX would hand it a new object each time.
  const oldest = useMemo(() => yearsAgo(MAX_AGE_YEARS), []);
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  /** Where the wheel opens when nothing is chosen — a plausible working age. */
  const openAt = useMemo(() => yearsAgo(25), []);

  // Rebuilt when the language changes, not on every keystroke.
  const genderOptions = useMemo(
    () =>
      GENDERS.map(value => ({
        value,
        label: t(`auth.gender${value.charAt(0).toUpperCase()}${value.slice(1)}`),
      })),
    [t],
  );

  const roleOptions = useMemo(
    () =>
      USER_ROLES.map(value => ({
        value,
        label: t(ROLE_KEYS[value].label),
        // What the role actually grants, shown against each option in the
        // sheet — this is a permission, not a preference, and picking one
        // blind is how somebody ends up an admin by accident.
        hint: t(ROLE_KEYS[value].hint),
      })),
    [t],
  );

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

    if (!dob) {
      next.dob = t('auth.errors.dobRequired');
    } else if (dob > today) {
      next.dob = t('auth.errors.dobFuture');
    } else if (dob < oldest) {
      next.dob = t('auth.errors.dobImplausible');
    } else if (ageFrom(dob) < MIN_AGE_YEARS) {
      next.dob = t('auth.errors.dobTooYoung', { years: MIN_AGE_YEARS });
    }

    if (!gender) {
      next.gender = t('auth.errors.genderRequired');
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
    const result = await signUp({
      name,
      email,
      password,
      role,
      // Validated above, so the non-null assertions hold; stored as a calendar
      // day rather than an instant so the birthday never shifts across zones.
      dateOfBirth: toDateKey(dob!),
      gender,
    });
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
        returnKeyType="done"
      />

      <DateField
        label={t('auth.dateOfBirth')}
        placeholder={t('auth.dateOfBirthPlaceholder')}
        hint={t('auth.dateOfBirthHint')}
        value={dob}
        onChange={setDob}
        error={errors.dob}
        minimumDate={oldest}
        maximumDate={today}
        initialDate={openAt}
        locale={language}
        doneLabel={t('common.done')}
        closeLabel={t('common.close')}
      />

      <SelectField
        label={t('auth.gender')}
        placeholder={t('auth.genderPlaceholder')}
        value={gender}
        onChange={setGender}
        options={genderOptions}
        error={errors.gender}
        closeLabel={t('common.close')}
      />

      <SelectField
        label={t('auth.accountType')}
        placeholder={t('auth.accountTypePlaceholder')}
        value={role}
        onChange={setRole}
        options={roleOptions}
        hint={t(ROLE_KEYS[role].hint)}
        closeLabel={t('common.close')}
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
