import { I18n } from 'i18n-js';
import { I18nManager } from 'react-native';
import * as RNLocalize from 'react-native-localize';

import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';

export const translations = { en, hi, es, ar };

export type LanguageCode = keyof typeof translations;
/** `system` means "follow the device language" rather than a pinned choice. */
export type LanguagePreference = LanguageCode | 'system';

export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

export const SUPPORTED_LANGUAGES: Array<{
  code: LanguageCode;
  /** Name in the language itself — never translated. */
  nativeName: string;
  englishName: string;
  isRTL: boolean;
}> = [
  { code: 'en', nativeName: 'English', englishName: 'English', isRTL: false },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', isRTL: false },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', isRTL: false },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', isRTL: true },
];

export const i18n = new I18n(translations);

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
// Show the English string rather than a "[missing …]" marker if a key is absent.
i18n.missingBehavior = 'guess';

/** Best supported language for the device, falling back to English. */
export function detectDeviceLanguage(): LanguageCode {
  const best = RNLocalize.findBestLanguageTag(
    SUPPORTED_LANGUAGES.map(l => l.code),
  );
  return (best?.languageTag?.split('-')[0] as LanguageCode) ?? 'en';
}

/** Resolve a stored preference ('system' or a code) to a concrete language. */
export function resolveLanguage(pref: LanguagePreference): LanguageCode {
  return pref === 'system' ? detectDeviceLanguage() : pref;
}

export function isRTL(code: LanguageCode): boolean {
  return RTL_LANGUAGES.includes(code);
}

/**
 * Point i18n at a language and align native layout direction.
 * Returns true when the RTL direction flipped — the caller must restart the app
 * for React Native to re-lay-out natively.
 */
export function applyLanguage(code: LanguageCode): boolean {
  i18n.locale = code;

  const shouldBeRTL = isRTL(code);
  const directionChanged = I18nManager.isRTL !== shouldBeRTL;

  if (directionChanged) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }

  return directionChanged;
}

// Sensible starting point before the stored preference loads.
i18n.locale = detectDeviceLanguage();

export default i18n;
