import { Platform } from 'react-native';

import type { ColorScheme } from './colors';

/**
 * Elevation. A purple-tinted drop shadow reads as depth on a white ground but
 * is invisible on a near-black one, so the dark scheme leans on a deeper, wider
 * black shadow and lets the surface/border contrast carry the rest.
 */
const lightShadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#3A0E58',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#3A0E58',
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

const darkShadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.5,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 2 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.66,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

export const shadows: Record<ColorScheme, typeof lightShadow> = {
  light: lightShadow,
  dark: darkShadow,
};

/** Static light elevation, for module-scope code that cannot call a hook. */
export const shadow = lightShadow;
