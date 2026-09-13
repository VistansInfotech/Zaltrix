import {
  isValidEmail,
  isWeakPin,
  passwordStrength,
  STRENGTH_KEYS, isValidPhone } from '../src/utils/validation';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'vivek.shukla@zaltrix.app', 'user+tag@sub.domain.com'])(
    'accepts %s',
    email => expect(isValidEmail(email)).toBe(true),
  );

  it.each(['', 'plain', 'no@domain', 'no-at.com', 'a b@c.com', '@nolocal.com'])(
    'rejects %j',
    email => expect(isValidEmail(email)).toBe(false),
  );

  it('ignores surrounding whitespace', () => {
    expect(isValidEmail('  a@b.co  ')).toBe(true);
  });
});

describe('passwordStrength', () => {
  it('scores anything under 8 characters as weakest', () => {
    expect(passwordStrength('Ab1!')).toBe(0);
  });

  it('rises with character variety', () => {
    const simple = passwordStrength('aaaaaaaa');
    const mixed = passwordStrength('Password1!verylong');
    expect(mixed).toBeGreaterThan(simple);
  });

  it('stays within the label array bounds', () => {
    for (const pw of ['short', 'aaaaaaaa', 'Passw0rd', 'C0rrect-Horse-Battery!']) {
      const score = passwordStrength(pw);
      expect(STRENGTH_KEYS[score]).toBeDefined();
    }
  });
});

describe('isWeakPin', () => {
  it.each(['0000', '1111', '9999'])('rejects repeated digits %s', pin =>
    expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['1234', '4567', '0123'])('rejects ascending runs %s', pin =>
    expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['4321', '9876', '3210'])('rejects descending runs %s', pin =>
    expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['1837', '9042', '5182'])('accepts non-obvious PIN %s', pin =>
    expect(isWeakPin(pin)).toBe(false),
  );
});

describe('isValidPhone', () => {
  it.each([
    '+91 98765 43210',
    '9876543210',
    '+1 (555) 010-9999',
    '020 7946 0018',
    '+44-20-7946-0018',
  ])('accepts %s', value => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace'],
    ['123456', 'too few digits'],
    ['1234567890123456', 'too many digits'],
    ['call me maybe', 'letters'],
    ['+91 98765 4321x', 'trailing letter'],
    ['98765#43210', 'stray symbol'],
  ])('rejects %j (%s)', value => {
    expect(isValidPhone(value)).toBe(false);
  });

  it('ignores surrounding whitespace', () => {
    expect(isValidPhone('  9876543210  ')).toBe(true);
  });
});
