/**
 * Account roles.
 *
 * The role decides whether the Bio Attendance tab exists at all, so it is an
 * access-control input, not a display preference. The cases that matter are
 * the ones where the role is missing or malformed: those must land on the
 * *lesser* privilege, never on admin.
 */
import {
  canManageAttendance,
  DEFAULT_ROLE,
  roleOf,
  USER_ROLES,
  type User,
} from '../src/types';

function account(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'Vivek',
    email: 'vivek@example.com',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('roleOf', () => {
  it('reads an explicit admin role', () => {
    expect(roleOf(account({ role: 'admin' }))).toBe('admin');
  });

  it('reads an explicit user role', () => {
    expect(roleOf(account({ role: 'user' }))).toBe('user');
  });

  it('treats an account with no role as an ordinary user', () => {
    // Accounts created before roles existed have nothing stored. Defaulting
    // the other way would silently promote every one of them.
    expect(roleOf(account())).toBe('user');
  });

  it('treats a missing account as an ordinary user', () => {
    expect(roleOf(null)).toBe('user');
    expect(roleOf(undefined)).toBe('user');
  });

  it('defaults to the lesser privilege', () => {
    expect(DEFAULT_ROLE).toBe('user');
  });

  it('does not promote on a role it does not recognise', () => {
    // Storage is JSON on disk; a corrupted or hand-edited value must not be
    // able to grant admin by being anything other than 'user'.
    const odd = account({ role: 'ADMIN' as never });
    expect(roleOf(odd) === 'admin').toBe(false);
  });

  it('reads an explicit hr role', () => {
    expect(roleOf(account({ role: 'hr' }))).toBe('hr');
  });

  it('falls back to the lesser privilege for an unknown role', () => {
    // Not merely "not admin" — a value this build does not know must resolve
    // to the least it could mean, including one a newer build might write.
    expect(roleOf(account({ role: 'superuser' as never }))).toBe('user');
    expect(roleOf(account({ role: 'Hr' as never }))).toBe('user');
    expect(roleOf(account({ role: '' as never }))).toBe('user');
  });
});

describe('canManageAttendance', () => {
  it('grants the attendance tab to admin and hr', () => {
    expect(canManageAttendance('admin')).toBe(true);
    expect(canManageAttendance('hr')).toBe(true);
  });

  it('withholds it from an ordinary user', () => {
    expect(canManageAttendance('user')).toBe(false);
  });

  it('withholds it from an unrecognised role', () => {
    // The gate reads roleOf's output, so an unknown value has already become
    // 'user' by the time it gets here — but check the floor directly too.
    expect(canManageAttendance(roleOf({ role: 'nonsense' as never }))).toBe(false);
  });

  it('covers every role, so a new one cannot be silently unhandled', () => {
    for (const role of USER_ROLES) {
      expect(typeof canManageAttendance(role)).toBe('boolean');
    }
  });
});

describe('USER_ROLES', () => {
  it('offers all three, least privileged first', () => {
    expect([...USER_ROLES]).toEqual(['user', 'hr', 'admin']);
  });

  it('starts with the default, so the first card is the safe one', () => {
    expect(USER_ROLES[0]).toBe(DEFAULT_ROLE);
  });
});

/**
 * The one-time upgrade for accounts stored before roles existed.
 *
 * The rule it encodes: absence of a role means "created when everything was
 * allowed", so it becomes admin — but an explicitly stored role is a decision
 * and is never overwritten.
 */
function migrate(stored: Partial<User> | null) {
  return stored && stored.role === undefined
    ? { ...stored, role: 'admin' as const }
    : stored;
}

describe('pre-roles account migration', () => {
  it('promotes an account that has no role stored', () => {
    expect(migrate(account())?.role).toBe('admin');
  });

  it('leaves an explicit user role alone', () => {
    // Someone chose this at sign-up; an upgrade would undo their choice.
    expect(migrate(account({ role: 'user' }))?.role).toBe('user');
  });

  it('leaves an explicit admin role alone', () => {
    expect(migrate(account({ role: 'admin' }))?.role).toBe('admin');
  });

  it('does nothing when there is no account', () => {
    expect(migrate(null)).toBeNull();
  });

  it('keeps the rest of the account intact', () => {
    const before = account({ name: 'Vivek', phone: '123' });
    const after = migrate(before)!;
    expect(after.name).toBe('Vivek');
    expect(after.phone).toBe('123');
    expect(after.id).toBe(before.id);
  });
});
