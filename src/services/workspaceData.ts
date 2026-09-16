import { readJSON, StorageKeys, writeJSON } from './storage';

/**
 * Salary and booking records for the Workspace tab.
 *
 * Static today, an API tomorrow. Every reader goes through the async functions
 * at the bottom rather than touching the arrays, so the swap is confined to
 * those bodies: the screens already await, already render a loading pass, and
 * already cope with an empty result. A synchronous export would have made all
 * three someone else's problem later.
 *
 * The seed is dated relative to today rather than pinned to fixed dates, so
 * the month grouping keeps demonstrating itself instead of drifting into one
 * stale heap a few months from now.
 */

/* --------------------------------- salary -------------------------------- */

export type PayslipStatus = 'paid' | 'pending' | 'processing';

/** One line of a payslip — an earning or a deduction. */
export type PayComponent = {
  label: string;
  amount: number;
};

export type Payslip = {
  id: string;
  /** `YYYY-MM`. A payslip belongs to a month, not to a day. */
  month: string;
  status: PayslipStatus;
  /** ISO date the money landed, when it has. */
  paidOn: string | null;
  currency: string;
  earnings: PayComponent[];
  deductions: PayComponent[];
};

export const sumComponents = (components: readonly PayComponent[]): number =>
  components.reduce((total, line) => total + line.amount, 0);

/** Gross minus deductions. Derived, never stored — the two cannot disagree. */
export function netPay(slip: Payslip): number {
  return sumComponents(slip.earnings) - sumComponents(slip.deductions);
}

/* -------------------------------- bookings -------------------------------- */

export type BookingType = 'flight' | 'hotel' | 'car' | 'train' | 'bus';

/**
 * `new` is raised but not yet ticketed, `confirmed` is ticketed, `completed`
 * is travelled, `cancelled` is kept rather than deleted — a cancelled trip is
 * a thing that happened to somebody's month.
 */
export type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  type: BookingType;
  status: BookingStatus;
  /** The headline: a route for travel, a property for a stay. */
  title: string;
  /** Reference or PNR, as the provider gave it. */
  reference: string;
  /** ISO timestamp the booking starts — what it is grouped and sorted by. */
  startsAt: string;
  /** ISO timestamp it ends. Null for anything instantaneous, like a cab. */
  endsAt: string | null;
  amount: number;
  currency: string;
};

export const BOOKING_TYPES: readonly BookingType[] = [
  'flight',
  'hotel',
  'car',
  'train',
  'bus',
] as const;

/* ---------------------------------- seed ---------------------------------- */

const CURRENCY = 'INR';

/** Start of a month, `offset` months back from this one. */
function monthKey(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
}

/** A date `daysAgo` before now, at a fixed hour so rows sort predictably. */
function daysAgo(days: number, hour = 9): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** Last day of the month `offset` months back — payday. */
function endOfMonth(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset + 1);
  date.setDate(0);
  date.setHours(18, 0, 0, 0);
  return date.toISOString();
}

function payslip(
  offset: number,
  basic: number,
  status: PayslipStatus,
): Payslip {
  return {
    id: `slip-${monthKey(offset)}`,
    month: monthKey(offset),
    status,
    paidOn: status === 'paid' ? endOfMonth(offset) : null,
    currency: CURRENCY,
    earnings: [
      { label: 'basic', amount: basic },
      { label: 'hra', amount: Math.round(basic * 0.4) },
      { label: 'allowance', amount: 6_000 },
    ],
    deductions: [
      { label: 'providentFund', amount: Math.round(basic * 0.12) },
      { label: 'tax', amount: 4_800 },
    ],
  };
}

// The current month is still pending, which is the ordinary state of a payslip
// for most of the month it belongs to.
const PAYSLIPS: Payslip[] = [
  payslip(0, 45_000, 'pending'),
  payslip(1, 45_000, 'paid'),
  payslip(2, 45_000, 'paid'),
  payslip(3, 42_000, 'paid'),
  payslip(4, 42_000, 'paid'),
  payslip(5, 42_000, 'paid'),
];

