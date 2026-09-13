/**
 * The auto-capture gate. This decides when the camera fires unprompted during
 * enrolment, so it has to be strict: a near-miss should wait for a better
 * frame rather than burn a capture and show the user an error.
 */
import {
  AUTO_MAX_ANGLE,
  AUTO_MAX_OFFSET_X,
  AUTO_MAX_OFFSET_Y,
  AUTO_MAX_ROLL,
  AUTO_MAX_FACE_RATIO,
  AUTO_MIN_FACE_RATIO,
  judgeFraming,
  type FramingInput,
} from '../src/screens/attendance/useFaceCapture';

/** A well-framed, front-facing face in a 1000x1000 frame. */
function face(overrides: Partial<FramingInput> = {}): FramingInput {
  return {
    // Centred by default, so existing cases exercise size and pose only.
    bounds: { x: 300, y: 300, width: 400, height: 400 },
    frameWidth: 1000,
    frameHeight: 1000,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    ...overrides,
  };
}

describe('judgeFraming', () => {
  it('is ready for a single, large, front-facing face', () => {
    expect(judgeFraming([face()])).toBe('ready');
  });

  it('reports an empty frame', () => {
    expect(judgeFraming([])).toBe('none');
  });

  it('refuses more than one face', () => {
    // Enrolling the wrong person is unrecoverable, so never guess.
    expect(judgeFraming([face(), face()])).toBe('multiple');
  });

  it('asks the user closer when the face is small', () => {
    expect(judgeFraming([face({ bounds: { x: (1000 - 120) / 2, y: (1000 - 120) / 2, width: 120, height: 120 } })])).toBe('tooSmall');
  });

  it('measures fill against the shorter side of a non-square frame', () => {
    // 300/1000 = 0.30 of the short side — comfortably past the threshold.
    const portrait = face({
      bounds: { x: 350, y: 850, width: 300, height: 300 },
      frameWidth: 1000,
      frameHeight: 2000,
    });
    expect(judgeFraming([portrait])).toBe('ready');
  });

  it.each([
    ['yawAngle', 'turned left/right'],
    ['pitchAngle', 'tilted up/down'],
  ] as const)('refuses a face %s (%s)', (axis, _description) => {
    const tilted = face({ [axis]: AUTO_MAX_ANGLE + 5 } as Partial<FramingInput>);
    expect(judgeFraming([tilted])).toBe('notFrontal');
  });

  it('does not gate on roll at all', () => {
    // In-plane tilt still yields a full, forward-facing crop, and detectors
    // disagree about this axis most — gating on it blocked people who were
    // sitting square to the camera.
    expect(AUTO_MAX_ROLL).toBe(Number.POSITIVE_INFINITY);
    expect(judgeFraming([face({ rollAngle: 80 })])).toBe('ready');
    expect(judgeFraming([face({ rollAngle: -80 })])).toBe('ready');
  });

  it('still refuses a face turned well away from the camera', () => {
    expect(judgeFraming([face({ yawAngle: AUTO_MAX_ANGLE + 10 })])).toBe('notFrontal');
    expect(judgeFraming([face({ pitchAngle: AUTO_MAX_ANGLE + 10 })])).toBe('notFrontal');
  });

  it('accepts rotation in either direction up to the limit', () => {
    expect(judgeFraming([face({ yawAngle: AUTO_MAX_ANGLE })])).toBe('ready');
    expect(judgeFraming([face({ yawAngle: -AUTO_MAX_ANGLE })])).toBe('ready');
  });

  it('refuses a face that overflows the frame', () => {
    const tooClose = face({ bounds: { x: (1000 - 980) / 2, y: (1000 - 980) / 2, width: 980, height: 980 } });
    expect(judgeFraming([tooClose])).toBe('tooClose');
  });

  it('accepts a face that nearly fills the preview', () => {
    // The still has a wider field of view than the preview, so this is fine —
    // and rejecting it left no distance that satisfied both bounds.
    expect(judgeFraming([face({ bounds: { x: (1000 - 900) / 2, y: (1000 - 900) / 2, width: 900, height: 900 } })])).toBe('ready');
  });

  it('accepts a face right at the upper size bound', () => {
    const atLimit = AUTO_MAX_FACE_RATIO * 1000;
    expect(judgeFraming([face({ bounds: { x: (1000 - atLimit) / 2, y: (1000 - atLimit) / 2, width: atLimit, height: atLimit } })])).toBe(
      'ready',
    );
  });

  it('leaves a usable working range between the two size bounds', () => {
    expect(AUTO_MIN_FACE_RATIO).toBeLessThan(AUTO_MAX_FACE_RATIO);
    expect(AUTO_MAX_FACE_RATIO - AUTO_MIN_FACE_RATIO).toBeGreaterThan(0.3);
  });

  it('checks size before pose, so the closer hint wins', () => {
    const smallAndTurned = face({
      bounds: { x: (1000 - 50) / 2, y: (1000 - 50) / 2, width: 50, height: 50 },
      yawAngle: 45,
    });
    expect(judgeFraming([smallAndTurned])).toBe('tooSmall');
  });

  it('treats a degenerate frame size as no face rather than dividing by zero', () => {
    expect(judgeFraming([face({ frameWidth: 0, frameHeight: 0 })])).toBe('none');
  });

  it('sits just either side of the size threshold predictably', () => {
    const justUnder = AUTO_MIN_FACE_RATIO * 1000 - 1;
    const justOver = AUTO_MIN_FACE_RATIO * 1000 + 1;
    expect(judgeFraming([face({ bounds: { x: (1000 - justUnder) / 2, y: (1000 - justUnder) / 2, width: justUnder, height: justUnder } })])).toBe('tooSmall');
    expect(judgeFraming([face({ bounds: { x: (1000 - justOver) / 2, y: (1000 - justOver) / 2, width: justOver, height: justOver } })])).toBe('ready');
  });
});

describe('judgeFraming — position', () => {
  const centred = (x: number, y: number) =>
    face({ bounds: { x, y, width: 300, height: 300 } });

  it('accepts a face centred in the frame', () => {
    expect(judgeFraming([centred(350, 350)])).toBe('ready');
  });

  it('rejects a face off to one side, even at the right size', () => {
    // Without this, the oval is decoration — a face beside it would capture.
    expect(judgeFraming([centred(20, 350)])).toBe('offCentre');
    expect(judgeFraming([centred(680, 350)])).toBe('offCentre');
  });

  it('rejects a face too high or too low', () => {
    expect(judgeFraming([centred(350, 10)])).toBe('offCentre');
    expect(judgeFraming([centred(350, 690)])).toBe('offCentre');
  });

  it('allows more vertical drift than horizontal', () => {
    // The preview is a centre-crop of a taller frame, so vertical placement is
    // inherently less precise than horizontal.
    expect(AUTO_MAX_OFFSET_Y).toBeGreaterThan(AUTO_MAX_OFFSET_X);
  });

  it('checks size before position, so the closer hint wins', () => {
    const smallAndOff = face({ bounds: { x: 10, y: 10, width: 60, height: 60 } });
    expect(judgeFraming([smallAndOff])).toBe('tooSmall');
  });
});
