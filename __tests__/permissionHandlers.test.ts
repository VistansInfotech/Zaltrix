/**
 * Every permission the app asks for must have its iOS handler compiled in.
 *
 * react-native-permissions ships one pod per handler and `setup_permissions`
 * in the Podfile decides which are built. Ask for one that was left out and
 * nothing fails at build time — it throws a red screen the first time a user
 * reaches that feature, which is how `LOCATION_WHEN_IN_USE` shipped broken
 * after the geofence work.
 *
 * So this reads both sides and compares them. It is a lint on two files that
 * have no other reason to stay in step.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), 'utf8');
}

/** The handler names inside the Podfile's setup_permissions([...]) call. */
function declaredHandlers(): string[] {
  const podfile = read('ios', 'Podfile');
  const call = /setup_permissions\(\[([^\]]*)\]\)/.exec(podfile);
  if (!call) {
    throw new Error('setup_permissions([...]) not found in ios/Podfile');
  }
  return [...call[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
}

/** Source files that could reference a permission. */
const SOURCES = [
  join('src', 'services', 'locationService.ts'),
  join('src', 'services', 'notificationService.ts'),
];

/** `LOCATION_WHEN_IN_USE` -> `LocationWhenInUse`, the handler pod's name. */
function handlerNameFor(constant: string): string {
  return constant
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** Every `PERMISSIONS.IOS.X` the app names. */
function requestedIosPermissions(): string[] {
  const found = new Set<string>();
  for (const file of SOURCES) {
    const source = read(file);
    for (const match of source.matchAll(/PERMISSIONS\.IOS\.([A-Z_0-9]+)/g)) {
      found.add(match[1]);
    }
    // The notifications API is its own pair of functions rather than a
    // PERMISSIONS entry, but it still needs the handler.
    if (/\b(check|request)Notifications\b/.test(source)) {
      found.add('NOTIFICATIONS');
    }
  }
  return [...found];
}

describe('iOS permission handlers', () => {
  it('finds the Podfile declaration', () => {
    expect(declaredHandlers().length).toBeGreaterThan(0);
  });

  it('declares a handler for every permission the app asks for', () => {
    const declared = declaredHandlers();
    const missing = requestedIosPermissions()
      .map(handlerNameFor)
      .filter(handler => !declared.includes(handler));

    // A miss here is a red screen on a real device, not a build error.
    expect(missing).toEqual([]);
  });

  it('covers the location permission the geofence depends on', () => {
    expect(declaredHandlers()).toContain('LocationWhenInUse');
  });

  it('maps a permission constant to its handler pod name', () => {
    expect(handlerNameFor('LOCATION_WHEN_IN_USE')).toBe('LocationWhenInUse');
    expect(handlerNameFor('CAMERA')).toBe('Camera');
    expect(handlerNameFor('PHOTO_LIBRARY')).toBe('PhotoLibrary');
  });
});

describe('iOS usage descriptions', () => {
  /**
   * A handler without its Info.plist string is the other half of the same
   * mistake: iOS kills the app outright the moment the prompt would appear.
   */
  it('explains why each permission is wanted', () => {
    const plist = read('ios', 'Zaltrix', 'Info.plist');
    for (const key of [
      'NSCameraUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSFaceIDUsageDescription',
      'NSPhotoLibraryUsageDescription',
    ]) {
      expect(plist).toContain(key);
    }
  });
});

describe('Android permission declarations', () => {
  it('asks for location, which the geofence needs', () => {
    const manifest = read(
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );
    expect(manifest).toContain('android.permission.ACCESS_FINE_LOCATION');
    // Coarse alongside fine: Android 12+ lets someone grant only approximate
    // location, and a fence of a hundred metres or more still works with it.
    expect(manifest).toContain('android.permission.ACCESS_COARSE_LOCATION');
  });
});
