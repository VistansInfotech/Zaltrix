import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { isRenderableAvatar } from '../services/profileImage';
import { AppColors, typography, useThemedStyles } from '../theme';

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
  uri,
}: {
  name: string;
  size?: number;
  label?: string;
  /** Profile picture as a data URI; falls back to initials when absent. */
  uri?: string | null;
}) {
  const styles = useThemedStyles(makeStyles);
  // A stored image can fail to decode (truncated write, format the platform
  // won't read). Falling back to initials beats rendering an empty circle.
  const [broken, setBroken] = useState(false);

  const showImage = isRenderableAvatar(uri) && !broken;
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (showImage) {
    return (
      <Image
        source={{ uri: uri as string }}
        style={[styles.image, dimensions]}
        resizeMode="cover"
        onError={() => setBroken(true)}
        accessibilityRole="image"
        accessibilityLabel={label ?? name}
      />
    );
  }

  return (
    <View
      style={[styles.circle, dimensions]}
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

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    circle: {
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { color: c.textOnPrimary, fontWeight: '700' },
    image: { backgroundColor: c.surfaceAlt },
  });
