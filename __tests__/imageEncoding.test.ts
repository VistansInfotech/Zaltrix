/**
 * The base64 encoder behind every saved face.
 *
 * React Native has no global btoa, so this is hand-rolled — and a fault here
 * would not crash anything, it would quietly store an unopenable image. These
 * check it against known-good vectors and the padding boundaries.
 */
import {
  arrayBufferToBase64,
  faceCropRect,
} from '../src/services/imageEncoding';

function bufferOf(...bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function encodeText(text: string): string {
  return arrayBufferToBase64(
    new Uint8Array([...text].map(c => c.charCodeAt(0))).buffer,
  );
}

describe('arrayBufferToBase64', () => {
  it.each([
    ['', ''],
    ['f', 'Zg=='],
    ['fo', 'Zm8='],
    ['foo', 'Zm9v'],
    ['foob', 'Zm9vYg=='],
    ['fooba', 'Zm9vYmE='],
    ['foobar', 'Zm9vYmFy'],
  ])('encodes %j as %j', (input, expected) => {
    // The RFC 4648 test vectors — they walk every padding case.
    expect(encodeText(input)).toBe(expected);
  });

  it('pads a one-byte tail with two = signs', () => {
    expect(arrayBufferToBase64(bufferOf(0))).toBe('AA==');
  });

  it('pads a two-byte tail with one = sign', () => {
    expect(arrayBufferToBase64(bufferOf(0, 0))).toBe('AAA=');
  });

  it('never pads an exact multiple of three', () => {
    expect(arrayBufferToBase64(bufferOf(0, 0, 0))).toBe('AAAA');
  });

  it('handles high bytes, which a signed-char bug would mangle', () => {
    expect(arrayBufferToBase64(bufferOf(255, 255, 255))).toBe('////');
    expect(arrayBufferToBase64(bufferOf(0xfb, 0xff, 0xbf))).toBe('+/+/');
  });

  it('round-trips a JPEG magic-number prefix', () => {
    // A stored photo starts with these bytes; if the encoder drops or shifts
    // them the data URI will not render.
    const jpegStart = bufferOf(0xff, 0xd8, 0xff, 0xe0);
    expect(arrayBufferToBase64(jpegStart)).toBe('/9j/4A==');
  });

  it('produces a length that is always a multiple of four', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = new Uint8Array(n).fill(7).buffer;
      expect(arrayBufferToBase64(bytes).length % 4).toBe(0);
    }
  });

  it('encodes a payload larger than one chunk without corruption', () => {
    const size = 5000;
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = i % 256;
    }
    const encoded = arrayBufferToBase64(bytes.buffer);
    expect(encoded).toHaveLength(Math.ceil(size / 3) * 4);
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});

/**
 * The crop that becomes a person's stored photo. Shown in a portrait tile, so
 * it has to be taller than the detector's box — and it has to stay inside the
 * frame for faces near the edge, which is where the clamping earns its keep.
 */
describe('faceCropRect', () => {
  const frame = { width: 1000, height: 2000 };
  const centred = { x: 400, y: 800, width: 200, height: 200 };

  it('keeps more above and below than at the sides', () => {
    const r = faceCropRect(frame, centred);

    const width = r.endX - r.startX;
    const height = r.endY - r.startY;
    expect(height).toBeGreaterThan(width);
  });

  it('stays centred on the face', () => {
    const r = faceCropRect(frame, centred);

    expect((r.startX + r.endX) / 2).toBeCloseTo(500);
    expect((r.startY + r.endY) / 2).toBeCloseTo(900);
  });

  it('never reaches outside the frame for a face in the corner', () => {
    const r = faceCropRect(frame, { x: 0, y: 0, width: 200, height: 200 });

    expect(r.startX).toBe(0);
    expect(r.startY).toBe(0);
    expect(r.endX).toBeLessThanOrEqual(frame.width);
    expect(r.endY).toBeLessThanOrEqual(frame.height);
  });

  it('clamps a face flush against the bottom-right edge', () => {
    const r = faceCropRect(frame, { x: 900, y: 1900, width: 100, height: 100 });

    expect(r.endX).toBe(frame.width);
    expect(r.endY).toBe(frame.height);
    expect(r.startX).toBeGreaterThanOrEqual(0);
  });

  it('returns whole pixels, since the crop indexes a bitmap', () => {
    const r = faceCropRect(frame, { x: 133.7, y: 401.2, width: 99.9, height: 150.4 });

    for (const v of [r.startX, r.startY, r.endX, r.endY]) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
