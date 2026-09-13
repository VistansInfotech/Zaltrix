/**
 * Matching is the part of attendance that can fail silently and still look
 * fine — a loose threshold marks the wrong person present. These tests pin the
 * arithmetic and the decision boundary.
 */
import {
  findBestMatch,
  MATCH_THRESHOLD,
  similarity,
} from '../src/services/faceRecognition';

/** Unit-length vector pointing mostly along `axis`, with `noise` spread elsewhere. */
function vector(length: number, axis: number, noise = 0): number[] {
  const v = new Array<number>(length).fill(0);
  v[axis] = 1;
  for (let i = 0; i < length; i++) {
    if (i !== axis) {
      v[i] = noise;
    }
  }
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map(x => x / mag);
}

describe('similarity', () => {
  it('is 1 for identical embeddings', () => {
    const a = vector(192, 3, 0.01);
    expect(similarity(a, a)).toBeCloseTo(1, 6);
  });

  it('is 0 for orthogonal embeddings', () => {
    expect(similarity(vector(8, 0), vector(8, 1))).toBeCloseTo(0, 6);
  });

  it('falls as two faces diverge', () => {
    const probe = vector(64, 0, 0.02);
    const near = vector(64, 0, 0.05);
    const far = vector(64, 7, 0.05);
    expect(similarity(probe, near)).toBeGreaterThan(similarity(probe, far));
  });

  it('refuses to compare embeddings of different widths', () => {
    // Happens when the model is swapped after faces were enrolled. Returning 0
    // rather than throwing keeps a stale enrolment from matching anyone.
    expect(similarity(vector(192, 0), vector(128, 0))).toBe(0);
  });

  it('returns 0 for empty input rather than NaN', () => {
    expect(similarity([], [])).toBe(0);
  });
});

describe('findBestMatch', () => {
  const alice = { id: 'A1', name: 'Alice' };
  const bob = { id: 'B2', name: 'Bob' };

  it('returns null when nobody is enrolled', () => {
    expect(findBestMatch(vector(32, 0), [])).toBeNull();
  });

  it('returns null when no one clears the threshold', () => {
    const result = findBestMatch(vector(32, 0), [
      { item: alice, embedding: vector(32, 5) },
      { item: bob, embedding: vector(32, 9) },
    ]);
    expect(result).toBeNull();
  });

  it('picks the closest candidate, not merely the first over the line', () => {
    const probe = vector(32, 0, 0.01);
    const result = findBestMatch(probe, [
      { item: alice, embedding: vector(32, 0, 0.18) }, // clears, but further
      { item: bob, embedding: vector(32, 0, 0.012) }, // closest
    ]);
    expect(result?.item).toBe(bob);
  });

  it('reports the score it matched on', () => {
    const probe = vector(32, 0, 0.01);
    const result = findBestMatch(probe, [{ item: alice, embedding: probe }]);
    expect(result?.score).toBeCloseTo(1, 6);
  });

  it('honours a custom threshold in both directions', () => {
    const probe = vector(16, 0);
    const other = vector(16, 1);
    const candidates = [{ item: alice, embedding: other }];
    // Orthogonal vectors score 0 — only a threshold at or below 0 accepts them.
    expect(findBestMatch(probe, candidates, 0.5)).toBeNull();
    expect(findBestMatch(probe, candidates, 0)?.item).toBe(alice);
  });

  it('keeps the default threshold strict enough to reject a stranger', () => {
    // ~45 degrees apart scores about 0.707 — but a real stranger sits far lower.
    const stranger = { item: bob, embedding: vector(64, 20) };
    expect(findBestMatch(vector(64, 0), [stranger])).toBeNull();
    expect(MATCH_THRESHOLD).toBeGreaterThan(0.5);
    expect(MATCH_THRESHOLD).toBeLessThan(1);
  });
});
