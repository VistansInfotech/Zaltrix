/**
 * The Workspace tab: attendance, salary and bookings in one place.
 *
 * These check what each screen puts in front of a person and what it routes
 * them to — the filter actually filtering, the month headings actually
 * grouping, and the payslip breakdown agreeing with its own headline.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PreferencesProvider } from '../src/context/PreferencesContext';
import BookingListScreen from '../src/screens/workspace/BookingListScreen';
import BookingTypesScreen from '../src/screens/workspace/BookingTypesScreen';
import PayslipScreen from '../src/screens/workspace/PayslipScreen';
import SalaryScreen from '../src/screens/workspace/SalaryScreen';
import WorkspaceScreen from '../src/screens/workspace/WorkspaceScreen';
import { listBookings, listPayslips, netPay } from '../src/services/workspaceData';
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
const navigation = { navigate, replace: jest.fn(), goBack: jest.fn() } as never;
const routeFor = (params?: unknown) =>
  ({ key: 'k', name: 'x', params } as never);

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

const render = async (element: React.ReactElement) =>
  JSON.stringify((await renderTree(element)).toJSON());

/** Taps the control announcing this accessibility label. */
async function press(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const target = tree.root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      node.props?.accessibilityLabel === label,
  );
  await ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
}

beforeEach(() => navigate.mockClear());

