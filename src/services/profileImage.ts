/**
 * Picking a profile picture, from the camera or the photo library.
 *
 * The picker downscales and compresses before we ever see the bytes, so what
 * comes back is a small square-ish thumbnail rather than a 12-megapixel photo.
 * It is kept as a data URI on the user record — see `User.avatar`.
 */
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import type { Asset, ImagePickerResponse, OptionsCommon } from 'react-native-image-picker';

export type PickSource = 'camera' | 'library';

export type PickFailure = 'cancelled' | 'permission' | 'unavailable' | 'tooLarge' | 'failed';

export class ProfileImageError extends Error {
  constructor(public readonly reason: PickFailure) {
    super(reason);
    this.name = 'ProfileImageError';
  }
}

/**
 * An avatar is never rendered above ~92pt, so 512px covers a 3x screen with
 * room to spare. Going larger only inflates the stored string.
 */
const options: OptionsCommon = {
  mediaType: 'photo',
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.7,
  includeBase64: true,
};

/**
 * Ceiling on the encoded string. A 512px JPEG at quality 0.7 lands well under
 * this; anything larger suggests the platform ignored our resize hints, and
 * storing it would bloat every read of the user record.
 */
const MAX_BASE64_BYTES = 600_000;

function firstAsset(response: ImagePickerResponse): Asset {
  if (response.didCancel) {
    throw new ProfileImageError('cancelled');
  }
  if (response.errorCode === 'permission') {
    throw new ProfileImageError('permission');
  }
  if (response.errorCode === 'camera_unavailable') {
    throw new ProfileImageError('unavailable');
  }
  if (response.errorCode) {
    throw new ProfileImageError('failed');
  }
  const asset = response.assets?.[0];
  if (!asset?.base64) {
    throw new ProfileImageError('failed');
  }
  return asset;
}

/** Opens the chosen source and returns a `data:` URI ready to render and store. */
export async function pickProfileImage(source: PickSource): Promise<string> {
  let response: ImagePickerResponse;
  try {
    response =
      source === 'camera'
        ? await launchCamera({ ...options, cameraType: 'front', saveToPhotos: false })
        : await launchImageLibrary({ ...options, selectionLimit: 1 });
  } catch {
    throw new ProfileImageError('failed');
  }

  const asset = firstAsset(response);
  const base64 = asset.base64 as string;

  if (base64.length > MAX_BASE64_BYTES) {
    throw new ProfileImageError('tooLarge');
  }

  // `type` can be absent on some Android providers; JPEG is what the picker
  // produces once maxWidth/maxHeight force a re-encode.
  const mime = asset.type && asset.type.startsWith('image/') ? asset.type : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

/** True for a value that can actually be handed to an <Image source>. */
export function isRenderableAvatar(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('data:image/');
}
