/**
 * Asset locations differ between a development build and a bundled one.
 *
 * Metro serves assets over HTTP while you develop, so `resolveAssetSource`
 * hands back a URI with a scheme. Once the app is bundled it returns a bare
 * filesystem path instead —
 * `/private/var/containers/Bundle/Application/…/Zaltrix.app/assets/…` on iOS —
 * and native code that dispatches on the scheme will not accept it.
 */
export function toPlayableUri(uri: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) {
    return uri; // http(s):, file:, asset:, content:, res:
  }
  return uri.startsWith('/') ? `file://${uri}` : uri;
}
