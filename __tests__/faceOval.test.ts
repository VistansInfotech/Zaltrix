/**
 * The face guide's geometry.
 *
 * The confirm screen masks the photo down to this exact shape, so if the guide
 * and the mask ever disagree the user confirms a crop they never framed
 * themselves in. Both read from `ovalRect`, and these tests pin what it returns.
 */
import {
  OVAL_ASPECT,
  OVAL_WIDTH_RATIO,
  ovalPerimeter,
  ovalRect,
} from '../src/screens/attendance/FaceOval';

describe('ovalRect', () => {
  it('centres the guide in the camera area', () => {
    const r = ovalRect(400, 800);

    expect(r.x + r.width / 2).toBeCloseTo(200);
    expect(r.y + r.height / 2).toBeCloseTo(400);
  });

  it('sizes the guide from the width, taller than it is wide', () => {
    const r = ovalRect(400, 800);

    expect(r.width).toBeCloseTo(400 * OVAL_WIDTH_RATIO);
    expect(r.width / r.height).toBeCloseTo(OVAL_ASPECT);
    // Head-shaped: a guide wider than it is tall would frame the wrong crop.
    expect(r.height).toBeGreaterThan(r.width);
  });

  it('rounds the caps into semicircles rather than soft corners', () => {
    const r = ovalRect(400, 800);

    expect(r.radius).toBeCloseTo(r.width / 2);
  });

  it('keeps the guide inside the camera area on a short, wide screen', () => {
    // Landscape-ish: the guide is driven by width, so this is where it would
    // overflow if the aspect ratio were ever applied the other way round.
    const r = ovalRect(800, 400);

    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(800);
  });

  it('is deterministic, so the mask and the guide cannot drift apart', () => {
    expect(ovalRect(390, 700)).toEqual(ovalRect(390, 700));
  });
});

describe('ovalPerimeter', () => {
  it('measures a capsule as a circle plus its straight sides', () => {
    const rect = { x: 0, y: 0, width: 100, height: 300, radius: 50 };

    // Two semicircular caps (one full circle) + two straight sides of 200.
    expect(ovalPerimeter(rect)).toBeCloseTo(Math.PI * 100 + 400);
  });

  it('degenerates to a circle when the shape is not taller than it is wide', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100, radius: 50 };

    // No straight sides left — and never a negative contribution, which would
    // make the travelling arc's dash pattern nonsense.
    expect(ovalPerimeter(rect)).toBeCloseTo(Math.PI * 100);
  });

  it('stays positive for the real guide at phone size', () => {
    expect(ovalPerimeter(ovalRect(390, 700))).toBeGreaterThan(0);
  });
});
