import React, { useState } from 'react';
import {
  I18nManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../theme';
import Icon from './Icon';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** Optional second line, for options that need a word of explanation. */
  hint?: string;
};

type Props<T extends string> = {
  label: string;
  /** The chosen value, or null when nothing has been picked yet. */
  value: T | null;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  /** Shown in place of a value before one is chosen. */
  placeholder: string;
  error?: string | null;
  hint?: string;
  /** Title on the sheet; falls back to the field's own label. */
  sheetTitle?: string;
  /** Dismiss control on the sheet. */
  closeLabel: string;
};

/**
 * A one-of-many choice, opened as a sheet rather than laid out inline.
 *
 * Chips show every option at once, which is right for two or three short ones
 * and wrong the moment a form has several such rows — they stack into a wall
 * of pills and the eye loses which group is which. A closed field reads as one
 * line in the form, the same height as the fields around it, and the options
 * only take space while they are being chosen.
 *
 * Selecting commits and closes: there is nothing to confirm in a single
 * choice, so a Done button would just be a second tap on every use.
 */
export default function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  hint,
  sheetTitle,
  closeLabel,
}: Props<T>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);

  const selected = options.find(option => option.value === value);
  const borderColor = error ? colors.danger : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.field,
          { borderColor, borderWidth: error ? 1.5 : 1 },
          pressed && styles.pressed,
        ]}>
        <Text
          style={selected ? styles.valueText : styles.placeholder}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon
          name="chevronDown"
          size={20}
          color={colors.textTertiary}
          strokeWidth={2}
        />
      </Pressable>

      {error ? (
        <View style={styles.messageRow}>
          <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

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
            <Text style={styles.sheetTitle}>{sheetTitle ?? label}</Text>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Icon name="close" size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* Scrolls rather than clips: a longer list than gender's four still
              reaches its last option on a short screen. */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}>
            {options.map((option, index) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={option.label}
                  accessibilityHint={option.hint}
                  style={({ pressed }) => [
                    styles.option,
                    index === options.length - 1 && styles.optionLast,
                    pressed && styles.optionPressed,
                  ]}>
                  <View style={styles.optionText}>
                    <Text
                      style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {option.label}
                    </Text>
                    {option.hint ? (
                      <Text style={styles.optionHint}>{option.hint}</Text>
                    ) : null}
                  </View>
                  {active ? (
                    <Icon name="check" size={20} color={colors.primary} strokeWidth={2.6} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
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
      // Never taller than most of the screen, however many options there are.
      maxHeight: '70%',
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
    close: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
    },

    list: { flexGrow: 0 },
    listContent: { paddingHorizontal: spacing.xl },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.md + 2,
      minHeight: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    optionLast: { borderBottomWidth: 0 },
    optionPressed: { opacity: 0.6 },
    optionText: { flex: 1, gap: 2 },
    optionLabel: {
      ...typography.body,
      color: c.textPrimary,
      textAlign: I18nManager.isRTL ? 'right' : 'left',
    },
    optionLabelActive: { color: c.primary, fontWeight: '700' },
    optionHint: { ...typography.caption, color: c.textSecondary },
  });
