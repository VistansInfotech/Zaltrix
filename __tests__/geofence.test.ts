/**
 * The workplace boundary.
 *
 * This is access control, not display: a wrong answer here either refuses a
 * person their attendance or accepts a punch made from home. The cases that
 * matter most are the half-configured ones — enforcement armed with no centre,
 * a config written by an older build — which must fail *open*, because a
 * setting nobody finished must not lock a whole workforce out on Monday.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { attachAddress, logAttendance } from '../src/services/attendanceStore';
import { StorageKeys } from '../src/services/storage';
import {
  DEFAULT_GEOFENCE,
  readGeofence,
  writeGeofence,
  distanceFromCentre,
  evaluateGeofence,
  hasCentre,
  type GeofenceConfig,
} from '../src/services/geofenceStore';
import {
  distanceMeters,
  formatCoordinates,
  formatDistance,
  describeLocation,
  type PunchLocation,
} from '../src/services/locationService';

/** Bengaluru, Vidhana Soudha. */
const OFFICE = { latitude: 12.9794, longitude: 77.5912 };

function config(overrides: Partial<GeofenceConfig> = {}): GeofenceConfig {
  return {
    ...DEFAULT_GEOFENCE,
    captureLocation: true,
    enforceRadius: true,
    latitude: OFFICE.latitude,
    longitude: OFFICE.longitude,
    radiusMeters: 200,
    ...overrides,
  };
}

function fix(overrides: Partial<PunchLocation> = {}): PunchLocation {
  return {
    latitude: OFFICE.latitude,
    longitude: OFFICE.longitude,
    accuracy: 10,
    address: null,
    ...overrides,
  };
}

/** Moves a point roughly `meters` due north. One degree of latitude ≈ 111.32 km. */
function north(from: { latitude: number; longitude: number }, meters: number) {
  return { ...from, latitude: from.latitude + meters / 111_320 };
}

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(OFFICE, OFFICE)).toBeCloseTo(0, 6);
  });

  it('measures a known northward offset', () => {
    const there = north(OFFICE, 500);
    expect(distanceMeters(OFFICE, there)).toBeGreaterThan(495);
    expect(distanceMeters(OFFICE, there)).toBeLessThan(505);
  });

  it('is symmetric', () => {
    const there = north(OFFICE, 250);
    expect(distanceMeters(OFFICE, there)).toBeCloseTo(
      distanceMeters(there, OFFICE),
      6,
    );
  });

  it('measures east-west shrinking with latitude', () => {
    // A flat-degree approximation would call these two equal. The whole point
    // of haversine here is that a fence must not widen as you go north.
    const oneDegreeEastAtEquator = distanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );
    const oneDegreeEastAt60 = distanceMeters(
      { latitude: 60, longitude: 0 },
      { latitude: 60, longitude: 1 },
    );
    expect(oneDegreeEastAt60).toBeLessThan(oneDegreeEastAtEquator * 0.55);
  });

  it('handles a pair spanning the antimeridian', () => {
    const west = { latitude: 0, longitude: 179.999 };
    const east = { latitude: 0, longitude: -179.999 };
    // Two hundred metres apart on the ground, not most of the way round.
    expect(distanceMeters(west, east)).toBeLessThan(400);
  });
});

describe('hasCentre', () => {
  it('is false until a centre is pinned', () => {
    expect(hasCentre(DEFAULT_GEOFENCE)).toBe(false);
  });

  it('is false when only one coordinate is set', () => {
    expect(hasCentre(config({ longitude: null }))).toBe(false);
  });

  it('accepts a centre on the null meridian', () => {
    // 0 is a real coordinate; a truthiness check here would reject Greenwich.
    expect(hasCentre(config({ latitude: 0, longitude: 0 }))).toBe(true);
  });
});

describe('evaluateGeofence', () => {
  it('is off when location is not being recorded', () => {
    expect(evaluateGeofence(config({ captureLocation: false }), fix())).toEqual({
      state: 'off',
    });
  });

  it('is off when enforcement is not switched on', () => {
    expect(evaluateGeofence(config({ enforceRadius: false }), fix())).toEqual({
      state: 'off',
    });
  });

  it('is off — not refusing — when enforcement is armed with no centre', () => {
    // The half-configured case. Refusing here would lock everyone out.
    const half = config({ latitude: null, longitude: null });
    expect(evaluateGeofence(half, fix())).toEqual({ state: 'off' });
  });

  it('is off when there is no fix to judge', () => {
    expect(evaluateGeofence(config(), null)).toEqual({ state: 'off' });
  });

  it('accepts a punch at the centre', () => {
    const verdict = evaluateGeofence(config(), fix());
    expect(verdict.state).toBe('inside');
  });

  it('accepts a punch well inside the radius', () => {
    const verdict = evaluateGeofence(config(), fix(north(OFFICE, 120)));
    expect(verdict.state).toBe('inside');
  });

  it('refuses a punch outside the radius and says how far', () => {
    const verdict = evaluateGeofence(config(), fix(north(OFFICE, 800)));
    expect(verdict.state).toBe('outside');
    expect(verdict.state === 'outside' && verdict.distance).toBeGreaterThan(790);
  });

  it('treats the radius itself as inside', () => {
    // Exactly on the line is at work, not outside it — the boundary belongs
    // to the area it bounds, or someone standing at the gate is refused.
    const verdict = evaluateGeofence(
      config({ radiusMeters: 500 }),
      fix(north(OFFICE, 500)),
    );
    expect(verdict.state).toBe('inside');
  });

  it('widens and narrows with the configured radius', () => {
    const away = fix(north(OFFICE, 400));
    expect(evaluateGeofence(config({ radiusMeters: 200 }), away).state).toBe(
      'outside',
    );
    expect(evaluateGeofence(config({ radiusMeters: 1000 }), away).state).toBe(
      'inside',
    );
  });
});

