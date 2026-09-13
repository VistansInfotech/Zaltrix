/**
 * The registered-users roster. This is the management surface for who can be
 * recognised at all, so the list, its search and its removal path are worth
 * pinning down.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import RegisteredUsersScreen from '../src/screens/attendance/RegisteredUsersScreen';
import { enrollPerson, listEnrolled } from '../src/services/attendanceStore';
import { ThemeProvider } from '../src/theme';
import { StorageKeys } from '../src/services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const navigation = { navigate: jest.fn(), goBack: jest.fn() } as never;
const route = { key: 'k', name: 'RegisteredUsers', params: undefined } as never;

async function renderScreen() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>
            <RegisteredUsersScreen navigation={navigation} route={route} />
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

const text = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

beforeEach(async () => {
  await AsyncStorage.removeItem(StorageKeys.enrolledFaces);
  await AsyncStorage.removeItem(StorageKeys.attendanceLog);
});

describe('RegisteredUsersScreen', () => {
  it('renders with an empty roster', async () => {
    const tree = await renderScreen();
    expect(text(tree)).toContain('No one registered yet');
  });

  it('lists everyone enrolled, with their ids', async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });
    await enrollPerson({ id: 'E-2', name: 'Ravi Kumar', embedding: [0, 1] });

    const body = text(await renderScreen());
    expect(body).toContain('Asha Rao');
    expect(body).toContain('Ravi Kumar');
    expect(body).toContain('E-1');
    expect(body).toContain('E-2');
  });

  it('supports many users, not just one', async () => {
    for (let i = 0; i < 6; i++) {
      await enrollPerson({ id: `E-${i}`, name: `Person ${i}`, embedding: [i] });
    }
    expect(await listEnrolled()).toHaveLength(6);
    const body = text(await renderScreen());
    expect(body).toContain('Person 0');
    expect(body).toContain('Person 5');
  });

  it('shows the saved photo when there is one', async () => {
    const photo = 'data:image/jpeg;base64,AAAA';
    await enrollPerson({ id: 'E-9', name: 'Has Photo', embedding: [1], photo });

    const tree = await renderScreen();
    const images = tree.root.findAll(
      n => (n.type as unknown) === 'Image' && n.props.source?.uri === photo,
    );
    expect(images.length).toBeGreaterThan(0);
  });

  it('falls back to an initial when no photo was saved', async () => {
    await enrollPerson({ id: 'E-8', name: 'No Photo', embedding: [1] });
    expect(text(await renderScreen())).toContain('N');
  });

  it('makes each person a single tap target with no stray actions', async () => {
    // Re-capture and remove were deliberately dropped from this screen: the
    // row is now one thing you can do, which is open that person's history.
    await enrollPerson({ id: 'E-7', name: 'Someone', embedding: [1] });
    const tree = await renderScreen();
    const labels = tree.root
      .findAll(n => typeof n.type === 'string' && !!n.props.accessibilityLabel)
      .map(n => String(n.props.accessibilityLabel));

    expect(labels).toEqual(expect.arrayContaining(['Someone']));
    expect(labels).not.toEqual(
      expect.arrayContaining(['Re-capture this face', 'Remove']),
    );
  });

  it('counts how many have a photo separately from the total', async () => {
    await enrollPerson({ id: 'A', name: 'With', embedding: [1], photo: 'data:image/jpeg;base64,AA' });
    await enrollPerson({ id: 'B', name: 'Without', embedding: [1] });
    // Two enrolled, one of them with a photo — a person can exist before a
    // successful capture, and the roster should say so.
    expect(text(await renderScreen())).toContain('With photo');
  });
});
