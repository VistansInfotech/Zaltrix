import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../theme';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  size = 56,
  label,
}: {
  name: string;
  size?: number;
  label?: string;
}) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityRole="image"
      accessibilityLabel={label ?? name}>
      <Text
        style={[
          typography.subtitle,
          styles.text,
          { fontSize: size * 0.36, lineHeight: size * 0.44 },
        ]}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.textOnPrimary, fontWeight: '700' },
});
