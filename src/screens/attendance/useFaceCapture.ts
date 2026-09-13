import { useCallback, useRef } from 'react';
import {
  useFaceDetectorOutput,
  useImageFaceDetector,
} from 'react-native-vision-camera-face-detector';
import type { FaceDetectorOutputOptions } from 'react-native-vision-camera-face-detector';
import type { CameraOutput } from 'react-native-vision-camera';
import type { CameraPhotoOutput } from 'react-native-vision-camera';
import type { Image } from 'react-native-nitro-image';

import {
  detectFacesInImage,
  hasNativeDetector,
  type DetectedFace,
} from '../../services/faceDetector';
import { embedFace, FaceEmbedding } from '../../services/faceRecognition';
import { toFaceThumbnailDataUri } from '../../services/imageEncoding';

/** Why a capture could not produce a usable face — mapped to a message by callers. */
export type CaptureFailure =
  | 'noFace'
  | 'multipleFaces'
  | 'faceTooSmall'
  | 'notFrontal'
  | 'eyesClosed'
  | 'failed';

export class FaceCaptureError extends Error {
  constructor(
    public readonly reason: CaptureFailure,
    /**
     * The frame that was actually captured, when we got that far. Showing it
     * turns "no face detected" from a dead end into something the user can
     * see and act on — too dark, cut off, rotated.
     */
    public readonly previewUri?: string,
  ) {
    super(reason);
    this.name = 'FaceCaptureError';
  }
}

/**
 * Face must fill at least this fraction of the photo's shorter side.
 *
 * Lower than the live auto-capture threshold on purpose: the still is the whole
 * 4:3 sensor frame while the preview is a centre-crop of it, so the same face
 * occupies a smaller share here.
 */
const MIN_FACE_RATIO = 0.1;
/**
 * Head rotation tolerated before we ask the user to look straight ahead.
 *
 * Per-axis, because they do not matter equally and the detectors do not measure
 * them alike. Yaw (turning away) and pitch (looking up or down) genuinely
 * degrade a face embedding. Roll is in-plane tilt: the crop is still a full,
 * front-facing face, and it is the axis most sensitive to how a detector treats
 * image orientation — a tight bound there rejected people sitting square to the
 * camera.
 */
const MAX_YAW_DEGREES = 28;
const MAX_PITCH_DEGREES = 28;
const MAX_ROLL_DEGREES = 40;

/**
 * A face-detector camera output pinned to its first instance.
 *
 * `useFaceDetectorOutput` memoises on a rest object it allocates on every
 * render (`useMemo(..., [options])`), so the memo never hits and a brand new
 * native output is produced each time. Handing a new output to `<Camera>` makes
 * the CameraSession tear down and rebuild its connections continuously — which
 * shows up in the native log as "Removing output… Adding Output…" and breaks
 * both live detection and photo capture mid-flight.
 *
 * Holding the first instance is safe: the hook stores the callbacks in refs it
 * keeps up to date, and the pinned output closes over those same refs.
 */
export function useStableFaceDetectorOutput(
  options: FaceDetectorOutputOptions,
): CameraOutput {
  const output = useFaceDetectorOutput(options);
  const pinned = useRef(output);
  return pinned.current;
}

/** Why a live frame is not yet good enough to enrol from. */
export type Framing =
  | 'none'
  | 'multiple'
  | 'tooSmall'
  | 'tooClose'
  | 'offCentre'
  | 'notFrontal'
  | 'ready';

/** Face must fill this share of the frame's shorter side before we capture. */
export const AUTO_MIN_FACE_RATIO = 0.2;
/**
 * Upper bound on face size, measured in the live frame.
 *
 * Deliberately generous. The live frame and the captured still are not the same
 * field of view, so a face that nearly fills the preview still lands with room
 * to spare in the photo. A tight bound here rejected perfectly good poses and
 * left no distance that satisfied both this and the lower bound — it only needs
 * to catch a face genuinely overflowing the frame.
 */
export const AUTO_MAX_FACE_RATIO = 0.95;
/**
 * How far the face may sit from the centre of the frame, as a fraction of the
 * frame's width and height.
 *
 * The oval is drawn centred, so this is what makes "inside the oval" a real
 * requirement rather than decoration — without it a face off to one side
 * satisfies every other check and gets captured. Vertical tolerance is slightly
 * looser because the preview is a centre-crop of a taller frame.
 */
export const AUTO_MAX_OFFSET_X = 0.18;
export const AUTO_MAX_OFFSET_Y = 0.22;

