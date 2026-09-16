/**
 * Render tests for the location surfaces.
 *
 * The point of interest is what each *role* is shown. An admin gets the
 * controls; a plain user gets the rule they have to follow and where their own
 * last punch happened — and, critically, no way to change either.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import WorkspaceScreen from '../src/screens/workspace/WorkspaceScreen';
import AttendanceHomeScreen from '../src/screens/attendance/AttendanceHomeScreen';
import GeofenceScreen from '../src/screens/attendance/GeofenceScreen';
import { logAttendance } from '../src/services/attendanceStore';
import { writeGeofence } from '../src/services/geofenceStore';
import { StorageKeys } from '../src/services/storage';
import { ThemeProvider } from '../src/theme';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const React = require('react');
    React.useEffect(effect, []);
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigate = jest.fn();
const navigation = {
  navigate,
  replace: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
} as never;

const route = { key: 'k', name: 'x', params: undefined } as never;

const OFFICE = { latitude: 12.9794, longitude: 77.5912 };

/**
 * Renders and then flushes the focus effect's awaits, so assertions see the
 * screen as it looks once the stored config has landed rather than mid-load.
 */
async function renderTree(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>{element}</PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  await ReactTestRenderer.act(async () => {});
  return tree!;
}

async function render(element: React.ReactElement) {
  return JSON.stringify((await renderTree(element)).toJSON());
}

beforeEach(async () => {
  navigate.mockClear();
  await AsyncStorage.removeItem(StorageKeys.geofence);
  await AsyncStorage.removeItem(StorageKeys.attendanceLog);
  await AsyncStorage.removeItem(StorageKeys.enrolledFaces);
});

describe('GeofenceScreen', () => {
  it('offers both switches and the radius choices', async () => {
    const body = await render(<GeofenceScreen navigation={navigation} route={route} />);
    expect(body).toContain('Record where each punch happens');
    expect(body).toContain('Only accept punches inside the radius');
    expect(body).toContain('200 m');
    expect(body).toContain('1.0 km');
  });

  it('asks for a centre before it can enforce anything', async () => {
    await writeGeofence({ captureLocation: true });
    const body = await render(<GeofenceScreen navigation={navigation} route={route} />);
    expect(body).toContain('No centre pinned yet');
    expect(body).toContain('Pin a centre first.');
  });

  it('shows the pinned centre and offers to move it', async () => {
    await writeGeofence({
      captureLocation: true,
      ...OFFICE,
      address: 'Vidhana Soudha, Bengaluru',
    });
    const body = await render(<GeofenceScreen navigation={navigation} route={route} />);
    expect(body).toContain('Vidhana Soudha, Bengaluru');
    expect(body).toContain('12.979400° N, 77.591200° E');
    expect(body).toContain('Re-pin to where I am now');
  });

  it('says what leaves the device, since something now does', async () => {
    const body = await render(<GeofenceScreen navigation={navigation} route={route} />);
    expect(body).toContain('never your name, ID or face');
  });
});

describe('AttendanceHomeScreen — the admin summary', () => {
  it('reports location off by default', async () => {
    const body = await render(
      <AttendanceHomeScreen navigation={navigation} route={route} />,
    );
    expect(body).toContain('punches are not location stamped');
  });

  it('distinguishes stamping from enforcing', async () => {
    await writeGeofence({ captureLocation: true });
    const body = await render(
      <AttendanceHomeScreen navigation={navigation} route={route} />,
    );
    expect(body).toContain('no radius check');
  });

  it('names the place and radius once the fence is armed', async () => {
    await writeGeofence({
      captureLocation: true,
      enforceRadius: true,
      radiusMeters: 500,
      label: 'Head office',
      ...OFFICE,
    });
    const body = await render(
      <AttendanceHomeScreen navigation={navigation} route={route} />,
    );
    expect(body).toContain('within 500 m of Head office');
  });
});

