/**
 * Guards the two-scheme contract: the schemes must stay structurally identical,
 * and the pairings we actually render must stay legible in both.
 */
import { darkColors, lightColors, schemes } from '../src/theme/colors';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('colour schemes', () => {
  it('expose the same tokens', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('are registered under both scheme names', () => {
    expect(schemes.light).toBe(lightColors);
    expect(schemes.dark).toBe(darkColors);
  });

  it('actually differ — a dark scheme that mirrors light is a bug', () => {
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.textPrimary).not.toBe(lightColors.textPrimary);
    expect(luminance(darkColors.background)).toBeLessThan(
      luminance(lightColors.background),
    );
  });

  it('use hex values throughout, except the deliberate overlay alpha', () => {
    for (const [scheme, colors] of Object.entries(schemes)) {
      for (const [token, value] of Object.entries(colors)) {
        if (token === 'overlay') {
          expect(value).toMatch(/^rgba\(/);
        } else {
          expect(`${scheme}.${token}=${value}`).toMatch(/=#[0-9A-Fa-f]{6}$/);
        }
      }
    }
  });
});

describe('contrast (WCAG AA, 4.5:1 for body text)', () => {
  // Pairings that appear in the UI. `accent` on a surface is excluded — raw
  // brand gold is used for fills and strokes, never for text; text uses
  // `accentStrong`, which is checked below.
  const pairs: [keyof typeof lightColors, keyof typeof lightColors][] = [
    ['textPrimary', 'background'],
    ['textPrimary', 'surface'],
    ['textSecondary', 'background'],
    ['textSecondary', 'surface'],
    ['textOnPrimary', 'primary'],
    ['accentStrong', 'background'],
    ['danger', 'surface'],
    ['success', 'surface'],
  ];

  for (const [scheme, colors] of Object.entries(schemes)) {
    it.each(pairs)(`${scheme}: %s on %s clears 4.5:1`, (fg, bg) => {
      expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('keeps the tagline readable in both schemes', () => {
    expect(contrast(lightColors.accentStrong, lightColors.background)).toBeGreaterThan(4.5);
    expect(contrast(darkColors.accentStrong, darkColors.background)).toBeGreaterThan(4.5);
  });
});