/**
 * Head rotation tolerated by the live gate, in degrees.
 *
 * Kept below the capture check so auto-capture only fires on poses the capture
 * will accept — but roll is treated leniently for the same reason it is there.
 */
export const AUTO_MAX_ANGLE = 45;
/**
 * Roll is no longer gated at all: in-plane tilt still yields a full, forward
 * face, and it is the axis detectors disagree about most. Kept exported so the
 * intent is testable.
 */
export const AUTO_MAX_ROLL = Number.POSITIVE_INFINITY;

/** The subset of a detected Face that framing decisions actually depend on. */
export type FramingInput = {
  bounds: { x: number; y: number; width: number; height: number };
  frameWidth: number;
  frameHeight: number;
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
};

/**
 * Judges one live frame for auto-capture: exactly one face, filling enough of
 * the frame, looking at the camera. Deliberately stricter than the checks in
 * `capture` — this decides when to fire unprompted, so a near-miss should wait
 * rather than burn a capture and show an error.
 */
export function judgeFraming(faces: readonly FramingInput[]): Framing {
  if (faces.length === 0) {
    return 'none';
  }
  if (faces.length > 1) {
    return 'multiple';
  }
  const face = faces[0];
  const shorterSide = Math.min(face.frameWidth, face.frameHeight);
  if (shorterSide <= 0) {
    return 'none';
  }
  const fill = Math.min(face.bounds.width, face.bounds.height) / shorterSide;
  if (fill < AUTO_MIN_FACE_RATIO) {
    return 'tooSmall';
  }
  if (fill > AUTO_MAX_FACE_RATIO) {
    return 'tooClose';
  }

  // Is it actually in the oval? Measured from the face's centre, so a face
  // drifting off one edge is rejected even when it is the right size.
  const centreX = (face.bounds.x + face.bounds.width / 2) / face.frameWidth;
  const centreY = (face.bounds.y + face.bounds.height / 2) / face.frameHeight;
  if (
    Math.abs(centreX - 0.5) > AUTO_MAX_OFFSET_X ||
    Math.abs(centreY - 0.5) > AUTO_MAX_OFFSET_Y
  ) {
    return 'offCentre';
  }
  // Only a face turned far enough to genuinely break matching is held back.
  // Tight limits here left no pose that satisfied the gate on some devices,
  // because detectors measure these angles very differently.
  if (
    Math.abs(face.yawAngle) > AUTO_MAX_ANGLE ||
    Math.abs(face.pitchAngle) > AUTO_MAX_ANGLE
  ) {
    return 'notFrontal';
  }
  return 'ready';
}

export type CaptureOptions = {
  /** Enrolment is strict about pose and open eyes; marking attendance is not. */
  strict?: boolean;
  /** Produce thumbnails for the record. Skipped when only matching. */
  withPreview?: boolean;
};

export type CaptureResult = {
  embedding: FaceEmbedding;
  /** The whole captured frame, for confirmation. */
  previewUri?: string;
  /** Just the face, for storing against the person's record. */
  faceUri?: string;
  /**
   * Set when the pose was less than ideal. Advisory only — the user sees the
   * photo and decides, so a machine veto on top of that just blocks people.
   */
  warning?: 'notFrontal' | 'eyesClosed';
};

/**
 * Takes a still, finds the face in it and returns the embedding.
 *
 * Detection runs on the captured photo rather than on the live preview, so the
 * bounding box is already in the photo's own coordinate space — no mapping
 * between preview and capture resolutions, which is where this kind of code
 * usually goes subtly wrong.
 */
/**
 * Module-level on purpose.
 *
 * `useImageFaceDetector` memoises with `useMemo(..., [options])` on the object
 * it is handed, so an inline literal is a new dependency every render and a new
 * native detector is constructed each time. A constant reference makes the memo
 * actually hold, giving one detector for the life of the screen.
 */
const IMAGE_DETECTOR_OPTIONS = {
  performanceMode: 'accurate',
  runClassifications: true,
  // Low: the still is full-resolution, so a face that filled the preview can
  // occupy a much smaller fraction of it.
  minFaceSize: 0.1,
} as const;

type ImageDetector = ReturnType<typeof useImageFaceDetector>;

/**
 * Runs whichever detector this platform has: Apple's Vision framework where it
 * exists, ML Kit elsewhere. Both return the same shape, so callers stay
 * detector-agnostic.
 */
async function runDetector(
  uri: string,
  detector: ImageDetector,
): Promise<DetectedFace[]> {
  if (hasNativeDetector()) {
    try {
      return await detectFacesInImage(uri);
    } catch (e) {
      console.log('[face] native detector failed, falling back', e);
    }
  }
  return detector.detectFaces(uri) as unknown as DetectedFace[];
}

