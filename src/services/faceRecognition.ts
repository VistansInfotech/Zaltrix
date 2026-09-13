/**
 * On-device face recognition.
 *
 * A face is turned into an embedding — a short list of numbers — by a
 * MobileFaceNet TFLite model. Two photos of the same person produce embeddings
 * that point in nearly the same direction, so comparing two faces is a cosine
 * similarity between their embeddings. Nothing is uploaded: the model runs
 * locally and embeddings are stored on the device.
 *
 * See src/assets/models/README.md for the model's provenance and licence status.
 */
import type { Image, PixelFormat } from 'react-native-nitro-image';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import type { TfliteModel } from 'react-native-fast-tflite';
import { Image as RNImage, Platform } from 'react-native';

import { toPlayableUri } from './assetUri';

/** Square input the model expects, in pixels. Read back from the model on load. */
const DEFAULT_INPUT_SIZE = 112;

/**
 * Cosine similarity above which two embeddings are considered the same person.
 *
 * MobileFaceNet separates identities well, but the threshold is a trade-off:
 * lower it and strangers start matching (false attendance); raise it and the
 * enrolled person gets rejected in poor light. 0.65 is a conservative middle —
 * tune it against your own users rather than treating it as a constant.
 */
export const MATCH_THRESHOLD = 0.65;

/** Fraction of the face box added on each side, so the crop keeps some context. */
const CROP_MARGIN = 0.25;

export type FaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FaceEmbedding = number[];

let modelPromise: Promise<TfliteModel> | null = null;
let inputSize = DEFAULT_INPUT_SIZE;
let embeddingSize = 192;

/**
 * Loads the model once and reuses it. Deliberately lazy — the model is 5MB and
 * only the attendance screens need it, so the rest of the app never pays for it.
 */
export function getFaceModel(): Promise<TfliteModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      // core-ml / nnapi fall back to CPU automatically when unavailable.
      const delegates = Platform.OS === 'ios' ? (['core-ml'] as const) : (['nnapi'] as const);

      // Resolve and normalise the URI ourselves. Passing the require() handle
      // straight through hands native a bare path in a bundled build, which is
      // the same trap the attendance chimes fell into.
      const asset = RNImage.resolveAssetSource(
        require('../assets/models/mobile_face_net.tflite'),
      );
      const source = asset?.uri
        ? { url: toPlayableUri(asset.uri) }
        : require('../assets/models/mobile_face_net.tflite');
      console.log('[face] loading model from', asset?.uri);

      let model: TfliteModel;
      try {
        model = await loadTensorflowModel(source, [...delegates]);
      } catch (e) {
        console.log('[face] delegate load failed, retrying on CPU', e);
        // A missing delegate must not take the feature down — retry on CPU.
        model = await loadTensorflowModel(source, []);
      }

      // Trust the model over our constants, so swapping in a different one works.
      const inShape = model.inputs[0]?.shape;
      if (inShape && inShape.length === 4) {
        inputSize = inShape[1];
      }
      const outShape = model.outputs[0]?.shape;
      if (outShape && outShape.length >= 2) {
        embeddingSize = outShape[outShape.length - 1];
      }
      return model;
    })();
    // A failed load must not be cached forever — let the next attempt retry.
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

/** Byte offsets of R, G and B within each pixel, for the format nitro reports. */
function channelOffsets(format: PixelFormat): {
  r: number;
  g: number;
  b: number;
  stride: number;
} {
  switch (format) {
    case 'RGBA':
    case 'RGBX':
      return { r: 0, g: 1, b: 2, stride: 4 };
    case 'BGRA':
    case 'BGRX':
      return { r: 2, g: 1, b: 0, stride: 4 };
    case 'ARGB':
    case 'XRGB':
      return { r: 1, g: 2, b: 3, stride: 4 };
    case 'ABGR':
    case 'XBGR':
      return { r: 3, g: 2, b: 1, stride: 4 };
    case 'RGB':
      return { r: 0, g: 1, b: 2, stride: 3 };
    case 'BGR':
      return { r: 2, g: 1, b: 0, stride: 3 };
    default:
      // Best guess; matches Android's ARGB_8888 memory layout.
      return { r: 0, g: 1, b: 2, stride: 4 };
  }
}

