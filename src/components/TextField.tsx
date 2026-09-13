import React, { forwardRef, useState } from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import Icon from './Icon';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  /** Renders a show/hide toggle and starts masked. */
  secure?: boolean;
  showLabel?: string;
  hideLabel?: string;
  hint?: string;
};

/** RN 0.87 exposes a distinct TextInput instance type from the component type. */
export type TextFieldHandle = React.ComponentRef<typeof TextInput>;

function TextFieldBase(
  { label, error, secure = false, showLabel, hideLabel, hint, style, ...rest }: Props,
  ref: React.ForwardedRef<TextFieldHandle>,
) {
  const [focused, setFocused] = useState(false);
  const [masked, setMasked] = useState(secure);

  const borderColor = error
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  // Hoisted because both values are dynamic; an inline literal here would be
  // rebuilt on every keystroke.
  const fieldStyle = { borderColor, borderWidth: focused || error ? 1.5 : 1 };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.field, fieldStyle]}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={masked}
          onFocus={e => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...rest}
        />

        {secure ? (
          <Pressable
            onPress={() => setMasked(m => !m)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={masked ? showLabel : hideLabel}
            style={styles.toggle}>
            <Icon
              name={masked ? 'eye' : 'eyeOff'}
              size={20}
              color={colors.textTertiary}
              strokeWidth={1.8}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.messageRow}>
          <Icon name="alert" size={14} color={colors.danger} strokeWidth={2} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const TextField = forwardRef<TextFieldHandle, Props>(TextFieldBase);
TextField.displayName = 'TextField';

export default TextField;

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs + 2,
    fontWeight: '600',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    // Keep the caret and text on the correct side in RTL locales.
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  toggle: { paddingStart: spacing.sm },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs + 2,
  },
  error: { ...typography.caption, color: colors.danger, flex: 1 },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs + 2,
  },
});
