/**
 * Where a punch happened.
 *
 * A fix is two separate jobs with very different failure modes, so they are
 * kept apart: the GPS read is on-device and either works or does not, while
 * turning coordinates into a street address needs the network and is allowed
 * to fail quietly. A punch is never blocked on the address — the coordinates
 * are the record, the address is the readable label on top of it.
 */
import { Linking, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  type Permission,
} from 'react-native-permissions';

/** A fix, as stored against a punch. */
export type PunchLocation = {
  latitude: number;
  longitude: number;
  /** Radius of confidence in metres, as reported by the platform. */
  accuracy: number | null;
  /**
   * Human-readable address, when one could be resolved. Null means the lookup
   * failed or was never attempted — the coordinates still stand.
   */
  address: string | null;
};

export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'unavailable';

export type LocationFailure =
  | 'permission'
  | 'blocked'
  | 'unavailable'
  | 'timeout'
  | 'failed';

/** Thrown by `getCurrentLocation` so callers can tell the person what to fix. */
export class LocationError extends Error {
  constructor(readonly reason: LocationFailure) {
    super(reason);
    this.name = 'LocationError';
  }
}

/** How long to wait for a fix before giving up on the punch. */
const FIX_TIMEOUT_MS = 12_000;
/** A cached fix this fresh is reused rather than waking the GPS again. */
const FIX_MAX_AGE_MS = 10_000;
/** The address lookup gets far less patience than the fix itself. */
const GEOCODE_TIMEOUT_MS = 4_000;

let configured = false;

/**
 * Called before the first fix rather than at import time: configuring the
 * native module pulls it in, and a screen that never asks for a location
 * should not pay for it.
 */
function configure() {
  if (configured) {
    return;
  }
  Geolocation.setRNConfiguration({
    skipPermissionRequests: true, // asked through react-native-permissions
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto',
  });
  configured = true;
}

const PERMISSION: Permission =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

function mapResult(status: string): LocationPermission {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.BLOCKED:
      return 'blocked';
    default:
      return 'unavailable';
  }
}

export async function getLocationPermission(): Promise<LocationPermission> {
  try {
    return mapResult(await check(PERMISSION));
  } catch {
    return 'unavailable';
  }
}

/** Asks once. A blocked permission can only be changed in system settings. */
export async function requestLocationPermission(): Promise<LocationPermission> {
  try {
    const current = await check(PERMISSION);
    if (current === RESULTS.GRANTED || current === RESULTS.LIMITED) {
      return 'granted';
    }
    if (current === RESULTS.BLOCKED) {
      return 'blocked';
    }
    return mapResult(await request(PERMISSION));
  } catch {
    return 'unavailable';
  }
}

export function openLocationSettings(): void {
  void Linking.openSettings();
}

/* ---------------------------------- fix ---------------------------------- */

/** The raw platform fix, with the permission handled first. */
export async function getCurrentLocation(): Promise<PunchLocation> {
  const permission = await requestLocationPermission();
  if (permission !== 'granted') {
    throw new LocationError(
      permission === 'blocked'
        ? 'blocked'
        : permission === 'unavailable'
        ? 'unavailable'
        : 'permission',
    );
  }

  configure();

  const position = await new Promise<{
    coords: { latitude: number; longitude: number; accuracy: number | null };
  }>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      resolve,
      error => {
        // 3 is TIMEOUT, 1 is PERMISSION_DENIED; anything else is the radio.
        reject(
          new LocationError(
            error?.code === 3 ? 'timeout' : error?.code === 1 ? 'permission' : 'failed',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: FIX_TIMEOUT_MS,
        maximumAge: FIX_MAX_AGE_MS,
      },
    );
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy:
      typeof position.coords.accuracy === 'number' ? position.coords.accuracy : null,
    address: null,
  };
}

/**
 * A fix with its address filled in when one can be had.
 *
 * The lookup is raced against a short timeout and its failure is swallowed:
 * a punch marked in a basement with no signal still records where it was, it
 * just says so in coordinates.
 */
export async function getCurrentLocationWithAddress(): Promise<PunchLocation> {
  const fix = await getCurrentLocation();
  const address = await reverseGeocode(fix.latitude, fix.longitude);
  return { ...fix, address };
}

/* ------------------------------- geocoding -------------------------------- */

/**
 * Coordinates rounded to ~11 m, which is the resolution at which two punches
 * from the same doorway should share one cached address.
 */
const addressCache = new Map<string, string | null>();

const cacheKey = (lat: number, lng: number) =>
  `${lat.toFixed(4)},${lng.toFixed(4)}`;

/**
 * Coordinates → street address, or null.
 *
 * This is the one part of attendance that leaves the device: the coordinates
 * (and nothing else — no name, no ID, no face) go to OpenStreetMap's public
 * geocoder to be named. Everything downstream treats null as ordinary, so
 * refusing the network costs a label and nothing more.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const key = cacheKey(latitude, longitude);
  const cached = addressCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const url =
      'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18' +
      `&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Zaltrix/1.0' },
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
    const body = (await response.json()) as { display_name?: string };
    const address = shortenAddress(body?.display_name) ?? null;
    addressCache.set(key, address);
    return address;
  } catch {
    // Not cached: a lookup that failed because the train went into a tunnel
    // should be retried the next time someone stands in the same place.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Nominatim returns the whole chain down to the country and postcode, which
 * is far too long for a list row. The leading parts are the ones that identify
 * a place to someone who already knows the city.
 */
function shortenAddress(displayName?: string): string | undefined {
  if (!displayName) {
    return undefined;
  }
  const parts = displayName
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  return parts.slice(0, 4).join(', ') || undefined;
}

/* -------------------------------- geometry -------------------------------- */

const EARTH_RADIUS_M = 6_371_008.8;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in metres.
 *
 * Haversine rather than a flat-earth approximation: the error of treating
 * degrees as a grid is small at a hundred metres but grows with latitude, and
 * a geofence that quietly widens the further north you go is a bug nobody
 * would think to look for.
 */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ------------------------------- formatting ------------------------------- */

/** `12.971599° N, 77.594566° E` — the fallback when there is no address. */
export function formatCoordinates(latitude: number, longitude: number): string {
  const lat = `${Math.abs(latitude).toFixed(6)}° ${latitude >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(longitude).toFixed(6)}° ${longitude >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

/** The address if there is one, coordinates if there is not. */
export function describeLocation(location: PunchLocation): string {
  return (
    location.address ?? formatCoordinates(location.latitude, location.longitude)
  );
}

/** `45 m` under a kilometre, `1.2 km` above it. */
export function formatDistance(meters: number): string {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
