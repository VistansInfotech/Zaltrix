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

/**
 * Money, in the currency the record carries.
 *
 * The currency comes from the data rather than a constant: a booking made
 * abroad is priced in what it was actually paid in, and rendering that with a
 * rupee sign would be a lie about the amount.
 */
export function formatMoney(
  amount: number,
  currency: string,
  locale: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unsupported locale or currency code still has to render something a
    // person can read, so fall back to the code and a grouped number.
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

/** A `YYYY-MM` key as a month, e.g. `September 2026`. */
export function formatMonthKey(key: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) {
    return key;
  }
  return formatMonthYear(
    new Date(Number(match[1]), Number(match[2]) - 1, 1),
    locale,
  );
}

/** The `YYYY-MM` a date falls in, in local time. */
export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

export type MonthGroup<T> = {
  /** `YYYY-MM`, which sorts lexically and so needs no date parsing to order. */
  key: string;
  items: T[];
};

/**
 * Splits records into months, newest month first, each month keeping the order
 * it was given.
 *
 * A Map rather than an object: insertion order is guaranteed for both, but a
 * key like `2026-09` on a plain object invites the prototype questions that a
 * Map simply does not have.
 */
export function groupByMonth<T>(
  items: readonly T[],
  dateOf: (item: T) => Date,
): MonthGroup<T>[] {
  const months = new Map<string, T[]>();

  for (const item of items) {
    const key = monthKeyOf(dateOf(item));
    const bucket = months.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      months.set(key, [item]);
    }
  }

  return [...months.entries()]
    .map(([key, groupItems]) => ({ key, items: groupItems }))
    .sort((a, b) => b.key.localeCompare(a.key));
}