/** A still that has been rotated upright, with bounds re-measured to match. */
type Straightened = { image: Image; uri: string; faces: DetectedFace[] };

/**
 * How much straighter the face has to come out before we accept a rotation.
 * Generous, because the case this exists for swings roll by a full 90°;
 * anything smaller is noise between two runs of the same detector.
 */
const STRAIGHTEN_MIN_GAIN = 20;

async function rotateAndRedetect(
  image: Image,
  degrees: number,
  detector: ImageDetector,
): Promise<Straightened | null> {
  // allowFastFlagRotation stays off deliberately. With it on, the
  // implementation is free to flip an orientation flag and leave the pixel
  // buffer untouched — and that buffer is exactly what the embedder reads, so
  // the face would still reach MobileFaceNet sideways.
  const rotated = await image.rotateAsync(degrees, false);
  const path = await rotated.saveToTemporaryFileAsync('jpg', 92);
  const uri = path.startsWith('file://') ? path : `file://${path}`;
  // Re-detect rather than transforming the old box. Bounds have to describe
  // the pixels we are about to crop, and a rotated image is a new coordinate
  // space; deriving them by hand is how off-by-a-transpose bugs get in.
  const faces = await runDetector(uri, detector);
  return faces.length === 1 ? { image: rotated, uri, faces } : null;
}

/**
 * Brings a sideways still upright, returning `null` when it is already as
 * straight as we can get it.
 *
 * Some devices hand back a still a quarter turn out even though `toImage()` is
 * meant to bake orientation in. MobileFaceNet was trained on upright faces, so
 * a sideways crop embeds to something that matches nobody — including the same
 * person on their next scan — which makes this a silent accuracy bug rather
 * than a visible one.
 *
 * Detectors disagree on the sign of `rollAngle`, so rather than encode a guess
 * we rotate, re-detect, and keep the rotation only if the face genuinely came
 * out straighter. A wrong first guess costs one extra detection; a hard-coded
 * sign that is wrong on someone's device costs them every match they make.
 */
export async function straighten(
  image: Image,
  roll: number,
  detector: ImageDetector,
): Promise<Straightened | null> {
  const quarterTurns = Math.round(roll / 90);
  if (quarterTurns === 0) {
    return null;
  }

  const magnitude = Math.abs(quarterTurns) * 90;
  // At half a turn both directions land in the same place, so only try one.
  const candidates =
    magnitude === 180
      ? [180]
      : quarterTurns > 0
        ? [-magnitude, magnitude]
        : [magnitude, -magnitude];

  for (const degrees of candidates) {
    let result: Straightened | null;
    try {
      result = await rotateAndRedetect(image, degrees, detector);
    } catch (e) {
      // Keep the original still rather than failing the capture outright: a
      // slightly tilted enrolment beats no enrolment.
      console.log('[face] straighten failed, keeping original', e);
      return null;
    }
    if (!result) {
      continue;
    }
    const newRoll = result.faces[0].rollAngle;
    if (Math.abs(newRoll) < Math.abs(roll) - STRAIGHTEN_MIN_GAIN) {
      console.log(
        `[face] straightened by ${degrees}°: roll ${roll.toFixed(1)} -> ` +
          `${newRoll.toFixed(1)}, still now ${result.image.width}x${result.image.height}`,
      );
      return result;
    }
    console.log(
      `[face] rotating ${degrees}° did not help (roll ${newRoll.toFixed(1)})`,
    );
  }
  return null;
}

