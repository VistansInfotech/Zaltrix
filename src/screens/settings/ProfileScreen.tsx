import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Avatar from '../../components/Avatar';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { colors, spacing, typography } from '../../theme';
import { formatMonthYear } from '../../utils/format';

export default function ProfileScreen() {
  const { t, language } = usePreferences();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== (user?.name ?? '') && name.trim().length > 0;

  const memberSince = user
    ? formatMonthYear(new Date(user.createdAt), language)
    : '';

  async function onSave() {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setError(t('auth.errors.nameTooShort'));
      return;
    }

    setError(null);
    await updateProfile({ name: trimmed });
    setSaved(true);
  }

  return (
    <Screen scroll avoidKeyboard contentStyle={styles.content}>
      <View style={styles.hero}>
        <Avatar
          name={name || user?.name || '?'}
          size={92}
          label={t('profile.initialsAlt')}
        />
        <Text style={styles.email}>{user?.email}</Text>
        {memberSince ? (
          <Text style={styles.member}>
            {t('profile.memberSince', { date: memberSince })}
          </Text>
        ) : null}
      </View>

      {saved ? (
        <View style={styles.bannerWrap}>
          <Banner tone="success" message={t('profile.saved')} />
        </View>
      ) : null}

      <Card>
        <TextField
          label={t('profile.displayName')}
          value={name}
          onChangeText={v => {
            setName(v);
            setSaved(false);
            setError(null);
          }}
          error={error}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onSave}
        />

        <TextField
          label={t('profile.email')}
          value={user?.email ?? ''}
          editable={false}
          hint={t('profile.emailLocked')}
          style={styles.readonly}
        />
      </Card>

      <Button
        label={t('common.save')}
        onPress={onSave}
        disabled={!dirty}
        style={styles.save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
  email: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  member: { ...typography.caption, color: colors.textTertiary },
  bannerWrap: { marginBottom: spacing.lg },
  readonly: { color: colors.textTertiary },
  save: { marginTop: spacing.xl },
});
