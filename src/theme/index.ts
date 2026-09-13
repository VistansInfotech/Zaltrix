import { Platform, TextStyle } from 'react-native';

export { colors, darkColors, lightColors, palette, schemes } from './colors';
export type { AppColors, ColorScheme } from './colors';
export { shadow, shadows } from './elevation';
export {
  ThemeProvider,
  THEME_PREFERENCES,
  useColors,
  useTheme,
  useThemedStyles,
} from './ThemeContext';
export type { ThemePreference } from './ThemeContext';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontFamilyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: fontFamilyMedium,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fontFamilyMedium,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: fontFamilyMedium,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyStrong: {
    fontFamily: fontFamilyMedium,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  overline: {
    fontFamily: fontFamilyMedium,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamilyMedium,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
};
