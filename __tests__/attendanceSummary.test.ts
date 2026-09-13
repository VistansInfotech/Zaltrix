/**
 * Reading a punch log back as days and shifts.
 *
 * The log is append-only and newest-first, and people forget to punch out, so
 * the interesting cases here are all the untidy ones: unmatched punches, two
 * ins in a row, and scans that straddle midnight.
 */
import {
  formatDuration,
  groupPersonDays,
  pairPunches,
} from '../src/services/attendanceSummary';
import type { AttendanceRecord } from '../src/services/attendanceStore';

let seq = 0;
function punch(
  kind: 'in' | 'out',
  at: string,
  personId = 'p1',
): AttendanceRecord {
  seq += 1;
  return {
    recordId: `r${seq}`,
    personId,
    name: personId === 'p1' ? 'Vivek' : 'Someone else',
    at: new Date(at).toISOString(),
    score: 0.9,
    kind,
  };
}

describe('pairPunches', () => {
  it('pairs an in with the out that follows it', () => {
    const pairs = pairPunches([
      punch('in', '2026-09-13T09:00:00'),
      punch('out', '2026-09-13T17:30:00'),
    ]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].durationMs).toBe(8.5 * 3600_000);
  });

  it('leaves a shift open when someone never punches out', () => {
    const pairs = pairPunches([punch('in', '2026-09-13T09:00:00')]);

    expect(pairs[0].punchOut).toBeUndefined();
    // No duration invented for a shift that has not ended.
    expect(pairs[0].durationMs).toBeUndefined();
  });

  it('treats a second in as a new shift, not a correction', () => {
    const pairs = pairPunches([
      punch('in', '2026-09-13T09:00:00'),
      punch('in', '2026-09-13T13:00:00'),
      punch('out', '2026-09-13T17:00:00'),
    ]);

    expect(pairs).toHaveLength(2);
    expect(pairs[0].punchOut).toBeUndefined();
    expect(pairs[1].durationMs).toBe(4 * 3600_000);
  });

  it('keeps an out that has no in rather than dropping it', () => {
    // It really happened; hiding it would contradict the person's own memory.
    const pairs = pairPunches([punch('out', '2026-09-13T17:00:00')]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0].punchIn).toBeUndefined();
    expect(pairs[0].punchOut).toBeDefined();
  });

  it('handles a lunch break as two shifts', () => {
    const pairs = pairPunches([
      punch('in', '2026-09-13T09:00:00'),
      punch('out', '2026-09-13T12:00:00'),
      punch('in', '2026-09-13T13:00:00'),
      punch('out', '2026-09-13T17:00:00'),
    ]);

    expect(pairs.map(p => p.durationMs)).toEqual([3 * 3600_000, 4 * 3600_000]);
  });

  it('never reports a negative span if timestamps go backwards', () => {
    const pairs = pairPunches([
      punch('in', '2026-09-13T17:00:00'),
      punch('out', '2026-09-13T09:00:00'),
    ]);

    expect(pairs[0].durationMs).toBe(0);
  });
});

describe('groupPersonDays', () => {
  const log = [
    // Newest first, the order the store keeps.
    punch('out', '2026-09-13T17:00:00'),
    punch('in', '2026-09-13T09:00:00'),
    punch('out', '2026-09-12T18:00:00'),
    punch('in', '2026-09-12T10:00:00'),
  ];

  it('returns the newest day first', () => {
    const days = groupPersonDays(log, 'p1');

    expect(days).toHaveLength(2);
    expect(days[0].date.getDate()).toBe(13);
    expect(days[1].date.getDate()).toBe(12);
  });

  it('orders each day oldest first, as the day was lived', () => {
    const [today] = groupPersonDays(log, 'p1');

    expect(today.records.map(r => r.kind)).toEqual(['in', 'out']);
  });

  it('totals only completed shifts', () => {
    const days = groupPersonDays(
      [punch('in', '2026-09-13T09:00:00'), ...log.slice(2)],
      'p1',
    );

    expect(days[0].workedMs).toBe(0);
    expect(days[0].open).toBe(true);
    expect(days[1].workedMs).toBe(8 * 3600_000);
    expect(days[1].open).toBe(false);
  });

  it('ignores other people entirely', () => {
    const days = groupPersonDays(
      [...log, punch('in', '2026-09-13T08:00:00', 'p2')],
      'p2',
    );

    expect(days).toHaveLength(1);
    expect(days[0].records).toHaveLength(1);
  });

  it('splits a night shift across the two days it touches', () => {
    // A day boundary is a real boundary here: the store's punch alternation
    // resets at midnight, so the display must not merge them.
    const days = groupPersonDays(
      [punch('out', '2026-09-14T02:00:00'), punch('in', '2026-09-13T22:00:00')],
      'p1',
    );

    expect(days).toHaveLength(2);
    expect(days[0].pairs[0].punchIn).toBeUndefined();
    expect(days[1].pairs[0].punchOut).toBeUndefined();
  });

  it('returns nothing for someone who has never scanned', () => {
    expect(groupPersonDays(log, 'nobody')).toEqual([]);
  });
});

describe('formatDuration', () => {
  it('shows hours and minutes', () => {
    expect(formatDuration(7 * 3600_000 + 20 * 60_000)).toBe('7h 20m');
  });

  it('drops the hours under an hour', () => {
    expect(formatDuration(45 * 60_000)).toBe('45m');
  });

  it('rounds down rather than up', () => {
    expect(formatDuration(59_999)).toBe('0m');
  });
});
