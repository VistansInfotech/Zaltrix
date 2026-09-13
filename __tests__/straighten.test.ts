/**
 * Straightening a sideways still before it reaches the embedder.
 *
 * This is the quiet kind of bug: a rotated face still enrols, still shows a
 * photo, and still looks fine on screen — it just never matches again, because
 * MobileFaceNet was trained on upright faces. So the tests here care less about
 * "did it rotate" than about "did it only keep a rotation that actually helped".
 */
import type { Image } from 'react-native-nitro-image';

import { straighten } from '../src/screens/attendance/useFaceCapture';
import type { DetectedFace } from '../src/services/faceDetector';

/** The detector argument `straighten` takes, without restating its shape. */
type Detector = Parameters<typeof straighten>[2];

function detected(rollAngle: number): DetectedFace {
  return {
    bounds: { x: 100, y: 100, width: 300, height: 300 },
    frameWidth: 1000,
    frameHeight: 1000,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle,
  };
}

/**
 * A fake still plus detector, wired together the way the real pair are: what
 * the detector reports next depends on how the image was just rotated.
 *
 * `outcomes` maps a rotation in degrees to the faces a re-detect then finds,
 * so a case can say "turning it -90° yields an upright face, +90° does not".
 */
function makeWorld(outcomes: Record<number, DetectedFace[]>) {
  const rotations: number[] = [];
  const fastFlags: Array<boolean | undefined> = [];
  let nextFaces: DetectedFace[] = [];

  const rotateAsync = jest.fn(
    async (degrees: number, fast?: boolean): Promise<Image> => {
      rotations.push(degrees);
      fastFlags.push(fast);
      nextFaces = outcomes[degrees] ?? [];
      // Portrait turned landscape, so a caller that reads the dimensions back
      // gets the rotated ones rather than the original's.
      return {
        width: 2000,
        height: 1000,
        saveToTemporaryFileAsync: async () => `/tmp/rotated${degrees}.jpg`,
      } as unknown as Image;
    },
  );

  const image = {
    width: 1000,
    height: 2000,
    rotateAsync,
    saveToTemporaryFileAsync: async () => '/tmp/original.jpg',
  } as unknown as Image;

  const detectFaces = jest.fn(() => nextFaces);
  const detector = { detectFaces } as unknown as Detector;

  return { image, detector, detectFaces, rotations, fastFlags, rotateAsync };
}

describe('straighten', () => {
  it('leaves an already-upright still alone', async () => {
    const { image, detector, rotateAsync } = makeWorld({});

    expect(await straighten(image, 4, detector)).toBeNull();
    // Not merely "returned null" — it must not have spent a rotation and a
    // re-detect to find that out, because this is the common path.
    expect(rotateAsync).not.toHaveBeenCalled();
  });

  it('rotates a quarter-turn still upright and re-measures the bounds', async () => {
    const upright = detected(1);
    const { image, detector, detectFaces, rotations } = makeWorld({
      [-90]: [upright],
    });

    const result = await straighten(image, 90, detector);

    expect(rotations).toEqual([-90]);
    expect(result?.faces[0]).toBe(upright);
    // Bounds come from the re-detect, not from transforming the old box.
    expect(detectFaces).toHaveBeenCalledWith('file:///tmp/rotated-90.jpg');
    expect(result?.uri).toBe('file:///tmp/rotated-90.jpg');
    expect(result?.image.width).toBe(2000);
  });

  it('tries the other direction when the first guess made it worse', async () => {
    // The sign of rollAngle is not agreed between detectors, so the first
    // rotation attempted is a guess and is allowed to be wrong.
    const { image, detector, rotations } = makeWorld({
      [-90]: [detected(179)],
      [90]: [detected(-2)],
    });

    const result = await straighten(image, 90, detector);

    expect(rotations).toEqual([-90, 90]);
    expect(result?.uri).toBe('file:///tmp/rotated90.jpg');
  });

  it('keeps the original when no rotation improves the roll', async () => {
    const { image, detector, rotations } = makeWorld({
      [-90]: [detected(120)],
      [90]: [detected(95)],
    });

    expect(await straighten(image, 90, detector)).toBeNull();
    expect(rotations).toEqual([-90, 90]);
  });

  it('rotates the pixels rather than flipping an orientation flag', async () => {
    // A flag-only rotation leaves the buffer sideways, and the buffer is what
    // the embedder reads — the photo would look fixed and match nothing.
    const { image, detector, fastFlags } = makeWorld({ [-90]: [detected(0)] });

    await straighten(image, 90, detector);

    expect(fastFlags).toEqual([false]);
  });

  it('only tries one rotation for an upside-down still', async () => {
    // At half a turn both directions land in the same place.
    const { image, detector, rotations } = makeWorld({ [180]: [detected(3)] });

    const result = await straighten(image, 178, detector);

    expect(rotations).toEqual([180]);
    expect(result?.faces[0].rollAngle).toBe(3);
  });

  it('skips a rotation that loses the face', async () => {
    const { image, detector, rotations } = makeWorld({
      [-90]: [],
      [90]: [detected(0)],
    });

    const result = await straighten(image, 90, detector);

    expect(rotations).toEqual([-90, 90]);
    expect(result?.uri).toBe('file:///tmp/rotated90.jpg');
  });

  it('skips a rotation that turns up a second face', async () => {
    // Two boxes means we cannot tell which one we just measured, so the
    // rotation is unusable even if one of them looks straight.
    const { image, detector } = makeWorld({
      [-90]: [detected(0), detected(0)],
      [90]: [detected(1)],
    });

    expect((await straighten(image, 90, detector))?.uri).toBe(
      'file:///tmp/rotated90.jpg',
    );
  });

  it('falls back to the original still when rotation throws', async () => {
    const image = {
      width: 1000,
      height: 2000,
      rotateAsync: jest.fn(async () => {
        throw new Error('out of memory');
      }),
    } as unknown as Image;
    const detector = { detectFaces: jest.fn(() => []) } as unknown as Detector;

    // A slightly tilted enrolment beats refusing to enrol at all.
    expect(await straighten(image, 90, detector)).toBeNull();
  });
});
