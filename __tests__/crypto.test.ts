import { createHash } from 'crypto';

import { hashSecret, randomHex, safeEqual, sha256 } from '../src/services/crypto';

describe('sha256', () => {
  const vectors = [
    '',
    'abc',
    'The quick brown fox jumps over the lazy dog',
    'x'.repeat(55), // one byte under a block boundary
    'y'.repeat(56), // forces an extra padding block
    'z'.repeat(64), // exactly one block
    'पासवर्ड',       // multi-byte UTF-8
    'كلمة المرور',
    '🔐secret🔥',    // surrogate pairs
  ];

  it.each(vectors)('matches node crypto for %j', input => {
    expect(sha256(input)).toBe(
      createHash('sha256').update(input, 'utf8').digest('hex'),
    );
  });

  it('always returns 64 hex characters', () => {
    expect(sha256('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('hashSecret', () => {
  it('is deterministic for the same secret and salt', () => {
    expect(hashSecret('hunter2', 'salt', 10)).toBe(hashSecret('hunter2', 'salt', 10));
  });

  it('produces different digests for different salts', () => {
    expect(hashSecret('hunter2', 'a', 10)).not.toBe(hashSecret('hunter2', 'b', 10));
  });

  it('produces different digests for different secrets', () => {
    expect(hashSecret('hunter2', 'salt', 10)).not.toBe(
      hashSecret('hunter3', 'salt', 10),
    );
  });

  it('never returns the raw secret', () => {
    expect(hashSecret('hunter2', 'salt', 10)).not.toContain('hunter2');
  });
});

describe('randomHex', () => {
  it('returns the requested byte length as hex', () => {
    expect(randomHex(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('does not repeat across calls', () => {
    const seen = new Set(Array.from({ length: 50 }, () => randomHex(16)));
    expect(seen.size).toBe(50);
  });
});

describe('safeEqual', () => {
  it('is true for identical strings', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('is false for different strings of equal length', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false);
  });

  it('is false for different lengths', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
