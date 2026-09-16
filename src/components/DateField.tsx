import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useTheme,
  useThemedStyles,
} from '../theme';
import Icon from './Icon';

type Props = {
  label: string;
  /** The chosen date, or null when nothing has been picked yet. */
  value: Date | null;
  onChange: (date: Date) => void;
  /** Shown in place of a date before one is chosen. */
  placeholder: string;
  error?: string | null;
  hint?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Locale tag for formatting the chosen date. */
  locale?: string;
  /** Confirm button on the iOS sheet. */
  doneLabel: string;
  /**
   * Dismiss control. Distinct from `doneLabel` on purpose: the backdrop
   * discards the pick, so announcing it as "Done" told a screen-reader user
   * the opposite of what tapping it does.
   */
  closeLabel: string;
  /** The date the picker opens on when nothing is chosen — e.g. age 25. */
  initialDate?: Date;
};

/**
 * A date, entered with the platform's own picker rather than by typing.
 *
 * Typed dates mean parsing free text and arguing about whether 03/04 is March
 * or April; the native picker sidesteps both and cannot produce an impossible
 * day. The trigger is styled as a TextField so it sits in a form without
 * looking like a button that wandered in.
 *
 * The two platforms want different shapes, so they get them: Android's picker
 * is already a modal dialog and is rendered bare, while iOS's is an inline
 * wheel that needs a sheet and a Done button of its own.
 */
export default function DateField({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  minimumDate,
  maximumDate,
  locale,
  doneLabel,
  closeLabel,
  initialDate,
}: Props) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  /**
   * iOS spins a wheel and only commits on Done, so the in-progress date lives
   * here until then. Committing every tick would fire onChange on every digit
   * scrolled past — and mark the field valid halfway through being set.
   */
  const [draft, setDraft] = useState<Date | null>(null);

  const opening = value ?? initialDate ?? maximumDate ?? new Date();
  const borderColor = error ? colors.danger : colors.border;

  function openPicker() {
    setDraft(opening);
    setOpen(true);
  }

  const shared = {
    mode: 'date' as const,
    minimumDate,
    maximumDate,
    locale,
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{
          text: value ? value.toLocaleDateString(locale) : placeholder,
        }}
        style={({ pressed }) => [
          styles.field,
          { borderColor, borderWidth: error ? 1.5 : 1 },
          pressed && styles.pressed,
        ]}>
        <Text style={value ? styles.valueText : styles.placeholder} numberOfLines={1}>
          {value
            ? value.toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : placeholder}
        </Text>
        <Icon name="calendar" size={20} color={colors.textTertiary} strokeWidth={1.8} />
      </Pressable>

      {error ? (
        <View style={styles.messageRow}>
          <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          {...shared}
          value={opening}
          display="spinner"
          onChange={(event, picked) => {
            // Android reports the dismissal itself; 'set' is the only commit.
            setOpen(false);
            if (event.type === 'set' && picked) {
              onChange(picked);
            }
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            onPress={() => setOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetBar}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable
                onPress={() => {
                  if (draft) {
                    onChange(draft);
                  }
                  setOpen(false);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={doneLabel}
                style={({ pressed }) => pressed && styles.pressed}>
                <Text style={styles.done}>{doneLabel}</Text>
              </Pressable>
            </View>
            <DateTimePicker
              {...shared}
              value={draft ?? opening}
              display="spinner"
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.textPrimary}
              onChange={(_event, picked) => picked && setDraft(picked)}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    wrapper: { marginBottom: spacing.lg },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      marginBottom: spacing.xs + 2,
      fontWeight: '600',
    },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      minHeight: 52,
    },
    pressed: { opacity: 0.7 },
    valueText: { ...typography.body, color: c.textPrimary, flexShrink: 1 },
    placeholder: { ...typography.body, color: c.textTertiary, flexShrink: 1 },

    messageRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    error: { ...typography.caption, color: c.danger, flex: 1 },
    hint: { ...typography.caption, color: c.textTertiary, marginTop: spacing.xs },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: spacing.xxl,
    },
    sheetBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    sheetTitle: { ...typography.bodyStrong, color: c.textPrimary },
    done: { ...typography.bodyStrong, color: c.primary },
  });
