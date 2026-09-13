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
  amber100: '#FFF3E0',
  blue600: '#1565C0',
  blue100: '#E3F2FD',

  /* ----------------------------- dark scheme ----------------------------- */
  // Near-black surfaces carry a slight purple cast so the brand hue still reads
  // on an unlit screen. Each step is a distinct elevation, lightest last.
  ink900: '#0F0B13', // app background
  ink800: '#17131C', // raised surface (cards, inputs)
  ink700: '#211B28', // alternate surface (pressed, grouped rows)
  ink600: '#2E2637', // hairline borders
  ink500: '#3D3447', // emphasised borders

  inkText100: '#F4F1F7', // primary text on dark
  inkText300: '#BDB6C7', // secondary text on dark
  inkText500: '#8E8699', // tertiary text on dark

  purpleTint: '#2A1440', // "soft" purple fill on dark
  goldTint: '#332B12', // "soft" gold fill on dark

  redDark400: '#FF7A7A',
  redDarkSoft: '#3A1A1D',
  greenDark400: '#66D07A',
  greenDarkSoft: '#152B1A',
  amberDark400: '#FFA94D',
  amberDarkSoft: '#3A2A12',
  blueDark400: '#6FB4FF',
  blueDarkSoft: '#12243A',
} as const;

export const lightColors = {
  primary: palette.purple600,
  primaryDark: palette.purple800,
  primaryLight: palette.purple500,
  primarySoft: palette.purple50,
  accent: palette.gold600,
  accentSoft: palette.gold100,
  /** Readable foreground for text sitting on `accentSoft`. */
  accentStrong: '#7A5E10',

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
  warningSoft: palette.amber100,
  info: palette.blue600,
  infoSoft: palette.blue100,

  overlay: 'rgba(22, 18, 26, 0.55)',
} as const;

/** Same keys as the light scheme, with values widened from literals to string. */
export type AppColors = { [K in keyof typeof lightColors]: string };

/**
 * Dark scheme. Brand purple is lightened (600 -> 500/300) because #6A1B9A
 * against a near-black background falls under the 4.5:1 contrast floor.
 */
export const darkColors: AppColors = {
  primary: palette.purple500,
  primaryDark: palette.purple700,
  primaryLight: palette.purple300,
  primarySoft: palette.purpleTint,
  accent: palette.gold400,
  accentSoft: palette.goldTint,
  accentStrong: palette.gold400,

  background: palette.ink900,
  surface: palette.ink800,
  surfaceAlt: palette.ink700,
  border: palette.ink600,
  borderStrong: palette.ink500,

  textPrimary: palette.inkText100,
  textSecondary: palette.inkText300,
  textTertiary: palette.inkText500,
  textInverse: palette.grey900,
  textOnPrimary: palette.white,

  danger: palette.redDark400,
  dangerSoft: palette.redDarkSoft,
  success: palette.greenDark400,
  successSoft: palette.greenDarkSoft,
  warning: palette.amberDark400,
  warningSoft: palette.amberDarkSoft,
  info: palette.blueDark400,
  infoSoft: palette.blueDarkSoft,

  overlay: 'rgba(0, 0, 0, 0.66)',
};

export type ColorScheme = 'light' | 'dark';

export const schemes: Record<ColorScheme, AppColors> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * Static light palette.
 *
 * Only for module-scope code that cannot call a hook. Anything rendered should
 * read `useTheme().colors` instead, or it will not follow the active scheme.
 */
export const colors = lightColors;
