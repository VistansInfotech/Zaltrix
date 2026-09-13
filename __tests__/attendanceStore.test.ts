/**
 * The local roster and log. Every scan is recorded — there is deliberately no
 * per-day deduplication — so these tests pin that behaviour down.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearAttendance,
  countToday,
  nextPunchKind,
  enrollPerson,
  findEnrolledById,
  listAttendance,
  listCandidates,
  listEnrolled,
  logAttendance,
  removeEnrolled,
} from '../src/services/attendanceStore';
import { StorageKeys } from '../src/services/storage';

const embedding = (seed: number) => new Array(8).fill(0).map((_, i) => (i === seed ? 1 : 0));

beforeEach(async () => {
  await AsyncStorage.removeItem(StorageKeys.enrolledFaces);
  await AsyncStorage.removeItem(StorageKeys.attendanceLog);
});

describe('enrolment', () => {
  it('starts empty', async () => {
    expect(await listEnrolled()).toEqual([]);
  });

  it('stores a person with their embedding width', async () => {
    const saved = await enrollPerson({ id: 'E-1', name: 'Asha', embedding: embedding(1) });
    expect(saved.embeddingSize).toBe(8);
    expect(await listEnrolled()).toHaveLength(1);
  });

  it('trims whitespace around name and id', async () => {
    const saved = await enrollPerson({
      id: '  E-2  ',
      name: '  Ravi Kumar  ',
      embedding: embedding(2),
    });
    expect(saved.id).toBe('E-2');
    expect(saved.name).toBe('Ravi Kumar');
  });

  it('replaces rather than duplicates when the same id enrols again', async () => {
    await enrollPerson({ id: 'E-3', name: 'Sam', embedding: embedding(3) });
    await enrollPerson({ id: 'E-3', name: 'Sam Patel', embedding: embedding(4) });

    const people = await listEnrolled();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Sam Patel');
    expect(people[0].embedding).toEqual(embedding(4));
  });

  it('treats ids case-insensitively, so e-4 and E-4 are one person', async () => {
    await enrollPerson({ id: 'e-4', name: 'Lower', embedding: embedding(1) });
    await enrollPerson({ id: 'E-4', name: 'Upper', embedding: embedding(2) });
    expect(await listEnrolled()).toHaveLength(1);
    expect(await findEnrolledById('E-4')).toMatchObject({ name: 'Upper' });
  });

  it('finds nobody for an unknown id', async () => {
    expect(await findEnrolledById('nope')).toBeUndefined();
  });

  it('removes a person', async () => {
    await enrollPerson({ id: 'E-5', name: 'Gone', embedding: embedding(1) });
    await removeEnrolled('E-5');
    expect(await listEnrolled()).toEqual([]);
  });

  it('exposes candidates in the shape the matcher expects', async () => {
    await enrollPerson({ id: 'E-6', name: 'Match Me', embedding: embedding(5) });
    const [candidate] = await listCandidates();
    expect(candidate.embedding).toEqual(embedding(5));
    expect(candidate.item.id).toBe('E-6');
  });
});

describe('attendance log', () => {
  it('starts empty', async () => {
    expect(await listAttendance()).toEqual([]);
  });

  it('records a scan with a score and timestamp', async () => {
    const record = await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.91 });
    expect(record.score).toBe(0.91);
    expect(Number.isNaN(Date.parse(record.at))).toBe(false);
    expect(await listAttendance()).toHaveLength(1);
  });

  it('logs every scan — repeat marks are kept, not deduplicated', async () => {
    await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.9 });
    await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.88 });
    await logAttendance({ personId: 'E-1', name: 'Asha', score: 0.93 });
    expect(await listAttendance()).toHaveLength(3);
  });

  it('returns newest first', async () => {
    await logAttendance({ personId: 'E-1', name: 'First', score: 0.9 });
    await logAttendance({ personId: 'E-2', name: 'Second', score: 0.9 });
    const log = await listAttendance();
    expect(log[0].name).toBe('Second');
  });

  it('gives every record a distinct id', async () => {
    await logAttendance({ personId: 'E-1', name: 'A', score: 0.9 });
    await logAttendance({ personId: 'E-1', name: 'A', score: 0.9 });
    const log = await listAttendance();
    expect(new Set(log.map(r => r.recordId)).size).toBe(2);
  });

  it('clears', async () => {
    await logAttendance({ personId: 'E-1', name: 'A', score: 0.9 });
    await clearAttendance();
    expect(await listAttendance()).toEqual([]);
  });
});

describe('countToday', () => {
  const todayRecord = (personId: string) => ({
    recordId: Math.random().toString(36),
    personId,
    name: personId,
    at: new Date().toISOString(),
    score: 0.9,
    kind: 'in' as const,
  });

  it('counts only this person, only today', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const log = [
      todayRecord('E-1'),
      todayRecord('E-1'),
      todayRecord('E-2'),
      { ...todayRecord('E-1'), at: yesterday },
    ];
    expect(countToday(log, 'E-1')).toBe(2);
    expect(countToday(log, 'E-2')).toBe(1);
    expect(countToday(log, 'E-3')).toBe(0);
  });
});

describe('punch in / punch out', () => {
  const at = (iso: string, personId: string, kind: 'in' | 'out') => ({
    recordId: Math.random().toString(36),
    personId,
    name: personId,
    at: iso,
    score: 0.9,
    kind,
  });

  const now = new Date('2026-09-13T10:00:00Z');
  const earlierToday = new Date('2026-09-13T08:00:00Z').toISOString();
  const yesterday = new Date('2026-09-12T18:00:00Z').toISOString();

  it('treats the first scan of the day as a punch in', () => {
    expect(nextPunchKind([], 'E-1', now)).toBe('in');
  });

  it('follows an in with an out', () => {
    expect(nextPunchKind([at(earlierToday, 'E-1', 'in')], 'E-1', now)).toBe('out');
  });

  it('follows an out with another in, so breaks work', () => {
    expect(nextPunchKind([at(earlierToday, 'E-1', 'out')], 'E-1', now)).toBe('in');
  });

  it("ignores yesterday's dangling punch in", () => {
    // Otherwise this morning's first scan would be recorded as leaving.
    expect(nextPunchKind([at(yesterday, 'E-1', 'in')], 'E-1', now)).toBe('in');
  });

  it('tracks each person independently', () => {
    const log = [at(earlierToday, 'E-1', 'in')];
    expect(nextPunchKind(log, 'E-1', now)).toBe('out');
    expect(nextPunchKind(log, 'E-2', now)).toBe('in');
  });

  it('reads the newest entry, since the log is newest-first', () => {
    const log = [at(earlierToday, 'E-1', 'out'), at(earlierToday, 'E-1', 'in')];
    expect(nextPunchKind(log, 'E-1', now)).toBe('in');
  });

  it('alternates across real writes', async () => {
    const first = await logAttendance({ personId: 'E-9', name: 'Asha', score: 0.9 });
    const second = await logAttendance({ personId: 'E-9', name: 'Asha', score: 0.9 });
    const third = await logAttendance({ personId: 'E-9', name: 'Asha', score: 0.9 });
    expect([first.kind, second.kind, third.kind]).toEqual(['in', 'out', 'in']);
  });
});