export function useFaceCapture() {
  const detector = useImageFaceDetector(IMAGE_DETECTOR_OPTIONS);

  const capture = useCallback(
    async (
      photoOutput: CameraPhotoOutput,
      { strict = false, withPreview = false }: CaptureOptions = {},
    ): Promise<CaptureResult> => {
      let image: Image;
      let path: string;
      try {
        const photo = await photoOutput.capturePhoto(
          { flashMode: 'off', enableShutterSound: false },
          {},
        );
        // toImage() does NOT bake orientation in, despite what you might
        // expect: it wraps the sensor's raw CGImage in a UIImage carrying an
        // orientation *flag*. Everything downstream then disagrees about which
        // way is up — <Image> honours the flag and looks correct, while Vision,
        // cropAsync and the embedder read raw pixels and see a sideways face.
        // That split is why an enrolment could preview upright and still store
        // a rotated thumbnail and a useless embedding.
        //
        // Rotating by zero with the fast path refused forces a real redraw,
        // which applies the flag and hands back genuinely upright pixels. It
        // costs one redraw per capture and makes every later step agree.
        image = await (await photo.toImageAsync()).rotateAsync(0, false);
        path = await image.saveToTemporaryFileAsync('jpg', 92);
      } catch {
        throw new FaceCaptureError('failed');
      }

      let uri = path.startsWith('file://') ? path : `file://${path}`;

      // The preview is the file we just wrote, not a base64 copy of it. A
      // full-screen frame encoded inline is a ~270KB string for <Image> to
      // parse on every render; a file:// URI renders straight from disk.
      // Only the small face thumbnail kept on the record needs encoding,
      // because that one has to outlive the temporary file.
      //
      // Reassigned if the still needs straightening below, so that what the
      // user confirms on screen is the image we actually embedded and stored.
      let previewUri = withPreview ? uri : undefined;
      const fail = (reason: CaptureFailure): never => {
        console.log(`[face] capture rejected: ${reason}`);
        throw new FaceCaptureError(reason, previewUri);
      };

      let faces = await runDetector(uri, detector);
      console.log(
        `[face] detector=${hasNativeDetector() ? 'vision' : 'mlkit'}`,
      );

      // The still is the one thing we cannot see from a screenshot, so its
      // measurements go to the log where they can be read off a device.
      console.log(
        `[face] still ${image.width}x${image.height}, faces=${faces.length}`,
      );

      if (faces.length === 0) {
        return fail('noFace');
      }
      if (faces.length > 1) {
        // Refusing is the safe call: marking the wrong person is worse than
        // asking someone to step out of frame.
        return fail('multipleFaces');
      }

      // Bring a sideways still upright before anything measures or crops it.
      const upright = await straighten(image, faces[0].rollAngle, detector);
      if (upright) {
        image = upright.image;
        uri = upright.uri;
        faces = upright.faces;
        if (withPreview) {
          previewUri = uri;
        }
      }

      const face = faces[0];
      const shorterSide = Math.min(face.frameWidth, face.frameHeight);
      const fill = Math.min(face.bounds.width, face.bounds.height) / shorterSide;
      console.log(
        `[face] frame ${face.frameWidth}x${face.frameHeight} ` +
          `box ${Math.round(face.bounds.width)}x${Math.round(face.bounds.height)} ` +
          `fill=${fill.toFixed(3)} (min ${MIN_FACE_RATIO}) ` +
          `yaw=${face.yawAngle.toFixed(1)} pitch=${face.pitchAngle.toFixed(1)} ` +
          `roll=${face.rollAngle.toFixed(1)} ` +
          `eyes=${face.leftEyeOpenProbability?.toFixed(2)}/${face.rightEyeOpenProbability?.toFixed(2)}`,
      );

      if (fill < MIN_FACE_RATIO) {
        return fail('faceTooSmall');
      }

      // Pose is advisory, not a veto. It exists to improve embedding quality,
      // but a person who cannot enrol at all is far worse than an embedding
      // taken slightly off-axis — and the confirm screen already puts the photo
      // in front of a human who can retake it. Detectors also disagree sharply
      // about these angles, so a hard threshold tuned on one is wrong on another.
      let warning: CaptureResult['warning'];
      if (strict) {
        const turned =
          Math.abs(face.yawAngle) > MAX_YAW_DEGREES ||
          Math.abs(face.pitchAngle) > MAX_PITCH_DEGREES ||
          Math.abs(face.rollAngle) > MAX_ROLL_DEGREES;
        if (turned) {
          console.log(
            `[face] pose warning: yaw=${face.yawAngle.toFixed(1)}/${MAX_YAW_DEGREES} ` +
              `pitch=${face.pitchAngle.toFixed(1)}/${MAX_PITCH_DEGREES} ` +
              `roll=${face.rollAngle.toFixed(1)}/${MAX_ROLL_DEGREES}`,
          );
          warning = 'notFrontal';
        }

        const left = face.leftEyeOpenProbability;
        const right = face.rightEyeOpenProbability;
        // Undefined means the classifier had no opinion — don't punish that.
        if (left !== undefined && left < 0.4 && right !== undefined && right < 0.4) {
          console.log('[face] pose warning: eyes appear closed');
          warning = warning ?? 'eyesClosed';
        }
      }

      try {
        // Same Image the detector saw, so bounds line up exactly.
        const embedding = await embedFace(image, face.bounds);
        const faceUri = withPreview
          ? await toFaceThumbnailDataUri(image, face.bounds)
          : undefined;
        return { embedding, previewUri, faceUri, warning };
      } catch {
        return fail('failed');
      }
    },
    [detector],
  );

  return { capture };
}
