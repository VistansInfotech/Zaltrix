/**
 * The workplace boundary a punch has to fall inside.
 *
 * Two separate switches, because they answer different questions and an
 * organisation may well want one without the other:
 *
 *   `captureLocation` — stamp every punch with where it happened.
 *   `enforceRadius`   — and refuse the punch if that is not here.
 *
 * Enforcing without capturing is meaningless, so the enforcement check treats
 * capture as its precondition rather than trusting the two flags to agree.
 */
import { readJSON, StorageKeys, writeJSON } from './storage';
import { distanceMeters, type PunchLocation } from './locationService';

export type GeofenceConfig = {
  /** Record latitude, longitude and address against each punch. */
  captureLocation: boolean;
  /** Additionally require the punch to be inside the radius below. */
  enforceRadius: boolean;
  /** Centre of the allowed area. Null until an admin sets one. */
  latitude: number | null;
  longitude: number | null;
  /** How far from the centre still counts as being at work. */
  radiusMeters: number;
  /** What to call the place, e.g. "Head office". Optional. */
  label: string | null;
  /** The address the centre resolved to when it was set, for display. */
  address: string | null;
  /** ISO timestamp of the last change, so the admin screen can date it. */
  updatedAt: string | null;
};

/**
 * Location off by default. Turning on a tracking feature is a decision
 * somebody has to make deliberately, not something an app update does for them.
 */
export const DEFAULT_GEOFENCE: GeofenceConfig = {
  captureLocation: false,
  enforceRadius: false,
  latitude: null,
  longitude: null,
  radiusMeters: 200,
  label: null,
  address: null,
  updatedAt: null,
};

/** The radii offered on the admin screen, in metres. */
export const RADIUS_CHOICES = [50, 100, 200, 500, 1000] as const;

export async function readGeofence(): Promise<GeofenceConfig> {
  const stored = await readJSON<Partial<GeofenceConfig>>(
    StorageKeys.geofence,
    {},
  );
  // Spread over the defaults rather than trusting the stored shape: a config
  // written by an older build is missing whichever field was added since.
  return { ...DEFAULT_GEOFENCE, ...stored };
}

export async function writeGeofence(
  patch: Partial<GeofenceConfig>,
): Promise<GeofenceConfig> {
  const next: GeofenceConfig = {
    ...(await readGeofence()),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeJSON(StorageKeys.geofence, next);
  return next;
}

/** True once a centre has been pinned — enforcement is meaningless before. */
export function hasCentre(
  config: GeofenceConfig,
): config is GeofenceConfig & { latitude: number; longitude: number } {
  return config.latitude !== null && config.longitude !== null;
}

/**
 * The three states the feature can be in, for the screens that describe it.
 *
 * Derived in one place because both the admin's settings row and the user's
 * status card have to agree about what is switched on — two screens each
 * working it out from the raw flags is two chances to disagree, and the one
 * that disagrees is the one telling somebody their punch will be accepted.
 */
export type GeofenceSummary =
  | { state: 'off' }
  /** Stamping punches with a position, but not checking it. */
  | { state: 'capture' }
  /** Stamping and refusing anything outside the radius. */
  | { state: 'enforced'; radiusMeters: number; place: string | null };

export function summariseGeofence(config: GeofenceConfig): GeofenceSummary {
  if (!config.captureLocation) {
    return { state: 'off' };
  }
  if (!config.enforceRadius || !hasCentre(config)) {
    return { state: 'capture' };
  }
  return {
    state: 'enforced',
    radiusMeters: config.radiusMeters,
    place: config.label ?? config.address,
  };
}

export type GeofenceVerdict =
  /** Nothing to check — location is off, or no centre is set. */
  | { state: 'off' }
  /** Inside the radius. */
  | { state: 'inside'; distance: number }
  /** Outside it: the punch must be refused. */
  | { state: 'outside'; distance: number };

/**
 * Where a fix falls relative to the boundary.
 *
 * Enforcement turned on with no centre pinned reads as 'off' rather than
 * refusing everything: a half-configured setting must not lock the whole
 * workforce out of punching in.
 */
export function evaluateGeofence(
  config: GeofenceConfig,
  location: PunchLocation | null | undefined,
): GeofenceVerdict {
  if (!config.captureLocation || !config.enforceRadius || !hasCentre(config)) {
    return { state: 'off' };
  }
  if (!location) {
    return { state: 'off' };
  }

  const distance = distanceMeters(location, {
    latitude: config.latitude,
    longitude: config.longitude,
  });
  return distance <= config.radiusMeters
    ? { state: 'inside', distance }
    : { state: 'outside', distance };
}

/**
 * How far a fix is from the centre, for the readouts that show the distance
 * whether or not it is being enforced.
 *
 * Null whenever there is nothing to measure — no config loaded yet, no fix, or
 * no centre pinned — so callers render one absence rather than three.
 */
export function distanceFromCentre(
  config: GeofenceConfig | null | undefined,
  location: PunchLocation | null | undefined,
): number | null {
  if (!config || !location || !hasCentre(config)) {
    return null;
  }
  return distanceMeters(location, {
    latitude: config.latitude,
    longitude: config.longitude,
  });
}
