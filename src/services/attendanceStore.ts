/**
 * Local store for enrolled faces and the attendance log.
 *
 * Both live in AsyncStorage on the device — no server, no upload. An enrolment
 * holds the face *embedding*, never the photo: the picture is discarded once the
 * numbers are extracted, and an embedding cannot be turned back into a face.
 */
import { readJSON, StorageKeys, writeJSON } from './storage';
import { Candidate, FaceEmbedding } from './faceRecognition';
import type { PunchLocation } from './locationService';

export type EnrolledPerson = {
  /** The identifier the operator typed, e.g. a staff or roll number. */
  id: string;
  name: string;
  embedding: FaceEmbedding;
  /** Stored so a model swap can be detected — see faceRecognition.similarity. */
  embeddingSize: number;
  /**
   * The face that was enrolled, as a small JPEG data URI. Kept so the roster
   * shows who each record belongs to; recognition itself only ever uses the
   * embedding.
   */
  photo?: string | null;
  enrolledAt: string;
};

/** A scan is either arriving or leaving. */
export type PunchKind = 'in' | 'out';

export type AttendanceRecord = {
  recordId: string;
  personId: string;
  name: string;
  /** ISO timestamp of the scan. */
  at: string;
  /** Cosine similarity of the match, kept for auditing borderline scans. */
  score: number;
  kind: PunchKind;
  /**
   * Where the punch was made. Absent on records written before location was
   * switched on, and on any punch where the fix could not be taken — so every
   * reader has to handle its absence rather than assume a coordinate.
   */
  location?: PunchLocation | null;
  /**
   * Metres from the configured centre at the moment of the punch, when there
   * was a centre to measure against. Frozen into the record on purpose: moving
   * the office boundary later must not silently rewrite what already happened.
   */
  distanceMeters?: number | null;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------- enrolment ------------------------------- */

export async function listEnrolled(): Promise<EnrolledPerson[]> {
  return readJSON<EnrolledPerson[]>(StorageKeys.enrolledFaces, []);
}

/** Enrolled people in the shape the matcher wants. */
export async function listCandidates(): Promise<Candidate<EnrolledPerson>[]> {
  const people = await listEnrolled();
  return people.map(item => ({ item, embedding: item.embedding }));
}

export async function findEnrolledById(id: string): Promise<EnrolledPerson | undefined> {
  const people = await listEnrolled();
  return people.find(p => p.id.toLowerCase() === id.trim().toLowerCase());
}

/**
 * Saves a face against an id. Re-enrolling an existing id replaces that
 * person's embedding, which is how you re-register after a model change or a
 * bad first capture.
 */
export async function enrollPerson(person: {
  id: string;
  name: string;
  embedding: FaceEmbedding;
  photo?: string | null;
}): Promise<EnrolledPerson> {
  const people = await listEnrolled();
  const record: EnrolledPerson = {
    id: person.id.trim(),
    name: person.name.trim(),
    embedding: person.embedding,
    embeddingSize: person.embedding.length,
    photo: person.photo ?? null,
    enrolledAt: new Date().toISOString(),
  };

  const index = people.findIndex(
    p => p.id.toLowerCase() === record.id.toLowerCase(),
  );
  if (index >= 0) {
    people[index] = record;
  } else {
    people.push(record);
  }

  await writeJSON(StorageKeys.enrolledFaces, people);
  return record;
}

export async function removeEnrolled(id: string): Promise<void> {
  const people = await listEnrolled();
  await writeJSON(
    StorageKeys.enrolledFaces,
    people.filter(p => p.id.toLowerCase() !== id.trim().toLowerCase()),
  );
}

/* ------------------------------- attendance ------------------------------ */

/** Newest first. */
export async function listAttendance(): Promise<AttendanceRecord[]> {
  return readJSON<AttendanceRecord[]>(StorageKeys.attendanceLog, []);
}

/**
 * Whether this person's next scan today counts as arriving or leaving.
 *
 * Alternates from their most recent scan *today*, so a normal day reads
 * in → out, and stepping out for lunch simply adds another pair. The day
 * boundary matters: yesterday's unmatched "in" must not make this morning's
 * first scan an "out".
 */
export function nextPunchKind(
  log: AttendanceRecord[],
  personId: string,
  now: Date = new Date(),
): PunchKind {
  const today = now.toDateString();
  const last = log.find(
    r => r.personId === personId && new Date(r.at).toDateString() === today,
  );
  return last?.kind === 'in' ? 'out' : 'in';
}

/**
 * Appends one record per successful scan — every scan is logged, with no
 * per-day deduplication — tagged as a punch in or a punch out.
 */
export async function logAttendance(entry: {
  personId: string;
  name: string;
  score: number;
  location?: PunchLocation | null;
  distanceMeters?: number | null;
}): Promise<AttendanceRecord> {
  const log = await listAttendance();
  const record: AttendanceRecord = {
    recordId: newId(),
    personId: entry.personId,
    name: entry.name,
    at: new Date().toISOString(),
    score: entry.score,
    // The log is newest-first, so nextPunchKind reads the latest scan directly.
    kind: nextPunchKind(log, entry.personId),
    location: entry.location ?? null,
    distanceMeters: entry.distanceMeters ?? null,
  };
  await writeJSON(StorageKeys.attendanceLog, [record, ...log]);
  return record;
}

/**
 * Fills in the address on a punch that was already recorded.
 *
 * The address needs the network; the punch does not. Making a person stand at
 * the door while a geocoder is asked what the door is called would put seconds
 * onto every punch in a 9am queue, so the record is written with its
 * coordinates straight away and named afterwards, if and when that succeeds.
 *
 * A no-op when the record has gone or never had a position — both are ordinary
 * outcomes of a lookup that finished after the log was cleared.
 */
export async function attachAddress(
  recordId: string,
  address: string | null,
): Promise<AttendanceRecord | undefined> {
  if (!address) {
    return undefined;
  }
  const log = await listAttendance();
  const index = log.findIndex(r => r.recordId === recordId);
  if (index < 0 || !log[index].location) {
    return undefined;
  }
  const updated: AttendanceRecord = {
    ...log[index],
    location: { ...log[index].location!, address },
  };
  log[index] = updated;
  await writeJSON(StorageKeys.attendanceLog, log);
  return updated;
}

export async function clearAttendance(): Promise<void> {
  await writeJSON(StorageKeys.attendanceLog, []);
}

/** How many times this person has been marked today — shown after a scan. */
export function countToday(log: AttendanceRecord[], personId: string): number {
  const today = new Date().toDateString();
  return log.filter(
    r => r.personId === personId && new Date(r.at).toDateString() === today,
  ).length;
}
