/**
 * Guards the logo artwork itself.
 *
 * `alignItems: 'center'` centres the image *file*, not the ink inside it. The
 * horizontal logos once shipped with 17px of transparent canvas on the left and
 * 320px on the right, so the mark sat visibly left of centre and no layout
 * change could have fixed it. These tests fail if padded artwork is ever
 * dropped back in.
 */
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const ASSETS = path.join(__dirname, '..', 'src', 'assets');

/** Reads a PNG's size and the bounding box of its non-transparent pixels. */
function inspect(file: string) {
  const script = `
from PIL import Image
im = Image.open(${JSON.stringify(path.join(ASSETS, file))}).convert("RGBA")
w, h = im.size
bb = im.getbbox()
print(w, h, bb[0], bb[1], w - bb[2], h - bb[3])
`;
  const out = execFileSync('python3', ['-c', script], { encoding: 'utf8' }).trim();
  const [width, height, left, top, right, bottom] = out.split(/\s+/).map(Number);
  return { width, height, left, top, right, bottom };
}

const hasPython = (() => {
  try {
    execFileSync('python3', ['-c', 'import PIL'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const describeIf = hasPython ? describe : describe.skip;

const HORIZONTAL = ['logo_light', 'logo_dark'];
const STACKED = ['logo_stacked', 'logo_stacked_dark'];
const SCALES = ['', '@2x', '@3x'];

describeIf('logo artwork', () => {
  const files = [...HORIZONTAL, ...STACKED].flatMap(base =>
    SCALES.map(scale => `${base}${scale}.png`),
  );

  it.each(files)('%s exists', file => {
    expect(existsSync(path.join(ASSETS, file))).toBe(true);
  });

  it.each(files)('%s is horizontally symmetric, so centring works', file => {
    const { width, left, right } = inspect(file);
    // Allow a pixel of rounding; anything more is visible drift.
    const drift = Math.abs(left - right);
    expect({ file, left, right, drift }).toMatchObject({ file });
    expect(drift).toBeLessThanOrEqual(Math.max(2, width * 0.005));
  });

  it.each(HORIZONTAL.flatMap(b => SCALES.map(s => `${b}${s}.png`)))(
    '%s has no runaway padding',
    file => {
      const { width, left, right } = inspect(file);
      // The horizontal lockup is placed inline next to text, so its padding
      // must stay tight or the mark renders far smaller than the requested
      // width. (The stacked artwork deliberately carries ~16% a side.)
      expect(left / width).toBeLessThan(0.06);
      expect(right / width).toBeLessThan(0.06);
    },
  );

  it.each(HORIZONTAL.flatMap(b => SCALES.map(s => `${b}${s}.png`)))(
    '%s keeps the wide lockup aspect the Logo component assumes',
    file => {
      const { width, height } = inspect(file);
      // Logo.tsx derives height from 597/216 ≈ 2.76.
      expect(width / height).toBeGreaterThan(2.4);
      expect(width / height).toBeLessThan(3.1);
    },
  );
});
