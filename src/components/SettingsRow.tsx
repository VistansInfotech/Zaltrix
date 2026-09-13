import React from 'react';
import {
  I18nManager,
  Pressable,
  StyleSheet,
  Switch,
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
import Icon, { IconName } from './Icon';

type BaseProps = {
  icon?: IconName;
  label: string;
  subtitle?: string;
  /**
   * Colour of the leading icon; defaults to brand purple. Pass `tintSoft`
   * alongside it — a tinted glyph on the default purple chip reads as a
   * mistake rather than a choice.
   */
  tint?: string;
  /** Fill behind the leading icon; defaults to soft brand purple. */
  tintSoft?: string;
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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const {
    icon,
    label,
    subtitle,
    tint = colors.primary,
    tintSoft = colors.primarySoft,
    destructive = false,
    last = false,
    disabled = false,
  } = props;

  const labelColor = destructive ? colors.danger : colors.textPrimary;
  const iconTint = destructive ? colors.danger : tint;
  const iconBg = destructive ? colors.dangerSoft : tintSoft;

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

      {renderTrailing(props, colors, styles)}
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

function renderTrailing(
  props: Props,
  colors: AppColors,
  styles: ReturnType<typeof makeStyles>,
): React.ReactNode {
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: 60,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: { borderBottomWidth: 0 },
    disabled: { opacity: 0.45 },
    pressed: { backgroundColor: c.surfaceAlt },
    iconChip: {
      width: 34,
      height: 34,
      borderRadius: radius.sm + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: { flex: 1, gap: 2 },
    subtitle: { ...typography.caption, color: c.textSecondary },
    trailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      maxWidth: '45%',
    },
    value: { ...typography.caption, color: c.textTertiary, flexShrink: 1 },
  });