const BOOKINGS: Booking[] = [
  {
    id: 'bk-1',
    type: 'flight',
    status: 'confirmed',
    title: 'Delhi → Bengaluru',
    reference: 'AI-2841',
    startsAt: daysAgo(-6, 7),
    endsAt: daysAgo(-6, 10),
    amount: 8_450,
    currency: CURRENCY,
  },
  {
    id: 'bk-2',
    type: 'hotel',
    status: 'confirmed',
    title: 'Taj MG Road, Bengaluru',
    reference: 'TJ-99120',
    startsAt: daysAgo(-6, 14),
    endsAt: daysAgo(-8, 11),
    amount: 14_200,
    currency: CURRENCY,
  },
  {
    id: 'bk-3',
    type: 'car',
    status: 'new',
    title: 'Airport → Office',
    reference: 'CR-5512',
    startsAt: daysAgo(-6, 11),
    endsAt: null,
    amount: 780,
    currency: CURRENCY,
  },
  {
    id: 'bk-4',
    type: 'train',
    status: 'new',
    title: 'Bengaluru → Mysuru',
    reference: 'TR-12658',
    startsAt: daysAgo(-12, 8),
    endsAt: daysAgo(-12, 11),
    amount: 640,
    currency: CURRENCY,
  },
  {
    id: 'bk-5',
    type: 'flight',
    status: 'completed',
    title: 'Mumbai → Pune',
    reference: 'IX-1174',
    startsAt: daysAgo(20, 6),
    endsAt: daysAgo(20, 8),
    amount: 5_100,
    currency: CURRENCY,
  },
  {
    id: 'bk-6',
    type: 'hotel',
    status: 'completed',
    title: 'Novotel, Pune',
    reference: 'NV-7781',
    startsAt: daysAgo(20, 15),
    endsAt: daysAgo(18, 11),
    amount: 9_300,
    currency: CURRENCY,
  },
  {
    id: 'bk-7',
    type: 'car',
    status: 'cancelled',
    title: 'Hotel → Airport',
    reference: 'CR-5098',
    startsAt: daysAgo(18, 12),
    endsAt: null,
    amount: 0,
    currency: CURRENCY,
  },
  {
    id: 'bk-10',
    type: 'bus',
    status: 'completed',
    title: 'Pune → Nashik',
    reference: 'BS-4417',
    startsAt: daysAgo(33, 7),
    endsAt: daysAgo(33, 12),
    amount: 480,
    currency: CURRENCY,
  },
  {
    id: 'bk-8',
    type: 'flight',
    status: 'completed',
    title: 'Bengaluru → Hyderabad',
    reference: 'AI-1902',
    startsAt: daysAgo(48, 7),
    endsAt: daysAgo(48, 9),
    amount: 6_700,
    currency: CURRENCY,
  },
  {
    id: 'bk-9',
    type: 'train',
    status: 'completed',
    title: 'Hyderabad → Warangal',
    reference: 'TR-17230',
    startsAt: daysAgo(46, 7),
    endsAt: daysAgo(46, 10),
    amount: 520,
    currency: CURRENCY,
  },
];

/* --------------------------------- access --------------------------------- */

/**
 * Bookings raised in the app, kept apart from the seed.
 *
 * Merged on read rather than written into one list: the seed is sample data
 * that will be deleted the day a real endpoint arrives, and mixing the two
 * would take a person's own entries with it.
 */
async function storedBookings(): Promise<Booking[]> {
  return readJSON<Booking[]>(StorageKeys.bookings, []);
}

/** What a person fills in; everything else is decided here. */
export type NewBooking = {
  type: BookingType;
  title: string;
  reference: string;
  startsAt: string;
  endsAt: string | null;
  amount: number;
  currency?: string;
};

/**
 * Saves a booking and hands back the stored record.
 *
 * Always `new`: a booking raised from the app has been asked for, not
 * ticketed, and marking it confirmed would be the app vouching for a supplier
 * it has never spoken to.
 */
export async function createBooking(input: NewBooking): Promise<Booking> {
  const booking: Booking = {
    id: `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    status: 'new',
    title: input.title.trim(),
    reference: input.reference.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    amount: input.amount,
    currency: input.currency ?? CURRENCY,
  };
  const existing = await storedBookings();
  await writeJSON(StorageKeys.bookings, [booking, ...existing]);
  return booking;
}

/**
 * Async from the start, even though nothing is fetched yet — the signature is
 * the part that has to survive the move to a real endpoint, and a screen
 * written against a synchronous read would have to be rewritten rather than
 * repointed.
 */
export async function listPayslips(): Promise<Payslip[]> {
  // Newest month first.
  return [...PAYSLIPS].sort((a, b) => b.month.localeCompare(a.month));
}

export async function findPayslip(id: string): Promise<Payslip | undefined> {
  return PAYSLIPS.find(slip => slip.id === id);
}

export async function listBookings(): Promise<Booking[]> {
  const mine = await storedBookings();
  // Newest first, matching every other list in the app.
  return [...mine, ...BOOKINGS].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );
}
