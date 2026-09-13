import React from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '../theme';
import Icon, { IconName } from './Icon';

type BaseProps = {
  icon?: IconName;
  label: string;
  subtitle?: string;
  /** Tint for the leading icon chip; defaults to brand purple. */
  tint?: string;
  destructive?: boolean;
  /** Hides the hairline under the last row of a group. */
  last?: boolean;
  disabled?: boolean;
};

type Props = BaseProps &
  (
    | { type?: 'navigate'; onPress: () => void; value?: string }
    | { type: 'switch'; value: boolean; onValueChange: (v: boolean) => void }
    | { type: 'static'; value?: string }
  );

export default function SettingsRow(props: Props) {
  const {
    icon,
    label,
    subtitle,
    tint = colors.primary,
    destructive = false,
    last = false,
    disabled = false,
  } = props;

  const labelColor = destructive ? colors.danger : colors.textPrimary;
  const iconTint = destructive ? colors.danger : tint;
  const iconBg = destructive ? colors.dangerSoft : colors.primarySoft;

  const body = (
    <View style={[styles.row, last && styles.rowLast, disabled && styles.disabled]}>
      {icon ? (
        <View style={[styles.iconChip, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={18} color={iconTint} strokeWidth={1.9} />
        </View>
      ) : null}

      <View style={styles.textBlock}>
        <Text style={[typography.bodyStrong, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {renderTrailing(props)}
    </View>
  );

  if (props.type === 'switch' || props.type === 'static') {
    return body;
  }

  return (
    <Pressable
      onPress={props.onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

function renderTrailing(props: Props): React.ReactNode {
  if (props.type === 'switch') {
    return (
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        disabled={props.disabled}
        trackColor={{ false: colors.borderStrong, true: colors.primaryLight }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel={props.label}
      />
    );
  }

  const value = 'value' in props ? props.value : undefined;

  return (
    <View style={styles.trailing}>
      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {props.type !== 'static' ? (
        <Icon
          name={I18nManager.isRTL ? 'chevronLeft' : 'chevronRight'}
          size={18}
          color={colors.textTertiary}
          strokeWidth={2}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  disabled: { opacity: 0.45 },
  pressed: { backgroundColor: colors.surfaceAlt },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1, gap: 2 },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '45%',
  },
  value: { ...typography.caption, color: colors.textTertiary, flexShrink: 1 },
});
