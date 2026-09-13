/**
 * Face detection, behind one interface.
 *
 * iOS uses Apple's Vision framework through a small native module: it is built
 * into the OS, tuned for iPhone cameras, markedly better in dim light, adds no
 * binary weight and ships no telemetry.
 *
 * Android still goes through ML Kit until its native replacement lands. Both
 * return the same shape, so nothing above this file knows the difference.
 */
import { NativeModules, Platform } from 'react-native';

/** Everything the app needs to know about one detected face. */
export type DetectedFace = {
  /** Pixel bounds in the image, origin top-left. */
  bounds: { x: number; y: number; width: number; height: number };
  frameWidth: number;
  frameHeight: number;
  /** Head rotation in degrees; 0 is square to the camera. */
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
  /** 0-1, or undefined when the detector has no opinion. */
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
};

/** The shape the native iOS module resolves. */
type NativeFace = {
  x: number;
  y: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
};

type ZXFaceDetectorModule = {
  detectFaces(uri: string): Promise<NativeFace[]>;
};

/**
 * Looked up on each call rather than captured at import time: module
 * registration order is not guaranteed, and reading it once at import can
 * latch `undefined` before the native module has registered.
 */
function getNative(): ZXFaceDetectorModule | undefined {
  return (NativeModules as Record<string, ZXFaceDetectorModule | undefined>)
    .ZXFaceDetector;
}

/** True when the platform's own detector is linked into this build. */
export function hasNativeDetector(): boolean {
  return Platform.OS === 'ios' && getNative() != null;
}

function fromNative(face: NativeFace): DetectedFace {
  return {
    bounds: {
      x: face.x,
      y: face.y,
      width: face.width,
      height: face.height,
    },
    frameWidth: face.frameWidth,
    frameHeight: face.frameHeight,
    yawAngle: face.yawAngle,
    pitchAngle: face.pitchAngle,
    rollAngle: face.rollAngle,
    leftEyeOpenProbability: face.leftEyeOpenProbability,
    rightEyeOpenProbability: face.rightEyeOpenProbability,
  };
}

/**
 * Detects faces in a still image.
 *
 * `uri` must point at a file whose camera orientation and mirroring are already
 * applied — the detector reads the pixels as they are.
 */
export async function detectFacesInImage(uri: string): Promise<DetectedFace[]> {
  const native = getNative();
  if (!native) {
    throw new Error('Native face detector is unavailable on this platform');
  }
  const faces = await native.detectFaces(uri);
  return faces.map(fromNative);
}
