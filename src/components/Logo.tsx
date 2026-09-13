import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const sources = {
  stacked: require('../assets/logo_stacked.png'),
  horizontalLight: require('../assets/logo_light.png'),
  horizontalDark: require('../assets/logo_dark.png'),
  mark: require('../assets/mark.png'),
};

// Intrinsic aspect ratios of the exported artwork (width / height).
const ratios: Record<keyof typeof sources, number> = {
  stacked: 880 / 676,
  horizontalLight: 1232 / 320,
  horizontalDark: 1232 / 320,
  mark: 1,
};

type Props = {
  variant?: keyof typeof sources;
  /** Rendered width; height is derived from the artwork's aspect ratio. */
  width?: number;
  style?: StyleProp<ImageStyle>;
};

export default function Logo({ variant = 'stacked', width = 180, style }: Props) {
  return (
    <Image
      source={sources[variant]}
      style={[{ width, height: width / ratios[variant] }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Zaltrix"
    />
  );
}
