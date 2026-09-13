import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
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

export const PIN_LENGTH = 4;

/* ------------------------------- indicator ------------------------------ */

export function PinDots({
  filled,
  error = false,
  length = PIN_LENGTH,
}: {
  filled: number;
  error?: boolean;
  length?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) {
      return;
    }
    Vibration.vibrate(40);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });

  return (
    <Animated.View
      style={[styles.dots, { transform: [{ translateX }] }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: length, now: filled }}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < filled && styles.dotFilled,
            error && styles.dotError,
          ]}
        />
      ))}
    </Animated.View>
  );
}

/* --------------------------------- keypad -------------------------------- */

type Props = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** Optional action in the bottom-left slot, e.g. "use Face ID". */
  actionIcon?: IconName;
  onAction?: () => void;
  actionLabel?: string;
  deleteLabel: string;
  disabled?: boolean;
};

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export default function PinPad({
  onDigit,
  onDelete,
  actionIcon,
  onAction,
  actionLabel,
  deleteLabel,
  disabled = false,
}: Props) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.pad}>
      {ROWS.map(row => (
        <View key={row[0]} style={styles.row}>
          {row.map(d => (
            <Key key={d} label={d} onPress={() => onDigit(d)} disabled={disabled} />
          ))}
        </View>
      ))}

      <View style={styles.row}>
        {actionIcon && onAction ? (
          <Key
            icon={actionIcon}
            accessibilityLabel={actionLabel}
            onPress={onAction}
            disabled={disabled}
            subtle
          />
        ) : (
          <View style={styles.key} />
        )}

        <Key label="0" onPress={() => onDigit('0')} disabled={disabled} />

        <Key
          icon="backspace"
          accessibilityLabel={deleteLabel}
          onPress={onDelete}
          disabled={disabled}
          subtle
        />
      </View>
    </View>
  );
}

function Key({
  label,
  icon,
  onPress,
  disabled,
  subtle = false,
  accessibilityLabel,
}: {
  label?: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  subtle?: boolean;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.key,
        !subtle && styles.keySolid,
        pressed && !disabled && styles.keyPressed,
        disabled && styles.keyDisabled,
      ]}>
      {icon ? (
        <Icon name={icon} size={24} color={colors.primary} strokeWidth={1.9} />
      ) : (
        <Text style={styles.keyLabel}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    dots: {
      flexDirection: 'row',
      gap: spacing.lg,
      alignSelf: 'center',
    },
    dot: {
      width: 15,
      height: 15,
      borderRadius: 8,
      borderWidth: 1.6,
      borderColor: c.borderStrong,
      backgroundColor: 'transparent',
    },
    dotFilled: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    dotError: { borderColor: c.danger, backgroundColor: c.danger },

    pad: { gap: spacing.md, alignSelf: 'center' },
    row: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
    key: {
      width: 74,
      height: 62,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keySolid: {
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    keyPressed: { backgroundColor: c.primarySoft, transform: [{ scale: 0.97 }] },
    keyDisabled: { opacity: 0.4 },
    keyLabel: {
      ...typography.title,
      color: c.textPrimary,
      fontWeight: '600',
    },
  });
