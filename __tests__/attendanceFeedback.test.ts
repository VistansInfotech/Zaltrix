/**
 * Asset locations differ between a dev build and a bundled one: Metro serves
 * over HTTP, while a shipped app resolves to a bare filesystem path. The player
 * switches on the scheme, so a path without one never plays.
 */
import { toPlayableUri } from '../src/services/attendanceFeedback';

describe('toPlayableUri', () => {
  it('adds file:// to a bundled iOS path', () => {
    const bundled =
      '/private/var/containers/Bundle/Application/FE65DF44/Zaltrix.app/assets/src/assets/sounds/error.wav';
    expect(toPlayableUri(bundled)).toBe(`file://${bundled}`);
  });

  it.each([
    'http://192.168.31.63:8081/assets/src/assets/sounds/error.wav?platform=ios',
    'https://example.com/a.wav',
    'file:///already/absolute.wav',
    'asset:/sounds/success.wav',
    'content://media/external/audio/42',
  ])('leaves %s alone', uri => {
    expect(toPlayableUri(uri)).toBe(uri);
  });

  it('does not mangle an Android resource name', () => {
    // Metro can hand back a bare resource identifier with no leading slash.
    expect(toPlayableUri('success')).toBe('success');
  });

  it('is idempotent', () => {
    const once = toPlayableUri('/tmp/a.wav');
    expect(toPlayableUri(once)).toBe(once);
  });
});
