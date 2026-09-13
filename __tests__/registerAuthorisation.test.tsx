/**
 * Authorising an enrolment.
 *
 * The admin password is asked before the enrolment form is shown at all, so
 * this screen is a security boundary: whoever gets past it can enrol a face
 * that then marks attendance as that person. These tests care most about the
 * ways it must *not* let through.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import RegisterGateScreen from '../src/screens/attendance/RegisterGateScreen';
import { ThemeProvider } from '../src/theme';

const mockVerifyPassword = jest.fn();
const mockPromptBiometric = jest.fn();
let mockAuth: { user: unknown; security: { biometricEnabled: boolean } };

jest.mock('../src/services/secureStore', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

jest.mock('../src/services/biometricService', () => ({
  getBiometricCapability: async () => ({
    available: true,
    kind: 'FaceID',
    labelKey: 'faceId',
  }),
  promptBiometric: (...args: unknown[]) => mockPromptBiometric(...args),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

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

const replace = jest.fn();
const navigation = { replace, navigate: jest.fn(), goBack: jest.fn() } as never;
const route = { key: 'k', name: 'RegisterGate', params: undefined } as never;

async function renderForm() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>
            <RegisterGateScreen navigation={navigation} route={route} />
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

const text = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

/** Types into a labelled field. */
async function type(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  const field = tree.root.findAll(
    n =>
      typeof n.type === 'string' &&
      String(n.type) === 'TextInput' &&
      n.props.accessibilityLabel === label,
  )[0];
  await ReactTestRenderer.act(async () => {
    field.props.onChangeText(value);
  });
}

async function pressButton(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const node = tree.root.findAll(
    n =>
      n.props?.accessibilityRole === 'button' &&
      String(n.props?.accessibilityLabel ?? '') === label,
  )[0];
  await ReactTestRenderer.act(async () => {
    node.props.onPress();
  });
}

/** Passing the gate replaces it with the enrolment form. */
const letThrough = () => replace.mock.calls.length > 0;

beforeEach(() => {
  replace.mockClear();
  mockVerifyPassword.mockReset();
  mockPromptBiometric.mockReset();
  mockAuth = {
    user: { id: 'u1', email: 'admin@example.com', name: 'Admin' },
    security: { biometricEnabled: true },
  };
});

describe('enrolment authorisation', () => {
  it('opens the enrolment form when the password is right', async () => {
    mockVerifyPassword.mockResolvedValue(true);
    const tree = await renderForm();
    await type(tree, 'Admin password', 'correct horse');
    await pressButton(tree, 'Confirm and continue');

    expect(mockVerifyPassword).toHaveBeenCalledWith(
      'admin@example.com',
      'correct horse',
    );
    expect(letThrough()).toBe(true);
  });

  it('refuses a wrong password', async () => {
    mockVerifyPassword.mockResolvedValue(false);
    const tree = await renderForm();
    await type(tree, 'Admin password', 'guess');
    await pressButton(tree, 'Confirm and continue');

    expect(letThrough()).toBe(false);
    expect(text(tree)).toContain('not correct');
  });

  it('clears the password after a failure', async () => {
    mockVerifyPassword.mockResolvedValue(false);
    const tree = await renderForm();
    await type(tree, 'Admin password', 'guess');
    await pressButton(tree, 'Confirm and continue');

    const field = tree.root.findAll(
      n =>
        typeof n.type === 'string' &&
        String(n.type) === 'TextInput' &&
        n.props.accessibilityLabel === 'Admin password',
    )[0];
    expect(field.props.value).toBe('');
  });

  it('does not check an empty password', async () => {
    const tree = await renderForm();
    await pressButton(tree, 'Confirm and continue');

    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(letThrough()).toBe(false);
  });

  it('will not authorise with no signed-in account', async () => {
    mockAuth = { user: null, security: { biometricEnabled: false } };
    const tree = await renderForm();
    await type(tree, 'Admin password', 'anything');
    await pressButton(tree, 'Confirm and continue');

    expect(mockVerifyPassword).not.toHaveBeenCalled();
    expect(letThrough()).toBe(false);
  });

  it('accepts a biometric check instead of the password', async () => {
    mockPromptBiometric.mockResolvedValue({ status: 'success' });
    const tree = await renderForm();
    await pressButton(tree, 'Use Face ID instead');

    expect(letThrough()).toBe(true);
  });

  it('stays shut when the biometric check is cancelled', async () => {
    mockPromptBiometric.mockResolvedValue({ status: 'cancelled' });
    const tree = await renderForm();
    await pressButton(tree, 'Use Face ID instead');

    expect(letThrough()).toBe(false);
  });
});
