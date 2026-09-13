/**
 * Zaltrix brand palette — sourced from the official logo artwork.
 * Purple is the primary identity; gold is reserved for accents and highlights.
 */
export const palette = {
  purple900: '#3A0E58',
  purple800: '#4A1270',
  purple700: '#5A1685',
  purple600: '#6A1B9A', // primary brand
  purple500: '#8E2FC4',
  purple300: '#B98AD6',
  purple100: '#EDE0F5',
  purple50: '#F4EFF8',

  gold700: '#9E7D1E',
  gold600: '#C9A227', // accent brand
  gold400: '#E0C55F',
  gold100: '#FAF2D9',

  white: '#FFFFFF',
  black: '#000000',

  grey900: '#16121A',
  grey800: '#2A2430',
  grey700: '#453D4E',
  grey600: '#6B6275',
  grey500: '#918A99',
  grey400: '#B9B3BF',
  grey300: '#DAD6DE',
  grey200: '#EBE8EE',
  grey100: '#F5F3F7',

  red600: '#C62828',
  red100: '#FDECEC',
  green600: '#2E7D32',
  green100: '#E8F5E9',
  amber600: '#ED6C02',
} as const;

export const colors = {
  primary: palette.purple600,
  primaryDark: palette.purple800,
  primaryLight: palette.purple500,
  primarySoft: palette.purple50,
  accent: palette.gold600,
  accentSoft: palette.gold100,

  background: palette.white,
  surface: palette.white,
  surfaceAlt: palette.grey100,
  border: palette.grey200,
  borderStrong: palette.grey300,

  textPrimary: palette.grey900,
  textSecondary: palette.grey600,
  textTertiary: palette.grey500,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  danger: palette.red600,
  dangerSoft: palette.red100,
  success: palette.green600,
  successSoft: palette.green100,
  warning: palette.amber600,

  overlay: 'rgba(22, 18, 26, 0.55)',
} as const;

export type AppColors = typeof colors;
