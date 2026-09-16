/**
 * Salary and booking records, and the month grouping both lists rely on.
 *
 * The data is static today and comes from an API tomorrow, so what is pinned
 * here is the *shape and arithmetic* rather than the sample values: net pay
 * derived from its own lines, months ordered newest first, and a grouping that
 * survives a December-to-January boundary.
 */
import {
  BOOKING_TYPES,
  findPayslip,
  listBookings,
  listPayslips,
  netPay,
  sumComponents,
  type Payslip,
} from '../src/services/workspaceData';
import {
  formatMoney,
  formatMonthKey,
  groupByMonth,
  monthKeyOf,
} from '../src/utils/format';

describe('payslip arithmetic', () => {
  const slip: Payslip = {
    id: 'x',
    month: '2026-09',
    status: 'paid',
    paidOn: null,
    currency: 'INR',
    earnings: [
      { label: 'basic', amount: 45_000 },
      { label: 'hra', amount: 18_000 },
    ],
    deductions: [{ label: 'tax', amount: 4_800 }],
  };

  it('sums a side', () => {
    expect(sumComponents(slip.earnings)).toBe(63_000);
    expect(sumComponents([])).toBe(0);
  });

  it('derives net from the lines rather than storing it', () => {
    // The one thing that makes a payslip worthless is a headline figure that
    // disagrees with its own breakdown, so net is never a stored field.
    expect(netPay(slip)).toBe(58_200);
  });

  it('handles a payslip with no deductions', () => {
    expect(netPay({ ...slip, deductions: [] })).toBe(63_000);
  });
});

describe('listPayslips', () => {
  it('returns the newest month first', async () => {
    const slips = await listPayslips();
    const months = slips.map(slip => slip.month);
    expect([...months].sort().reverse()).toEqual(months);
  });

  it('gives every payslip a month, a currency and both sides', async () => {
    for (const slip of await listPayslips()) {
      expect(slip.month).toMatch(/^\d{4}-\d{2}$/);
      expect(slip.currency).toBeTruthy();
      expect(slip.earnings.length).toBeGreaterThan(0);
      expect(netPay(slip)).toBeGreaterThan(0);
    }
  });

  it('marks a paid slip with the date it landed, and a pending one with none', async () => {
    for (const slip of await listPayslips()) {
      if (slip.status === 'paid') {
        expect(slip.paidOn).not.toBeNull();
      } else {
        expect(slip.paidOn).toBeNull();
      }
    }
  });

  it('finds one by id, and nothing for an unknown id', async () => {
    const [first] = await listPayslips();
    expect((await findPayslip(first.id))?.month).toBe(first.month);
    expect(await findPayslip('nope')).toBeUndefined();
  });
});

