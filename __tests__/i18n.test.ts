import ar from '../src/i18n/locales/ar.json';
import en from '../src/i18n/locales/en.json';
import es from '../src/i18n/locales/es.json';
import hi from '../src/i18n/locales/hi.json';

type Tree = { [key: string]: string | Tree };

function flatten(obj: Tree, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

function valuesOf(obj: Tree, prefix = ''): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      return { ...acc, ...valuesOf(value, `${prefix}${key}.`) };
    }
    acc[`${prefix}${key}`] = value as string;
    return acc;
  }, {});
}

const locales = { hi, es, ar } as unknown as Record<string, Tree>;
const baseKeys = flatten(en as unknown as Tree).sort();
const baseValues = valuesOf(en as unknown as Tree);

describe('translation completeness', () => {
  it('English defines a non-trivial set of keys', () => {
    expect(baseKeys.length).toBeGreaterThan(150);
  });

  it.each(Object.keys(locales))('%s has exactly the same keys as English', code => {
    expect(flatten(locales[code]).sort()).toEqual(baseKeys);
  });

  it.each(Object.keys(locales))('%s has no empty strings', code => {
    const empties = Object.entries(valuesOf(locales[code]))
      .filter(([, v]) => !v || !v.trim())
      .map(([k]) => k);
    expect(empties).toEqual([]);
  });

  it.each(Object.keys(locales))(
    '%s preserves every {{interpolation}} placeholder',
    code => {
      const translated = valuesOf(locales[code]);
      const mismatches: string[] = [];

      for (const key of baseKeys) {
        const expected = (baseValues[key].match(/{{\s*\w+\s*}}/g) ?? [])
          .map(s => s.replace(/\s/g, ''))
          .sort();
        const actual = (translated[key].match(/{{\s*\w+\s*}}/g) ?? [])
          .map(s => s.replace(/\s/g, ''))
          .sort();

        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          mismatches.push(`${key}: expected ${expected} got ${actual}`);
        }
      }

      expect(mismatches).toEqual([]);
    },
  );
});
