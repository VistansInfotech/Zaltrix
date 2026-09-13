/**
 * Picking a profile picture. The failure paths matter as much as the happy one:
 * a cancelled picker must not look like an error, and an oversized image must
 * not reach storage.
 */
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import {
  isRenderableAvatar,
  pickProfileImage,
  ProfileImageError,
} from '../src/services/profileImage';

const camera = launchCamera as jest.Mock;
const library = launchImageLibrary as jest.Mock;

beforeEach(() => {
  camera.mockReset();
  library.mockReset();
});

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'no-error';
  } catch (e) {
    return e instanceof ProfileImageError ? e.reason : 'wrong-error-type';
  }
}

describe('pickProfileImage', () => {
  it('returns a data URI from the library', async () => {
    library.mockResolvedValue({ assets: [{ base64: 'AAAA', type: 'image/png' }] });
    await expect(pickProfileImage('library')).resolves.toBe('data:image/png;base64,AAAA');
  });

  it('uses the camera when asked, with the front lens', async () => {
    camera.mockResolvedValue({ assets: [{ base64: 'BBBB', type: 'image/jpeg' }] });
    await pickProfileImage('camera');
    expect(camera).toHaveBeenCalledTimes(1);
    expect(library).not.toHaveBeenCalled();
    expect(camera.mock.calls[0][0]).toMatchObject({
      cameraType: 'front',
      mediaType: 'photo',
      includeBase64: true,
    });
  });

  it('asks the picker to downscale rather than trusting the source size', async () => {
    library.mockResolvedValue({ assets: [{ base64: 'A', type: 'image/jpeg' }] });
    await pickProfileImage('library');
    const options = library.mock.calls[0][0];
    expect(options.maxWidth).toBeLessThanOrEqual(512);
    expect(options.maxHeight).toBeLessThanOrEqual(512);
    expect(options.quality).toBeLessThan(1);
  });

  it('defaults to JPEG when the provider reports no mime type', async () => {
    library.mockResolvedValue({ assets: [{ base64: 'CCCC' }] });
    await expect(pickProfileImage('library')).resolves.toBe('data:image/jpeg;base64,CCCC');
  });

  it('ignores a bogus mime type', async () => {
    library.mockResolvedValue({ assets: [{ base64: 'D', type: 'application/octet-stream' }] });
    await expect(pickProfileImage('library')).resolves.toBe('data:image/jpeg;base64,D');
  });

  it('reports a cancel distinctly, so callers can stay silent', async () => {
    library.mockResolvedValue({ didCancel: true });
    expect(await reasonOf(pickProfileImage('library'))).toBe('cancelled');
  });

  it('reports a denied permission', async () => {
    library.mockResolvedValue({ errorCode: 'permission' });
    expect(await reasonOf(pickProfileImage('library'))).toBe('permission');
  });

  it('reports a missing camera', async () => {
    camera.mockResolvedValue({ errorCode: 'camera_unavailable' });
    expect(await reasonOf(pickProfileImage('camera'))).toBe('unavailable');
  });

  it('rejects an oversized image instead of storing it', async () => {
    library.mockResolvedValue({ assets: [{ base64: 'x'.repeat(700_000), type: 'image/jpeg' }] });
    expect(await reasonOf(pickProfileImage('library'))).toBe('tooLarge');
  });

  it('fails cleanly when the picker returns nothing usable', async () => {
    library.mockResolvedValue({ assets: [{ uri: 'file:///no-base64.jpg' }] });
    expect(await reasonOf(pickProfileImage('library'))).toBe('failed');
  });

  it('fails cleanly when the picker itself throws', async () => {
    library.mockRejectedValue(new Error('native blew up'));
    expect(await reasonOf(pickProfileImage('library'))).toBe('failed');
  });
});

describe('isRenderableAvatar', () => {
  it('accepts a data image URI', () => {
    expect(isRenderableAvatar('data:image/jpeg;base64,AAAA')).toBe(true);
  });

  it('rejects empty, null and non-image values', () => {
    expect(isRenderableAvatar(null)).toBe(false);
    expect(isRenderableAvatar(undefined)).toBe(false);
    expect(isRenderableAvatar('')).toBe(false);
    expect(isRenderableAvatar('https://example.com/a.jpg')).toBe(false);
    expect(isRenderableAvatar('data:text/plain;base64,AAAA')).toBe(false);
  });
});