describe('listBookings', () => {
  it('returns the newest first', async () => {
    const bookings = await listBookings();
    const times = bookings.map(b => new Date(b.startsAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('only uses types the filter row can offer', async () => {
    // A booking of a type with no chip would be unreachable behind any filter
    // but All, and invisible to someone who had tapped one.
    for (const booking of await listBookings()) {
      expect(BOOKING_TYPES).toContain(booking.type);
    }
  });

  it('gives a stay an end and a car transfer none', async () => {
    // A hotel night and a train journey both finish; a car to the airport is
    // one moment, and inventing an end time for it would be a fiction.
    const bookings = await listBookings();
    expect(bookings.some(b => b.type === 'hotel' && b.endsAt !== null)).toBe(true);
    expect(bookings.some(b => b.type === 'car' && b.endsAt === null)).toBe(true);
  });

  it('covers every type, so each filter has something to show', async () => {
    const present = new Set((await listBookings()).map(b => b.type));
    expect([...BOOKING_TYPES].every(type => present.has(type))).toBe(true);
  });

  it('spans more than one month, so the grouping is visible', async () => {
    const months = new Set(
      (await listBookings()).map(b => monthKeyOf(new Date(b.startsAt))),
    );
    expect(months.size).toBeGreaterThan(1);
  });
});

describe('groupByMonth', () => {
  const at = (iso: string) => ({ when: new Date(iso) });

  it('buckets by calendar month, newest month first', () => {
    const groups = groupByMonth(
      [at('2026-08-14T10:00:00'), at('2026-09-02T10:00:00'), at('2026-09-20T10:00:00')],
      item => item.when,
    );
    expect(groups.map(g => g.key)).toEqual(['2026-09', '2026-08']);
    expect(groups[0].items).toHaveLength(2);
  });

  it('keeps each month in the order it was given', () => {
    const groups = groupByMonth(
      [at('2026-09-20T10:00:00'), at('2026-09-02T10:00:00')],
      item => item.when,
    );
    expect(groups[0].items[0].when.getDate()).toBe(20);
  });

  it('orders across a year boundary, where a month number alone would not', () => {
    // '2025-12' vs '2026-01': sorting on the month alone puts December first.
    const groups = groupByMonth(
      [at('2025-12-31T10:00:00'), at('2026-01-01T10:00:00')],
      item => item.when,
    );
    expect(groups.map(g => g.key)).toEqual(['2026-01', '2025-12']);
  });

  it('returns nothing for nothing', () => {
    expect(groupByMonth([], (item: { when: Date }) => item.when)).toEqual([]);
  });
});

describe('monthKeyOf', () => {
  it('pads the month and uses local time', () => {
    expect(monthKeyOf(new Date(2026, 0, 5))).toBe('2026-01');
    expect(monthKeyOf(new Date(2026, 11, 31))).toBe('2026-12');
  });

  it('agrees with formatMonthKey about which month it is', () => {
    const key = monthKeyOf(new Date(2026, 8, 14));
    expect(formatMonthKey(key, 'en-US')).toContain('September');
    expect(formatMonthKey(key, 'en-US')).toContain('2026');
  });

  it('leaves a malformed key alone rather than inventing a month', () => {
    expect(formatMonthKey('not-a-month', 'en-US')).toBe('not-a-month');
  });
});

describe('formatMoney', () => {
  it('renders the currency the record carries', () => {
    // A trip paid for in dollars must not render with a rupee sign.
    expect(formatMoney(1000, 'INR', 'en-IN')).toContain('1,000');
    expect(formatMoney(1000, 'USD', 'en-US')).toContain('$');
  });

  it('falls back readably on a currency code it cannot format', () => {
    expect(formatMoney(1500, 'XYZ', 'en-US')).toContain('XYZ');
  });
});

describe('createBooking', () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const { StorageKeys } = require('../src/services/storage');
  const { createBooking } = require('../src/services/workspaceData');

  beforeEach(async () => {
    await AsyncStorage.removeItem(StorageKeys.bookings);
  });

  const input = {
    type: 'flight' as const,
    title: '  Pune → Goa  ',
    reference: ' IX-4410 ',
    startsAt: new Date(2026, 8, 20, 9).toISOString(),
    endsAt: null,
    amount: 4200,
  };

  it('saves a booking and hands it back', async () => {
    const saved = await createBooking(input);
    expect(saved.title).toBe('Pune → Goa');
    expect(saved.reference).toBe('IX-4410');
    expect(saved.amount).toBe(4200);
  });

  it('always marks a hand-raised booking as new', async () => {
    // The app has not spoken to any supplier, so it cannot call one confirmed.
    const saved = await createBooking(input);
    expect(saved.status).toBe('new');
  });

  it('gives each booking its own id', async () => {
    const a = await createBooking(input);
    const b = await createBooking(input);
    expect(a.id).not.toBe(b.id);
  });

  it('shows up in the list, ordered with the rest', async () => {
    const before = await listBookings();
    await createBooking(input);
    const after = await listBookings();
    expect(after.length).toBe(before.length + 1);

    const times = after.map(b => new Date(b.startsAt).getTime());
    expect([...times].sort((x, y) => y - x)).toEqual(times);
  });

  it('survives a reload, because it is stored rather than held in memory', async () => {
    await createBooking(input);
    const raw = await AsyncStorage.getItem(StorageKeys.bookings);
    expect(JSON.parse(raw)).toHaveLength(1);
  });

  it('leaves the sample data alone', async () => {
    // The seed is deleted the day a real endpoint arrives; a person's own
    // entries must not go with it.
    const seeded = (await listBookings()).length;
    await createBooking(input);
    await AsyncStorage.removeItem(StorageKeys.bookings);
    expect((await listBookings()).length).toBe(seeded);
  });
});
