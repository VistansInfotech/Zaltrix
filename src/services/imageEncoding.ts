/**
 * Turning a native Image into something storable and renderable.
 *
 * React Native has no global `btoa`, and the encoded photo has to survive in
 * AsyncStorage alongside the rest of the record, so the bytes are base64'd here
 * and handed back as a `data:` URI.
 */
import type { Image } from 'react-native-nitro-image';

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 over raw bytes, chunked so no huge argument list is built. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }

  // Tail: 1 or 2 leftover bytes get padded with '='.
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (remaining === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }

  return out;
}

/** Longest edge of a stored face thumbnail, in pixels. */
const THUMB_SIZE = 320;

/**
 * Shrinks an image and returns it as a JPEG `data:` URI.
 *
 * Deliberately small: this is a record thumbnail shown in a list, not the
 * frame recognition runs on, and it is stored inline with the person's record.
 */
export async function toThumbnailDataUri(
  image: Image,
  size: number = THUMB_SIZE,
  quality = 80,
): Promise<string> {
  const longest = Math.max(image.width, image.height) || 1;
  const scale = Math.min(1, size / longest);
  const target =
    scale < 1
      ? await image.resizeAsync(
          Math.max(1, Math.round(image.width * scale)),
          Math.max(1, Math.round(image.height * scale)),
        )
      : image;

  const encoded = await target.toEncodedImageDataAsync('jpg', quality);
  return `data:image/jpeg;base64,${arrayBufferToBase64(encoded.buffer)}`;
}

/**
 * Margin added around the detector's face box before cropping, as a fraction
 * of the box. Taller than wide on purpose: the stored photo is shown in a
 * portrait tile, and a detector box stops at the chin and hairline, so an even
 * margin crops a head that looks decapitated.
 */
export const FACE_CROP_MARGIN_X = 0.3;
export const FACE_CROP_MARGIN_Y = 0.55;

/** Smallest crop worth taking; below this the frame is used instead. */
const MIN_CROP_PX = 8;

export type CropRect = { startX: number; startY: number; endX: number; endY: number };

/**
 * The region of the frame kept for a person's stored photo.
 *
 * Separated out because it is pure geometry and the clamping is easy to get
 * wrong at the edges of the frame — where faces near the border end up.
 */
export function faceCropRect(
  frame: { width: number; height: number },
  bounds: { x: number; y: number; width: number; height: number },
): CropRect {
  const mx = bounds.width * FACE_CROP_MARGIN_X;
  const my = bounds.height * FACE_CROP_MARGIN_Y;
  return {
    startX: Math.max(0, Math.round(bounds.x - mx)),
    startY: Math.max(0, Math.round(bounds.y - my)),
    endX: Math.min(frame.width, Math.round(bounds.x + bounds.width + mx)),
    endY: Math.min(frame.height, Math.round(bounds.y + bounds.height + my)),
  };
}

/**
 * Crops to the face (with margin) and returns a portrait thumbnail.
 * Used for the enrolment record, so the stored picture is the face that was
 * actually matched against rather than the whole frame.
 */
export async function toFaceThumbnailDataUri(
  image: Image,
  bounds: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const { startX, startY, endX, endY } = faceCropRect(image, bounds);

  if (endX - startX < MIN_CROP_PX || endY - startY < MIN_CROP_PX) {
    return toThumbnailDataUri(image);
  }

  const cropped = await image.cropAsync(startX, startY, endX, endY);
  return toThumbnailDataUri(cropped);
}
