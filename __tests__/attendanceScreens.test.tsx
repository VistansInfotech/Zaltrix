/**
 * Render smoke tests for the attendance screens. The native camera, detector,
 * TFLite and sound modules are stubbed in jest.setup.js, so these verify the
 * component trees, theming and translation wiring — not the ML itself.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import AttendanceHomeScreen from '../src/screens/attendance/AttendanceHomeScreen';
import RegisterFaceScreen from '../src/screens/attendance/RegisterFaceScreen';
import { ThemeProvider } from '../src/theme';

// These screens read focus state; outside a NavigationContainer there is none,
// so stand them in as "focused" and run the effect once.
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

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  popTo: jest.fn(),
} as never;

const route = { key: 'k', name: 'x', params: undefined } as never;

function render(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>{element}</PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

function textOf(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

describe('AttendanceHomeScreen', () => {
  it('renders without crashing', () => {
    const tree = render(
      <AttendanceHomeScreen navigation={navigation} route={route} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });

  it('shows both actions and the empty state before anyone is enrolled', () => {
    const body = textOf(
      render(<AttendanceHomeScreen navigation={navigation} route={route} />),
    );
    expect(body).toContain('Mark Bio Attendance');
    expect(body).toContain('Register a face');
    // The home lists people, not raw punches, so the empty state points at
    // the thing that actually unblocks it.
    expect(body).toContain('Register someone to start tracking attendance.');
  });

  it('lists attendance by person rather than as a flat feed', () => {
    const body = textOf(
      render(<AttendanceHomeScreen navigation={navigation} route={route} />),
    );
    expect(body).toContain('Bio Attendance by person');
    // The old feed repeated one name once per punch; it should be gone.
    expect(body).not.toContain('Recent activity');
  });

  it('states the on-device privacy guarantee', () => {
    const body = textOf(
      render(<AttendanceHomeScreen navigation={navigation} route={route} />),
    );
    expect(body).toContain('stay on this device');
    expect(body).toContain('Nothing is uploaded');
  });

  it('does not claim photos are discarded, because they are kept', () => {
    // The roster shows each person's saved face, so the earlier wording was a
    // privacy promise the app does not keep.
    const body = textOf(
      render(<AttendanceHomeScreen navigation={navigation} route={route} />),
    );
    expect(body).not.toContain('discarded');
  });
});

describe('RegisterFaceScreen', () => {
  it('collects the details before opening the camera', () => {
    const body = textOf(
      render(<RegisterFaceScreen navigation={navigation} route={route} />),
    );
    expect(body).toContain('Full name');
    expect(body).toContain('Continue to camera');
  });

  it('does not ask for the password again', () => {
    // Authorisation happens on the gate screen before this form is reached;
    // asking twice for one enrolment is friction with no extra safety.
    const body = textOf(
      render(<RegisterFaceScreen navigation={navigation} route={route} />),
    );
    expect(body).not.toContain('Admin password');
  });

  it('does not carry a second copy of the roster', () => {
    const body = textOf(
      render(<RegisterFaceScreen navigation={navigation} route={route} />),
    );
    // The roster has its own screen; duplicating it here pushed the capture
    // button off-screen and gave two lists to keep in step.
    expect(body).not.toContain('No one registered yet');
  });

  it('exposes both fields as accessible inputs', () => {
    const tree = render(
      <RegisterFaceScreen navigation={navigation} route={route} />,
    );
    const labels = tree.root
      .findAll(n => typeof n.type === 'string' && !!n.props.accessibilityLabel)
      .map(n => n.props.accessibilityLabel);
    expect(labels).toEqual(expect.arrayContaining(['Full name', 'ID']));
  });
});