describe('WorkspaceScreen — what a plain user sees', () => {
  it('shows the location card even when the feature is off', async () => {
    // The card is always there; it is the summary that changes. A card that
    // vanishes when the setting is off leaves a person unable to tell
    // "not tracked" from "this build has no such feature".
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).toContain('Location & geofence');
    expect(body).toContain('punches are not location stamped');
  });

  it('reports stamping without a radius check', async () => {
    await writeGeofence({ captureLocation: true });
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).toContain('no radius check');
  });

  it('states the rule before the punch, not after it', async () => {
    await writeGeofence({
      captureLocation: true,
      enforceRadius: true,
      radiusMeters: 200,
      label: 'Head office',
      ...OFFICE,
    });
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).toContain('within 200 m of Head office');
  });

  it('describes the fence in the same words the admin screen uses', async () => {
    const settings = {
      captureLocation: true,
      enforceRadius: true,
      radiusMeters: 500,
      label: 'Head office',
      ...OFFICE,
    };
    await writeGeofence(settings);
    const userSide = await render(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    const adminSide = await render(
      <AttendanceHomeScreen navigation={navigation} route={route} />,
    );
    const sentence = 'within 500 m of Head office';
    expect(userSide).toContain(sentence);
    expect(adminSide).toContain(sentence);
  });

  it('shows where and when the last punch was', async () => {
    await writeGeofence({ captureLocation: true });
    await logAttendance({
      personId: 'E-1',
      name: 'Asha',
      score: 0.92,
      location: { ...OFFICE, accuracy: 8, address: 'Vidhana Soudha, Bengaluru' },
    });
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).toContain('Vidhana Soudha, Bengaluru');
    expect(body).toContain('Punched in at');
  });

  it('says so plainly when a punch has no place on it', async () => {
    // Recording is on but this punch has no fix — an honest gap, not a blank.
    await writeGeofence({ captureLocation: true });
    await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.92 });
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).toContain('Location not recorded');
  });

  it('gives a plain user no way to change the fence', async () => {
    await writeGeofence({ captureLocation: true, enforceRadius: true, ...OFFICE });
    const body = await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(body).not.toContain('Only accept punches inside the radius');
    expect(body).not.toContain('Pin my current location');
    expect(body).not.toContain('Re-pin to where I am now');
  });

  it('makes the card read-only, with nothing to tap through to', async () => {
    // The whole point of the radius check is that the person it applies to
    // cannot switch it off, so the card must not be a route into the settings.
    await writeGeofence({ captureLocation: true, enforceRadius: true, ...OFFICE });
    const tree = await renderTree(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    const routes = tree.root
      .findAll(node => typeof node.props?.onPress === 'function')
      .map(node => node.props.accessibilityLabel);
    expect(routes).not.toContain('Location & geofence');
    expect(navigate).not.toHaveBeenCalledWith('Geofence');
  });
});

/**
 * Asking for location at the right moment, on both platforms.
 *
 * The prompt is the only one the app gets: iOS shows its dialog once per
 * install, and a second refusal on Android means "don't ask again". So these
 * pin down both halves — that it IS asked when the feature is on, and that it
 * is NOT spent on a device where nothing would use the answer.
 */
describe('WorkspaceScreen — location permission', () => {
  const permissions = require('react-native-permissions');

  /**
   * Models the platform, not just the call.
   *
   * A real device answers `check` with whatever the last `request` settled on,
   * which is what makes the second permission check inside a fix short-circuit
   * instead of raising another dialog. A mock that says "denied" forever hides
   * that, and turns one prompt into two.
   */
  function grantOnRequest(outcome: 'granted' | 'denied' | 'blocked') {
    let status = 'denied';
    permissions.check.mockImplementation(() => Promise.resolve(status));
    permissions.request.mockImplementation(() => {
      status = outcome;
      return Promise.resolve(outcome);
    });
  }

  beforeEach(() => {
    permissions.check.mockReset();
    permissions.request.mockReset();
    grantOnRequest('granted');
  });

  it('raises the system prompt on arrival when punches are stamped', async () => {
    await writeGeofence({ captureLocation: true });
    await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(permissions.request).toHaveBeenCalledWith(
      expect.stringMatching(/LOCATION_WHEN_IN_USE|ACCESS_FINE_LOCATION/),
    );
  });

  it('asks on arrival even when stamping is currently switched off', async () => {
    // Asked for up front so the answer is already in hand the morning an
    // admin turns the geofence on.
    await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(permissions.request).toHaveBeenCalledWith(
      expect.stringMatching(/LOCATION_WHEN_IN_USE|ACCESS_FINE_LOCATION/),
    );
  });

  it('raises exactly one dialog, not one per call that needs a fix', async () => {
    // Taking the position re-checks access on its way; once granted that has
    // to be a silent check, or the person is prompted twice on one screen.
    await writeGeofence({ captureLocation: true });
    await render(<WorkspaceScreen navigation={navigation} route={route} />);
    expect(permissions.request).toHaveBeenCalledTimes(1);
  });

  it('stays quiet about a refusal that is blocking nothing', async () => {
    // Stamping is off, so a denied permission stops nothing today. Warning
    // about it here would be a problem the person cannot act on and does
    // not have.
    grantOnRequest('denied');
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    expect(body).not.toContain('Allow location');
    expect(body).not.toContain('Zaltrix needs location access');
  });

  it('explains a refusal and offers to ask again', async () => {
    grantOnRequest('denied');
    await writeGeofence({ captureLocation: true });
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    expect(body).toContain('Zaltrix needs location access');
    expect(body).toContain('Allow location');
  });

  it('sends a blocked permission to system settings, not back to the dialog', async () => {
    // Blocked means the dialog will never appear again however often it is
    // asked, so offering "Allow" there would be a button that does nothing.
    grantOnRequest('blocked');
    await writeGeofence({ captureLocation: true });
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    expect(body).toContain('Open settings');
    expect(body).not.toContain('Allow location');
  });

  it('shows the position once access is granted', async () => {
    grantOnRequest('granted');
    await writeGeofence({ captureLocation: true });
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={route} />,
    );
    // The mocked fix is Bengaluru; with no network the address falls back to
    // coordinates, which is the honest thing to show.
    expect(body).toContain('° N');
    expect(body).not.toContain('Allow location');
  });
});
