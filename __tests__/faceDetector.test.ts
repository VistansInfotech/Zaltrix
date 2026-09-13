/**
 * The detector abstraction. Apple's Vision reports normalised, bottom-left
 * origin boxes in radians; the native module converts to top-left pixels and
 * degrees, and this layer maps that onto the shape the app uses.
 */
import { NativeModules } from 'react-native';

import { detectFacesInImage, hasNativeDetector } from '../src/services/faceDetector';

const detectFaces = jest.fn();
(NativeModules as Record<string, unknown>).ZXFaceDetector = { detectFaces };

beforeEach(() => detectFaces.mockReset());

const nativeFace = (over: Record<string, number> = {}) => ({
  x: 120,
  y: 200,
  width: 400,
  height: 400,
  frameWidth: 3088,
  frameHeight: 2320,
  yawAngle: -3.2,
  pitchAngle: 1.8,
  rollAngle: 0.4,
  ...over,
});

describe('hasNativeDetector', () => {
  it('is true on iOS when the module is linked', () => {
    // jest-preset reports ios as the platform.
    expect(hasNativeDetector()).toBe(true);
  });
});

describe('detectFacesInImage', () => {
  it('maps flat native fields into the bounds shape callers expect', async () => {
    detectFaces.mockResolvedValue([nativeFace()]);
    const [face] = await detectFacesInImage('file:///tmp/a.jpg');

    expect(face.bounds).toEqual({ x: 120, y: 200, width: 400, height: 400 });
    expect(face.frameWidth).toBe(3088);
    expect(face.frameHeight).toBe(2320);
  });

  it('carries the head angles through unchanged', async () => {
    detectFaces.mockResolvedValue([nativeFace()]);
    const [face] = await detectFacesInImage('file:///tmp/a.jpg');
    expect(face.yawAngle).toBeCloseTo(-3.2);
    expect(face.pitchAngle).toBeCloseTo(1.8);
    expect(face.rollAngle).toBeCloseTo(0.4);
  });

  it('leaves eye openness undefined when the detector has no opinion', async () => {
    detectFaces.mockResolvedValue([nativeFace()]);
    const [face] = await detectFacesInImage('file:///tmp/a.jpg');
    // Undefined must stay undefined: the capture checks treat it as "unknown"
    // rather than "closed", so coercing to 0 would reject every enrolment.
    expect(face.leftEyeOpenProbability).toBeUndefined();
    expect(face.rightEyeOpenProbability).toBeUndefined();
  });

  it('passes eye openness through when present', async () => {
    detectFaces.mockResolvedValue([
      { ...nativeFace(), leftEyeOpenProbability: 0.93, rightEyeOpenProbability: 0.88 },
    ]);
    const [face] = await detectFacesInImage('file:///tmp/a.jpg');
    expect(face.leftEyeOpenProbability).toBeCloseTo(0.93);
    expect(face.rightEyeOpenProbability).toBeCloseTo(0.88);
  });

  it('handles an empty result', async () => {
    detectFaces.mockResolvedValue([]);
    await expect(detectFacesInImage('file:///tmp/a.jpg')).resolves.toEqual([]);
  });

  it('maps every face when several are present', async () => {
    detectFaces.mockResolvedValue([nativeFace(), nativeFace({ x: 900 })]);
    const faces = await detectFacesInImage('file:///tmp/a.jpg');
    expect(faces).toHaveLength(2);
    expect(faces[1].bounds.x).toBe(900);
  });

  it('forwards the uri it was given', async () => {
    detectFaces.mockResolvedValue([]);
    await detectFacesInImage('file:///tmp/specific.jpg');
    expect(detectFaces).toHaveBeenCalledWith('file:///tmp/specific.jpg');
  });
});
