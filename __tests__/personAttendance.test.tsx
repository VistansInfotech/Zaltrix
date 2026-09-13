/**
 * One person's punch history screen. The grouping logic is covered in
 * attendanceSummary.test.ts; this pins that the screen actually renders it —
 * real times, real totals, and a sane empty state.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import PersonAttendanceScreen from '../src/screens/attendance/PersonAttendanceScreen';
import { enrollPerson, type AttendanceRecord } from '../src/services/attendanceStore';
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

const navigation = { navigate: jest.fn(), goBack: jest.fn() } as never;

async function renderScreen(personId: string) {
  const route = {
    key: 'k',
    name: 'PersonAttendance',
    params: { personId },
  } as never;

  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>
            <PersonAttendanceScreen navigation={navigation} route={route} />
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return tree!;
}

const text = (tree: ReactTestRenderer.ReactTestRenderer) =>
  JSON.stringify(tree.toJSON());

/** Today at a given hour, so "Today" grouping is exercised. */
function todayAt(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function record(kind: 'in' | 'out', at: string, personId = 'E-1'): AttendanceRecord {
  return {
    recordId: `${kind}-${at}`,
    personId,
    name: 'Asha Rao',
    at,
    score: 0.91,
    kind,
  };
}

beforeEach(async () => {
  await AsyncStorage.removeItem(StorageKeys.enrolledFaces);
  await AsyncStorage.removeItem(StorageKeys.attendanceLog);
});

describe('PersonAttendanceScreen', () => {
  it('shows the person and an empty state before any scans', async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });

    const body = text(await renderScreen('E-1'));
    expect(body).toContain('Asha Rao');
    expect(body).toContain('No attendance recorded yet');
  });

  it('shows punch in and punch out times for a completed day', async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });
    await AsyncStorage.setItem(
      StorageKeys.attendanceLog,
      JSON.stringify([record('out', todayAt(17)), record('in', todayAt(9))]),
    );

    const body = text(await renderScreen('E-1'));
    expect(body).toContain('Today');
    // Both ends of the shift, and the total between them.
    expect(body).toContain('In ·');
    expect(body).toContain('Out ·');
    expect(body).toContain('8h 0m');
  });

  it('marks a day still open when the person has not punched out', async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });
    await AsyncStorage.setItem(
      StorageKeys.attendanceLog,
      JSON.stringify([record('in', todayAt(9))]),
    );

    const body = text(await renderScreen('E-1'));
    expect(body).toContain('Still punched in');
    // No invented total for a shift that has not ended.
    expect(body).not.toContain('0h 0m');
  });

  it('shows only this person, not everyone else', async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });
    await enrollPerson({ id: 'E-2', name: 'Ravi Kumar', embedding: [0, 1] });
    await AsyncStorage.setItem(
      StorageKeys.attendanceLog,
      JSON.stringify([
        record('in', todayAt(9), 'E-1'),
        { ...record('in', todayAt(10), 'E-2'), name: 'Ravi Kumar' },
      ]),
    );

    const body = text(await renderScreen('E-1'));
    expect(body).toContain('Asha Rao');
    expect(body).not.toContain('Ravi Kumar');
  });

  it('renders even if the person was removed from the roster', async () => {
    // The log outlives enrolment; the screen must not blank out on a stale id.
    await AsyncStorage.setItem(
      StorageKeys.attendanceLog,
      JSON.stringify([record('in', todayAt(9))]),
    );

    const body = text(await renderScreen('E-1'));
    expect(body).toContain('E-1');
  });
});

/** Presses a button by its accessibility label. */
async function press(
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

/** A date offset from today, at a fixed hour. */
function daysAgo(days: number, hours = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

describe('PersonAttendanceScreen day picker', () => {
  beforeEach(async () => {
    await enrollPerson({ id: 'E-1', name: 'Asha Rao', embedding: [1, 0] });
    await AsyncStorage.setItem(
      StorageKeys.attendanceLog,
      JSON.stringify([
        record('out', todayAt(17)),
        record('in', todayAt(9)),
        record('out', daysAgo(1, 18)),
        record('in', daysAgo(1, 10)),
      ]),
    );
  });

  it('shows every day at once by default', async () => {
    const body = text(await renderScreen('E-1'));
    expect(body).toContain('All days');
    expect(body).toContain('Today');
    expect(body).toContain('Yesterday');
  });

  it('narrows to a single day once one is picked', async () => {
    const tree = await renderScreen('E-1');
    await press(tree, 'Pick a day');

    const body = text(tree);
    expect(body).toContain('Today');
    expect(body).not.toContain('Yesterday');
  });

  it('steps back to the previous day', async () => {
    const tree = await renderScreen('E-1');
    await press(tree, 'Previous day');

    const body = text(tree);
    expect(body).toContain('Yesterday');
    // 8 hours yesterday, not today's 8h — only one day is in view.
    expect(body).not.toContain('Today');
  });

  it('says so when a chosen day has nothing on it', async () => {
    const tree = await renderScreen('E-1');
    await press(tree, 'Previous day');
    await press(tree, 'Previous day');
    await press(tree, 'Previous day');

    expect(text(tree)).toContain('Nothing recorded on');
  });

  it('never steps into the future', async () => {
    const tree = await renderScreen('E-1');
    await press(tree, 'Previous day');
    for (let i = 0; i < 5; i++) {
      await press(tree, 'Next day');
    }

    // Clamped at today rather than wandering into empty future dates.
    expect(text(tree)).toContain('Today');
  });

  it('returns to the full history', async () => {
    const tree = await renderScreen('E-1');
    await press(tree, 'Pick a day');
    await press(tree, 'All days');

    const body = text(tree);
    expect(body).toContain('Today');
    expect(body).toContain('Yesterday');
  });
});