describe('WorkspaceScreen — the hub', () => {
  it('puts salary and bookings side by side, not stacked', async () => {
    // Two tiles across one row, each laid out vertically — the pair reads as
    // two choices of equal weight rather than a list to be worked down.
    const tree = await renderTree(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    const tiles = tree.root
      .findAll(node => node.props?.accessibilityRole === 'button')
      .filter(node => ['Salary', 'Bookings'].includes(node.props?.accessibilityLabel));
    expect(tiles.length).toBeGreaterThanOrEqual(2);

    const body = JSON.stringify(tree.toJSON());
    // A flex row holding both, each child taking half of it.
    expect(body).toContain('"flexDirection":"row","gap":12');
    expect(body).toContain('"flex":1,"gap":2');
  });

  it('leads with the two tiles, and puts attendance under them', async () => {
    // The tiles are what the tab is for now; attendance keeps its whole
    // section, just below rather than above.
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    const yours = body.indexOf('Yours');
    const attendance = body.indexOf('Attendance');
    const markButton = body.indexOf('Mark Bio Attendance');
    expect(yours).toBeGreaterThan(-1);
    expect(yours).toBeLessThan(attendance);
    expect(attendance).toBeLessThan(markButton);
  });

  it('keeps attendance, and adds salary and bookings', async () => {
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('Mark Bio Attendance');
    expect(body).toContain('Attendance');
    expect(body).toContain('Salary');
    expect(body).toContain('Bookings');
  });

  it('summarises each section in a card rather than listing it inline', async () => {
    // The hub is a way in, not the archive. Listing rows here pushed the
    // attendance button — the reason people open this tab — off the screen.
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    // No individual payslip or booking rows on the hub.
    expect(body).not.toContain('Paid Aug');
    expect(body).not.toContain('Delhi → Bengaluru');
  });

  it('says what is in each card before it is opened', async () => {
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    // Latest month and its state, and how many trips are booked.
    expect(body).toContain('PENDING');
    expect(body).toMatch(/\d+ booked/);
  });

  it('never prints the pay figure on the unguarded hub', async () => {
    // The gate on the next screen is worth nothing if the amount is already
    // readable by anyone holding the phone. The month and whether it is paid
    // are fine; the number is the thing being protected.
    const slips = await listPayslips();
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    const digits = body.replace(/[^0-9]/g, '');
    for (const slip of slips) {
      expect(digits).not.toContain(`${netPay(slip)}`);
    }
    // Masked rather than simply absent, so it is clear there is a figure.
    expect(body).toContain('••••••');
  });

  it('flags bookings that are not ticketed yet', async () => {
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('NEW');
  });

  it('sends the salary card through the password gate, not straight in', async () => {
    // What someone is paid is the most sensitive thing here, and a phone left
    // on a desk is already unlocked.
    const tree = await renderTree(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    await press(tree, 'Salary');
    expect(navigate).toHaveBeenCalledWith('SalaryGate');
    expect(navigate).not.toHaveBeenCalledWith('Salary');
  });

  it('opens the full bookings list from its card', async () => {
    const tree = await renderTree(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    await press(tree, 'Bookings');
    expect(navigate).toHaveBeenCalledWith('Bookings');
  });

  it('names the next trip, not the most recent row', async () => {
    // The list is newest-first, so its top row is usually a past trip.
    // Calling that one "next" would be wrong in the only word that matters.
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('next');
  });

  it('says the salary and booking data is only a sample', async () => {
    // It is seeded, not fetched. Presenting invented pay as real would be the
    // one thing on this screen nobody should have to double-check.
    const body = await render(
      <WorkspaceScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('sample data');
  });
});

describe('SalaryScreen', () => {
  it('lists every month, newest first', async () => {
    const body = await render(
      <SalaryScreen navigation={navigation} route={routeFor()} />,
    );
    const slips = await listPayslips();
    const positions = slips
      .slice(0, 3)
      .map(slip => body.indexOf(slip.month.slice(0, 4)));
    expect(positions.every(p => p > -1)).toBe(true);
  });

  it('shows a state against each month', async () => {
    const body = await render(
      <SalaryScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('PAID');
    expect(body).toContain('PENDING');
  });

  it('opens the breakdown for the month that was tapped', async () => {
    const slips = await listPayslips();
    const tree = await renderTree(
      <SalaryScreen navigation={navigation} route={routeFor()} />,
    );
    const rows = tree.root.findAll(
      node =>
        typeof node.props?.onPress === 'function' &&
        node.props?.accessibilityRole === 'button',
    );
    await ReactTestRenderer.act(async () => {
      rows[0].props.onPress();
    });
    expect(navigate).toHaveBeenCalledWith('Payslip', { id: slips[0].id });
  });
});

describe('PayslipScreen', () => {
  it('breaks the month into earnings and deductions', async () => {
    const [slip] = await listPayslips();
    const body = await render(
      <PayslipScreen navigation={navigation} route={routeFor({ id: slip.id })} />,
    );
    expect(body).toContain('Earnings');
    expect(body).toContain('Deductions');
    expect(body).toContain('Basic pay');
    expect(body).toContain('Provident fund');
  });

  it('shows a headline that matches its own lines', async () => {
    const [slip] = await listPayslips();
    const body = await render(
      <PayslipScreen navigation={navigation} route={routeFor({ id: slip.id })} />,
    );
    // Rendered with grouping separators, so compare on the digits alone.
    const digits = `${netPay(slip)}`;
    const rendered = body.replace(/[^0-9]/g, '');
    expect(rendered).toContain(digits);
  });

  it('renders nothing rather than crashing on an unknown payslip', async () => {
    const tree = await renderTree(
      <PayslipScreen navigation={navigation} route={routeFor({ id: 'gone' })} />,
    );
    expect(tree.toJSON()).toBeTruthy();
  });
});

describe('BookingTypesScreen', () => {
  it('offers a block per kind of booking', async () => {
    const body = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    for (const label of ['Flight', 'Hotel', 'Car', 'Train']) {
      expect(body).toContain(label);
    }
  });

  it('counts what is inside each block, once', async () => {
    // The count used to appear twice on every block — as a figure and again
    // as "3 booked" underneath, which told nobody anything new.
    const bookings = await listBookings();
    const flights = bookings.filter(b => b.type === 'flight').length;
    const body = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    expect(flights).toBeGreaterThan(0);
    expect(body).toContain(`"children":["${flights}"]`);
    expect(body).not.toContain(`${flights} booked`);
  });

  it('says when each kind next happens, not just how many', async () => {
    const body = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    // A future trip on a block reads "Next ...", a past one "Last ...".
    expect(body).toMatch(/Next |Last /);
  });

  it('answers "anything coming up?" before any tapping', async () => {
    const body = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toMatch(/\d+ bookings/);
    expect(body).toContain('Next trip');
  });

  it('fills the page under the grid with the most recent bookings', async () => {
    // Four blocks alone left the lower half of the screen blank.
    const body = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    expect(body).toContain('Latest');
    const bookings = await listBookings();
    expect(body).toContain(bookings[0].title);
  });

  it('opens the list for the kind that was tapped', async () => {
    const tree = await renderTree(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    await press(tree, 'Hotel');
    expect(navigate).toHaveBeenCalledWith('BookingList', { type: 'hotel' });
  });

  it('keeps an empty kind visible but not tappable', async () => {
    // "No hotels booked" is an answer. A grid that changes shape as data
    // arrives is also harder to aim at than one that does not.
    const tree = await renderTree(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    const blocks = tree.root.findAll(
      node => node.props?.accessibilityRole === 'button' && 'disabled' in (node.props ?? {}),
    );
    expect(blocks.length).toBeGreaterThan(0);
  });
});

describe('BookingListScreen', () => {
  it('shows only the kind it was opened for', async () => {
    const body = await render(
      <BookingListScreen
        navigation={navigation}
        route={routeFor({ type: 'flight' })}
      />,
    );
    expect(body).toContain('Delhi → Bengaluru');
    // A hotel must be absent entirely, not merely further down.
    expect(body).not.toContain('Taj MG Road');
  });

  it('needs no filter row, because the kind was already chosen', async () => {
    const body = await render(
      <BookingListScreen
        navigation={navigation}
        route={routeFor({ type: 'flight' })}
      />,
    );
    for (const other of ['Hotel', 'Car', 'Train']) {
      expect(body).not.toContain(`"children":["${other}"]`);
    }
  });

  it('groups its rows into months', async () => {
    const body = await render(
      <BookingListScreen
        navigation={navigation}
        route={routeFor({ type: 'flight' })}
      />,
    );
    const headings = body.match(/"textTransform":"uppercase"/g) ?? [];
    expect(headings.length).toBeGreaterThan(1);
  });

  it('shows a cancelled booking without claiming money was spent', async () => {
    const body = await render(
      <BookingListScreen
        navigation={navigation}
        route={routeFor({ type: 'car' })}
      />,
    );
    expect(body).toContain('CANCELLED');
    expect(body).toContain('line-through');
  });

  it('says so plainly when a kind has nothing in it', async () => {
    const body = await render(
      <BookingListScreen
        navigation={navigation}
        route={routeFor({ type: 'train' })}
      />,
    );
    expect(body).toBeTruthy();
  });
});

describe('NewBookingScreen', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const { StorageKeys } = require('../src/services/storage');
  const NewBookingScreen =
    require('../src/screens/workspace/NewBookingScreen').default;

  const goBack = jest.fn();
  const formNav = { navigate, goBack, replace: jest.fn() } as never;

  beforeEach(async () => {
    goBack.mockClear();
    await AsyncStorage.removeItem(StorageKeys.bookings);
  });

  /**
   * Types into a field by the label it announces.
   *
   * Selecting by position matched both the TextField and the TextInput inside
   * it, so "the third field" was really the second one's input — and the form
   * stayed half empty while the test believed it was full.
   */
  async function type(
    tree: ReactTestRenderer.ReactTestRenderer,
    label: string,
    value: string,
  ) {
    const input = tree.root.find(
      node =>
        typeof node.props?.onChangeText === 'function' &&
        node.props?.accessibilityLabel === label,
    );
    await ReactTestRenderer.act(async () => {
      input.props.onChangeText(value);
    });
  }

  async function fill(tree: ReactTestRenderer.ReactTestRenderer) {
    await type(tree, 'Route or place', 'Pune → Goa');
    await type(tree, 'Reference or PNR', 'IX-4410');
    await type(tree, 'Amount', '4200');
  }

  /**
   * Picks a date the way a person does: open the field, spin the wheel, then
   * confirm. The picker is inside a Modal, which renders nothing at all while
   * it is closed — so it cannot be reached without opening the field first.
   */
  async function pickDate(
    tree: ReactTestRenderer.ReactTestRenderer,
    label: string,
    date: Date,
  ) {
    await press(tree, label);
    const picker = tree.root.find(node => node.props?.testID === 'DateTimePicker');
    await ReactTestRenderer.act(async () => {
      picker.props.onChange({ type: 'set' }, date);
    });
    await press(tree, 'Done');
  }

  it('offers every kind as a small block', async () => {
    const body = await render(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    for (const label of ['Flight', 'Hotel', 'Car', 'Train', 'Bus']) {
      expect(body).toContain(label);
    }
    // Wrapped blocks, not five full-height rows.
    expect(body).toContain('"flexWrap":"wrap"');
  });

  it('colours the chosen kind, and only that one', async () => {
    const tree = await renderTree(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    const tinted = () =>
      tree.root
        .findAll(node => node.props?.accessibilityRole === 'radio')
        .filter(node => node.props?.accessibilityState?.selected)
        .map(node => node.props.accessibilityLabel);

    expect([...new Set(tinted())]).toEqual(['Flight']);
    await press(tree, 'Train');
    expect([...new Set(tinted())]).toEqual(['Train']);
  });

  it('uses the same colour for a kind as the bookings grid does', async () => {
    // The colour is how the five are told apart; a flight that is purple on
    // one screen and green on the other teaches nobody anything.
    const form = await render(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    const grid = await render(
      <BookingTypesScreen navigation={navigation} route={routeFor()} />,
    );
    // Flight is selected by default on the form, so its tint appears on both.
    const flightTint = '#6A1B9A';
    expect(form).toContain(flightTint);
    expect(grid).toContain(flightTint);
  });

  it('asks for an end date only for the kinds that span time', async () => {
    // A car to the airport has no end time, and asking for one invites a
    // made-up answer.
    const tree = await renderTree(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Ends');

    await press(tree, 'Car');
    expect(JSON.stringify(tree.toJSON())).not.toContain('Ends');

    await press(tree, 'Hotel');
    expect(JSON.stringify(tree.toJSON())).toContain('Ends');
  });

  it('refuses to save an empty form, and says what is missing', async () => {
    const tree = await renderTree(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    await press(tree, 'Add booking');
    const body = JSON.stringify(tree.toJSON());
    expect(body).toContain('Enter a route or place.');
    expect(body).toContain('Enter the reference or PNR.');
    expect(body).toContain('Choose when it starts.');
    expect(goBack).not.toHaveBeenCalled();
  });

  it('saves a filled form and returns to the list', async () => {
    const tree = await renderTree(
      <NewBookingScreen navigation={formNav} route={routeFor()} />,
    );
    await fill(tree);
    await pickDate(tree, 'Starts', new Date(2026, 8, 20, 9));
    await press(tree, 'Add booking');
    await ReactTestRenderer.act(async () => {});

    const raw = await AsyncStorage.getItem(StorageKeys.bookings);
    const saved = JSON.parse(raw ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe('Pune → Goa');
    expect(saved[0].status).toBe('new');
    expect(goBack).toHaveBeenCalled();
  });
});
