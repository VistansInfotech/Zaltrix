/**
 * Intl is available in Hermes on both platforms, but the set of locales a
 * given build ships with varies. These helpers fall back to a plain ISO-ish
 * rendering rather than throwing if a locale is unsupported.
 */

export function formatMonthYear(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

export function formatLongDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
