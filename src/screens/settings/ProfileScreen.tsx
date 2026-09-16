import React, { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import Avatar from '../../components/Avatar';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  PickSource,
  ProfileImageError,
  pickProfileImage,
} from '../../services/profileImage';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import { ageFrom, fromDateKey, roleOf } from '../../types';
import { formatMonthYear } from '../../utils/format';
import { isValidPhone } from '../../utils/validation';
import type { SettingsStackScreenProps } from '../../navigation/types';

type Mode = 'view' | 'edit';

export default function ProfileScreen({
  navigation,
}: SettingsStackScreenProps<'Profile'>) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { t, language } = usePreferences();
  const { user, updateProfile } = useAuth();

  const [mode, setMode] = useState<Mode>('view');
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [position, setPosition] = useState(user?.position ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const memberSince = user ? formatMonthYear(new Date(user.createdAt), language) : '';
  const notSet = t('profile.notSet');

  // Both are set once at sign-up and shown read-only here, so the answers a
  // person gave are visible to them rather than only to storage.
  const born = fromDateKey(user?.dateOfBirth);
  const dateOfBirth = born
    ? `${born.toLocaleDateString(language, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })} · ${t('profile.age', { count: ageFrom(born) })}`
    : null;
  const gender = user?.gender
    ? t(
        `auth.gender${user.gender.charAt(0).toUpperCase()}${user.gender.slice(1)}`,
      )
    : null;

  // HR and admin are the same permissions under two titles, so the title is
  // the only place the distinction is visible at all.
  const ROLE_LABELS = { user: 'auth.roleUser', hr: 'auth.roleHr', admin: 'auth.roleAdmin' };
  const roleLabel = t(ROLE_LABELS[roleOf(user)]);

  /* --------------------------------- editing -------------------------------- */

  function startEditing() {
    // Always seed from the stored user, so a previous cancel cannot leak through.
    setName(user?.name ?? '');
    setPhone(user?.phone ?? '');
    setPosition(user?.position ?? '');
    setNameError(null);
    setPhoneError(null);
    setNotice(null);
    setMode('edit');
  }

  function cancelEditing() {
    setNameError(null);
    setPhoneError(null);
    setMode('view');
  }

  async function onSave() {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedPosition = position.trim();

    if (trimmedName.length < 2) {
      setNameError(t('auth.errors.nameTooShort'));
      return;
    }
    // Phone is optional; validate only what was actually typed.
    if (trimmedPhone.length > 0 && !isValidPhone(trimmedPhone)) {
      setPhoneError(t('profile.phoneInvalid'));
      return;
    }

    setNameError(null);
    setPhoneError(null);
    await updateProfile({
      name: trimmedName,
      phone: trimmedPhone.length > 0 ? trimmedPhone : null,
      position: trimmedPosition.length > 0 ? trimmedPosition : null,
    });
    setNotice(t('profile.saved'));
    setMode('view');
  }

  // The Edit affordance lives in the navigation header, and only in view mode.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        mode === 'view' ? (
          <Pressable
            onPress={startEditing}
            accessibilityRole="button"
            accessibilityLabel={t('profile.edit')}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.headerPressed}>
            <Text style={styles.headerAction}>{t('profile.edit')}</Text>
          </Pressable>
        ) : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, mode, t, styles]);

  /* ---------------------------------- photo --------------------------------- */

  async function choosePhoto(source: PickSource) {
    setPhotoBusy(true);
    setPhotoError(null);
    setNotice(null);
    try {
      const avatar = await pickProfileImage(source);
      await updateProfile({ avatar });
      setNotice(t('profile.photoUpdated'));
    } catch (e) {
      const reason = e instanceof ProfileImageError ? e.reason : 'failed';
      // Backing out of the picker is not an error worth shouting about.
      if (reason !== 'cancelled') {
        setPhotoError(t(`profile.photoErrors.${reason}`));
      }
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoError(null);
    await updateProfile({ avatar: null });
    setNotice(t('profile.photoRemoved'));
  }

  function openPhotoMenu() {
    const buttons: {
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }[] = [
      { text: t('profile.photoTake'), onPress: () => void choosePhoto('camera') },
      { text: t('profile.photoChoose'), onPress: () => void choosePhoto('library') },
    ];
    if (user?.avatar) {
      buttons.push({
        text: t('profile.photoRemove'),
        onPress: () => void removePhoto(),
        style: 'destructive',
      });
    }
    buttons.push({ text: t('common.cancel'), style: 'cancel' });

    Alert.alert(t('profile.photoTitle'), t('profile.photoSubtitle'), buttons);
  }

  /* --------------------------------- render --------------------------------- */

  return (
    <Screen scroll avoidKeyboard contentStyle={styles.content}>
      <View style={styles.hero}>
        <Pressable
          onPress={openPhotoMenu}
          disabled={photoBusy}
          accessibilityRole="button"
          accessibilityLabel={t('profile.photoEdit')}
          accessibilityHint={t('profile.photoSubtitle')}
          style={({ pressed }) => [styles.avatarTap, pressed && styles.avatarPressed]}>
          <Avatar
            name={user?.name || '?'}
            size={92}
            uri={user?.avatar}
            label={t('profile.initialsAlt')}
          />
          <View style={styles.editBadge}>
            {photoBusy ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Icon name="camera" size={16} color={colors.textOnPrimary} strokeWidth={2} />
            )}
          </View>
        </Pressable>

        <Text style={styles.heroName} numberOfLines={1}>
          {user?.name}
        </Text>
        <Text style={styles.heroHint}>{t('profile.photoHint')}</Text>
      </View>

      {photoError ? (
        <View style={styles.bannerWrap}>
          <Banner tone="danger" message={photoError} />
        </View>
      ) : null}

      {notice ? (
        <View style={styles.bannerWrap}>
          <Banner tone="success" message={notice} />
        </View>
      ) : null}

      {mode === 'view' ? (
        <Card flush>
          <DetailRow label={t('profile.displayName')} value={user?.name} />
          <DetailRow label={t('profile.email')} value={user?.email} />
          <DetailRow label={t('profile.phone')} value={user?.phone} fallback={notSet} />
          <DetailRow
            label={t('profile.position')}
            value={user?.position}
            fallback={notSet}
          />
          <DetailRow
            label={t('profile.dateOfBirth')}
            value={dateOfBirth}
            fallback={notSet}
          />
          <DetailRow label={t('profile.gender')} value={gender} fallback={notSet} />
          <DetailRow label={t('profile.role')} value={roleLabel} />
          <DetailRow label={t('profile.userId')} value={user?.id} mono />
          <DetailRow label={t('profile.memberSinceLabel')} value={memberSince} last />
        </Card>
      ) : (
        <>
          <Card>
            <TextField
              label={t('profile.displayName')}
              value={name}
              onChangeText={v => {
                setName(v);
                setNameError(null);
              }}
              error={nameError}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <TextField
              label={t('profile.phone')}
              value={phone}
              onChangeText={v => {
                setPhone(v);
                setPhoneError(null);
              }}
              error={phoneError}
              hint={t('profile.phoneHint')}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />

            <TextField
              label={t('profile.position')}
              value={position}
              onChangeText={setPosition}
              hint={t('profile.positionHint')}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
          </Card>

          {/* Not editable, but still worth seeing while editing. */}
          <Card flush style={styles.lockedCard}>
            <DetailRow label={t('profile.email')} value={user?.email} locked />
            <DetailRow label={t('profile.userId')} value={user?.id} mono locked last />
          </Card>

          <Button label={t('common.save')} onPress={onSave} style={styles.save} />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={cancelEditing}
            style={styles.cancel}
          />
        </>
      )}
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  fallback,
  mono = false,
  locked = false,
  last = false,
}: {
  label: string;
  value?: string | null;
  /** Shown in muted type when the value is empty. */
  fallback?: string;
  mono?: boolean;
  locked?: boolean;
  last?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const shown = value && value.length > 0 ? value : fallback ?? '—';
  const isEmpty = !(value && value.length > 0);

  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          mono && styles.rowValueMono,
          (isEmpty || locked) && styles.rowValueMuted,
        ]}
        numberOfLines={2}>
        {shown}
      </Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

    headerAction: { ...typography.button, color: c.primary, fontSize: 15 },
    headerPressed: { opacity: 0.6 },

    hero: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xl },
    avatarTap: { position: 'relative' },
    avatarPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    editBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background,
    },
    heroName: {
      ...typography.title,
      color: c.textPrimary,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    heroHint: { ...typography.caption, color: c.textTertiary },

    bannerWrap: { marginBottom: spacing.lg },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: 54,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { ...typography.caption, color: c.textSecondary, width: '34%' },
    rowValue: { ...typography.bodyStrong, color: c.textPrimary, flex: 1 },
    rowValueMono: { fontSize: 13, letterSpacing: 0.2 },
    rowValueMuted: { color: c.textTertiary, fontWeight: '400' },

    lockedCard: { marginTop: spacing.md },
    save: { marginTop: spacing.xl },
    cancel: { marginTop: spacing.xs },
  });
