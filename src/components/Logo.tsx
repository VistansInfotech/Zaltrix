import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { useTheme } from '../theme';

const sources = {
  stackedLight: require('../assets/logo_stacked.png'),
  stackedDark: require('../assets/logo_stacked_dark.png'),
  horizontalLight: require('../assets/logo_light.png'),
  horizontalDark: require('../assets/logo_dark.png'),
  mark: require('../assets/mark.png'),
};

// Intrinsic aspect ratios of the exported artwork (width / height).
const ratios: Record<keyof typeof sources, number> = {
  stackedLight: 640 / 462,
  stackedDark: 640 / 462,
  horizontalLight: 597 / 216,
  horizontalDark: 597 / 216,
  mark: 1,
};

/**
 * 'stacked' and 'horizontal' follow the active colour scheme. The explicit
 * *Light/*Dark names stay available for the rare case of placing the logo on a
 * surface that does not match the scheme.
 */
type Variant = 'stacked' | 'horizontal' | 'mark' | keyof typeof sources;

type Props = {
  variant?: Variant;
  /** Rendered width; height is derived from the artwork's aspect ratio. */
  width?: number;
  style?: StyleProp<ImageStyle>;
};

function resolve(variant: Variant, isDark: boolean): keyof typeof sources {
  if (variant === 'stacked') {
    return isDark ? 'stackedDark' : 'stackedLight';
  }
  if (variant === 'horizontal') {
    return isDark ? 'horizontalDark' : 'horizontalLight';
  }
  return variant;
}

export default function Logo({ variant = 'stacked', width = 180, style }: Props) {
  const { isDark } = useTheme();
  const key = resolve(variant, isDark);

  return (
    <Image
      source={sources[key]}
      style={[{ width, height: width / ratios[key] }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Zaltrix"
    />
  );
}
