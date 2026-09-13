import React from 'react';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';

import Icon from '../../components/Icon';
import { colors, radius, spacing } from '../../theme';

/** Back affordance for the auth stack, mirrored automatically in RTL. */
export default function AuthHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Icon
          name={I18nManager.isRTL ? 'chevronRight' : 'chevronLeft'}
          size={22}
          color={colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: -spacing.sm,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
});
