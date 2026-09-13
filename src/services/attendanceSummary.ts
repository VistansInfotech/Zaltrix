/**
 * Turning a flat punch log into something a person can read.
 *
 * The log is append-only and newest-first: one row per scan, tagged in or out.
 * That is the right shape for writing and the wrong shape for reading, so this
 * groups a single person's scans into days and pairs their ins with their outs.
 */
import type { AttendanceRecord } from './attendanceStore';

/** One in→out span. Either side can be missing: people forget to punch out. */
export type PunchPair = {
  punchIn?: AttendanceRecord;
  punchOut?: AttendanceRecord;
  /** Milliseconds between the two, when both are present. */
  durationMs?: number;
};

export type AttendanceDay = {
  /** Local day key, from `Date.toDateString()`. */
  key: string;
  /** The day itself, taken from its first scan. */
  date: Date;
  /** That day's scans, oldest first — the order they happened in. */
  records: AttendanceRecord[];
  pairs: PunchPair[];
  /** Total of the completed pairs only; an open span contributes nothing. */
  workedMs: number;
  /** True when the day ends on an unmatched punch in. */
  open: boolean;
};

/**
 * Pairs a single day's scans.
 *
 * An `out` with no preceding `in` is kept as a pair with only an out rather
 * than dropped — it is a real thing that happened, and silently hiding it
 * would make the list disagree with the person's own memory of their day.
 */
export function pairPunches(records: readonly AttendanceRecord[]): PunchPair[] {
  const pairs: PunchPair[] = [];
  let open: PunchPair | undefined;

  for (const record of records) {
    if (record.kind === 'in') {
      // Two ins in a row: the first never got closed, so leave it open.
      open = { punchIn: record };
      pairs.push(open);
      continue;
    }
    if (open) {
      open.punchOut = record;
      open.durationMs = Math.max(
        0,
        new Date(record.at).getTime() - new Date(open.punchIn!.at).getTime(),
      );
      open = undefined;
    } else {
      pairs.push({ punchOut: record });
    }
  }

  return pairs;
}

/**
 * Everything one person did, newest day first, with each day's scans in the
 * order they happened.
 */
export function groupPersonDays(
  log: readonly AttendanceRecord[],
  personId: string,
): AttendanceDay[] {
  const byDay = new Map<string, AttendanceRecord[]>();

  for (const record of log) {
    if (record.personId !== personId) {
      continue;
    }
    const key = new Date(record.at).toDateString();
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(record);
    } else {
      byDay.set(key, [record]);
    }
  }

  const days: AttendanceDay[] = [];
  for (const [key, records] of byDay) {
    // The log arrives newest-first; a day reads naturally oldest-first.
    const chronological = [...records].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
    const pairs = pairPunches(chronological);
    days.push({
      key,
      date: new Date(chronological[0].at),
      records: chronological,
      pairs,
      workedMs: pairs.reduce((sum, p) => sum + (p.durationMs ?? 0), 0),
      open: pairs.some(p => p.punchIn && !p.punchOut),
    });
  }

  return days.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** `7h 20m`, or `45m` under an hour. Blank duration is never rendered. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