describe('distanceFromCentre', () => {
  it('is null with no centre', () => {
    expect(distanceFromCentre(DEFAULT_GEOFENCE, fix())).toBeNull();
  });

  it('is null with no fix', () => {
    expect(distanceFromCentre(config(), null)).toBeNull();
  });

  it('measures even when enforcement is off', () => {
    // The admin screen shows the distance whether or not it is being acted on.
    const distance = distanceFromCentre(
      config({ enforceRadius: false }),
      fix(north(OFFICE, 300)),
    );
    expect(distance).toBeGreaterThan(295);
    expect(distance).toBeLessThan(305);
  });
});

describe('formatting', () => {
  it('writes northern and eastern coordinates with their hemispheres', () => {
    expect(formatCoordinates(12.9716, 77.5946)).toBe(
      '12.971600° N, 77.594600° E',
    );
  });

  it('writes southern and western coordinates without a minus sign', () => {
    expect(formatCoordinates(-33.8688, -70.6693)).toBe(
      '33.868800° S, 70.669300° W',
    );
  });

  it('rounds metres and switches to kilometres above a thousand', () => {
    expect(formatDistance(45.4)).toBe('45 m');
    expect(formatDistance(999)).toBe('999 m');
    expect(formatDistance(1200)).toBe('1.2 km');
    expect(formatDistance(42_000)).toBe('42 km');
  });

  it('prefers an address and falls back to coordinates', () => {
    expect(describeLocation(fix({ address: 'Vidhana Soudha, Bengaluru' }))).toBe(
      'Vidhana Soudha, Bengaluru',
    );
    expect(describeLocation(fix({ address: null }))).toContain('° N');
  });
});

describe('stored config', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(StorageKeys.geofence);
    await AsyncStorage.removeItem(StorageKeys.attendanceLog);
  });

  it('starts with location switched off', async () => {
    const stored = await readGeofence();
    expect(stored.captureLocation).toBe(false);
    expect(stored.enforceRadius).toBe(false);
    expect(stored.latitude).toBeNull();
  });

  it('keeps untouched fields across a partial write', async () => {
    await writeGeofence({ captureLocation: true, radiusMeters: 500 });
    await writeGeofence({ label: 'Head office' });
    const stored = await readGeofence();
    expect(stored.captureLocation).toBe(true);
    expect(stored.radiusMeters).toBe(500);
    expect(stored.label).toBe('Head office');
  });

  it('fills in fields missing from a config an older build wrote', async () => {
    // The stored shape is whatever the version that wrote it knew about.
    // Reading must not hand back a config with holes in it.
    await AsyncStorage.setItem(
      StorageKeys.geofence,
      JSON.stringify({ captureLocation: true }),
    );
    const stored = await readGeofence();
    expect(stored.radiusMeters).toBe(DEFAULT_GEOFENCE.radiusMeters);
    expect(stored.enforceRadius).toBe(false);
  });

  it('dates every write', async () => {
    const saved = await writeGeofence({ captureLocation: true });
    expect(Date.parse(saved.updatedAt!)).not.toBeNaN();
  });
});

describe('a punch carries its place', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(StorageKeys.attendanceLog);
  });

  it('stores the fix and the distance alongside the scan', async () => {
    const saved = await logAttendance({
      personId: 'E-1',
      name: 'Asha',
      score: 0.9,
      location: fix({ address: 'Vidhana Soudha, Bengaluru' }),
      distanceMeters: 42,
    });
    expect(saved.location?.address).toBe('Vidhana Soudha, Bengaluru');
    expect(saved.location?.latitude).toBeCloseTo(OFFICE.latitude, 6);
    expect(saved.distanceMeters).toBe(42);
  });

  it('records a punch made with no fix as having none, not as at zero', async () => {
    // null rather than {0,0}: a missing position must never read as a real
    // one, or a punch with a dead GPS lands off the coast of Africa.
    const saved = await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.9 });
    expect(saved.location).toBeNull();
    expect(saved.distanceMeters).toBeNull();
  });
});

describe('naming a place after the punch', () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem(StorageKeys.attendanceLog);
  });

  it('writes the address onto an already recorded punch', async () => {
    const saved = await logAttendance({
      personId: 'E-1',
      name: 'Asha',
      score: 0.9,
      location: fix(),
    });
    const updated = await attachAddress(saved.recordId, 'Vidhana Soudha');
    expect(updated?.location?.address).toBe('Vidhana Soudha');
    expect(updated?.location?.latitude).toBeCloseTo(OFFICE.latitude, 6);
  });

  it('leaves the coordinates alone when the lookup found nothing', async () => {
    const saved = await logAttendance({
      personId: 'E-1',
      name: 'Asha',
      score: 0.9,
      location: fix(),
    });
    expect(await attachAddress(saved.recordId, null)).toBeUndefined();
    expect(await attachAddress(saved.recordId, '')).toBeUndefined();
  });

  it('does nothing for a punch that has no position to name', async () => {
    const saved = await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.9 });
    expect(await attachAddress(saved.recordId, 'Somewhere')).toBeUndefined();
  });

  it('does nothing when the log was cleared before the lookup returned', async () => {
    // The lookup outlives the punch by design, so the record it was about may
    // simply not be there any more.
    const saved = await logAttendance({
      personId: 'E-1',
      name: 'Asha',
      score: 0.9,
      location: fix(),
    });
    await AsyncStorage.removeItem(StorageKeys.attendanceLog);
    expect(await attachAddress(saved.recordId, 'Somewhere')).toBeUndefined();
  });
});
