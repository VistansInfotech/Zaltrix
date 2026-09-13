import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { AppColors, radius, spacing, typography, useColors } from '../theme';
import Icon, { IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  style,
}: Props) {
  const colors = useColors();
  const inactive = disabled || loading;
  const scheme = variantSchemes(colors)[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: scheme.background, borderColor: scheme.border },
        fullWidth && styles.fullWidth,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={scheme.text} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Icon name={icon} size={18} color={scheme.text} strokeWidth={2.2} />
          ) : null}
          <Text style={[typography.button, { color: scheme.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const variantSchemes = (
  c: AppColors,
): Record<Variant, { background: string; border: string; text: string }> => ({
  primary: {
    background: c.primary,
    border: c.primary,
    text: c.textOnPrimary,
  },
  secondary: {
    background: c.surface,
    border: c.borderStrong,
    text: c.primary,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: c.primary,
  },
  danger: {
    background: c.dangerSoft,
    border: c.dangerSoft,
    text: c.danger,
  },
});

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  fullWidth: { alignSelf: 'stretch' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