/**
 * Crops the face out of a photo, scales it to the model's input size and
 * normalises it to the [-1, 1] range MobileFaceNet was trained on.
 */
async function preprocess(image: Image, bounds: FaceBounds): Promise<ArrayBuffer> {
  // Widen the box a little, then clamp so we never crop outside the photo.
  const marginX = bounds.width * CROP_MARGIN;
  const marginY = bounds.height * CROP_MARGIN;
  const startX = Math.max(0, Math.round(bounds.x - marginX));
  const startY = Math.max(0, Math.round(bounds.y - marginY));
  const endX = Math.min(image.width, Math.round(bounds.x + bounds.width + marginX));
  const endY = Math.min(image.height, Math.round(bounds.y + bounds.height + marginY));

  if (endX - startX < 8 || endY - startY < 8) {
    throw new Error('Face region is too small to read.');
  }

  const face = await image.cropAsync(startX, startY, endX, endY);
  const scaled = await face.resizeAsync(inputSize, inputSize);
  const raw = await scaled.toRawPixelDataAsync();

  const bytes = new Uint8Array(raw.buffer);
  const { r, g, b, stride } = channelOffsets(raw.pixelFormat);
  const pixels = raw.width * raw.height;
  const input = new Float32Array(pixels * 3);

  for (let i = 0; i < pixels; i++) {
    const src = i * stride;
    const dst = i * 3;
    // (px - 127.5) / 128 — the normalisation MobileFaceNet expects.
    input[dst] = (bytes[src + r] - 127.5) / 128;
    input[dst + 1] = (bytes[src + g] - 127.5) / 128;
    input[dst + 2] = (bytes[src + b] - 127.5) / 128;
  }

  return input.buffer;
}

/** Scales a vector to unit length so similarity is a plain dot product. */
function l2Normalise(vector: Float32Array): FaceEmbedding {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sum) || 1;
  const out = new Array<number>(vector.length);
  for (let i = 0; i < vector.length; i++) {
    out[i] = vector[i] / magnitude;
  }
  return out;
}

/**
 * Runs the model over one detected face and returns its unit-length embedding.
 * `image` must already have camera orientation and mirroring applied — the
 * bounds are in that image's coordinate space.
 */
export async function embedFace(
  image: Image,
  bounds: FaceBounds,
): Promise<FaceEmbedding> {
  const model = await getFaceModel();
  const input = await preprocess(image, bounds);
  const [output] = await model.run([input]);
  return l2Normalise(new Float32Array(output));
}

/**
 * Cosine similarity of two unit-length embeddings: 1 is identical, 0 unrelated.
 * Returns 0 for mismatched lengths, which happens when the model was swapped
 * after faces were enrolled — those enrolments are stale and must be redone.
 */
export function similarity(a: FaceEmbedding, b: FaceEmbedding): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

export type Candidate<T> = { item: T; embedding: FaceEmbedding };

export type MatchResult<T> = {
  item: T;
  score: number;
} | null;

/**
 * Picks the closest enrolled face, or null when nothing clears the threshold.
 * A linear scan is the right shape here: attendance rosters are hundreds of
 * people at most, and 192 multiplications each is nothing next to inference.
 */
export function findBestMatch<T>(
  probe: FaceEmbedding,
  candidates: Candidate<T>[],
  threshold: number = MATCH_THRESHOLD,
): MatchResult<T> {
  let best: MatchResult<T> = null;
  for (const candidate of candidates) {
    const score = similarity(probe, candidate.embedding);
    if (score >= threshold && (best === null || score > best.score)) {
      best = { item: candidate.item, score };
    }
  }
  return best;
}

/** Exposed for diagnostics — the embedding width the loaded model produces. */
export function getEmbeddingSize(): number {
  return embeddingSize;
}
