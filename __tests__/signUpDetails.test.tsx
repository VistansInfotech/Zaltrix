/**
 * The details the sign-up form now collects.
 *
 * Two things are being pinned down. First the date helpers: a birthday is a
 * calendar day, and the classic bug is storing it as an instant so it lands a
 * day earlier for anyone west of UTC. Second the form's order and gates —
 * the account type has to sit above the password, and neither new field may
 * be skipped past silently.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../src/context/AuthContext';
import { PreferencesProvider } from '../src/context/PreferencesContext';
import SignUpScreen from '../src/screens/auth/SignUpScreen';
import { ThemeProvider } from '../src/theme';
import { ageFrom, fromDateKey, GENDERS, toDateKey } from '../src/types';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() } as never;
const route = { key: 'k', name: 'SignUp', params: undefined } as never;

async function renderSignUp() {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <PreferencesProvider>
            <AuthProvider>
              <SignUpScreen navigation={navigation} route={route} />
            </AuthProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  await ReactTestRenderer.act(async () => {});
  return tree!;
}

/** Taps a closed dropdown open by the label it announces. */
async function openField(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  const field = tree.root.find(
    node =>
      node.props?.accessibilityRole === 'button' &&
      node.props?.accessibilityLabel === label,
  );
  await ReactTestRenderer.act(async () => {
    field.props.onPress();
  });
}

describe('toDateKey', () => {
  it('writes a local calendar day, zero padded', () => {
    expect(toDateKey(new Date(1991, 0, 5))).toBe('1991-01-05');
    expect(toDateKey(new Date(2001, 11, 31))).toBe('2001-12-31');
  });

  it('keeps the day the user picked, not the UTC one', () => {
    // Local midnight on the 5th is the 4th in UTC for anyone west of it.
    // toISOString().slice(0,10) is the bug this exists to avoid.
    const picked = new Date(1991, 0, 5, 0, 0, 0);
    expect(toDateKey(picked)).toBe('1991-01-05');
  });

  it('round-trips through fromDateKey', () => {
    const key = '1988-02-29'; // a real leap day
    const parsed = fromDateKey(key)!;
    expect(parsed.getFullYear()).toBe(1988);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(29);
    expect(toDateKey(parsed)).toBe(key);
  });
});

describe('fromDateKey', () => {
  it('is null for nothing stored', () => {
    expect(fromDateKey(null)).toBeNull();
    expect(fromDateKey(undefined)).toBeNull();
    expect(fromDateKey('')).toBeNull();
  });

  it('rejects malformed keys rather than guessing', () => {
    expect(fromDateKey('1991-1-5')).toBeNull();
    expect(fromDateKey('05/01/1991')).toBeNull();
    expect(fromDateKey('not a date')).toBeNull();
  });

  it('rejects a day that does not exist in that month', () => {
    // The Date constructor rolls 31 February into March; that would turn a
    // typo into a silently wrong birthday.
    expect(fromDateKey('2024-02-31')).toBeNull();
    expect(fromDateKey('2023-02-29')).toBeNull();
  });
});

describe('ageFrom', () => {
  it('counts whole years', () => {
    expect(ageFrom(new Date(1990, 5, 15), new Date(2020, 5, 15))).toBe(30);
  });

  it('does not count a birthday that has not arrived yet', () => {
    expect(ageFrom(new Date(1990, 5, 15), new Date(2020, 5, 14))).toBe(29);
    expect(ageFrom(new Date(1990, 5, 15), new Date(2020, 4, 20))).toBe(29);
  });

  it('counts the birthday itself', () => {
    expect(ageFrom(new Date(2000, 0, 1), new Date(2018, 0, 1))).toBe(18);
  });
});

describe('SignUpScreen', () => {
  it('asks for a date of birth and a gender', async () => {
    const body = JSON.stringify((await renderSignUp()).toJSON());
    expect(body).toContain('Date of birth');
    expect(body).toContain('Choose your date of birth');
    expect(body).toContain('Gender');
    expect(body).toContain('Select your gender');
  });

  it('keeps the gender options closed until the field is opened', async () => {
    // A dropdown, not a chip row: the options are a sheet away, so the form
    // stays one line per question.
    const body = JSON.stringify((await renderSignUp()).toJSON());
    expect(body).not.toContain('Prefer not to say');
  });

  it('offers every gender option once the dropdown is opened', async () => {
    const tree = await renderSignUp();
    await openField(tree, 'Gender');
    const body = JSON.stringify(tree.toJSON());
    expect(body).toContain('Female');
    expect(body).toContain('Male');
    expect(body).toContain('Other');
    expect(body).toContain('Prefer not to say');
  });

  it('commits the choice and closes on a single tap', async () => {
    // Nothing to confirm in a one-of-many choice, so there is no Done button
    // to press afterwards.
    const tree = await renderSignUp();
    await openField(tree, 'Gender');
    const option = tree.root.find(
      node =>
        node.props?.accessibilityRole === 'radio' &&
        node.props?.accessibilityLabel === 'Prefer not to say' &&
        typeof node.props?.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => {
      option.props.onPress();
    });
    const body = JSON.stringify(tree.toJSON());
    // The field now shows the answer, and the sheet's options are gone again.
    expect(body).toContain('Prefer not to say');
    expect(body).not.toContain('Select your gender');
    expect(body).not.toContain('Female');
  });

  it('offers a way not to disclose a gender', async () => {
    // Asking is fine; requiring someone to state it is not. The opt-out is
    // what makes the field safe to mark required.
    expect(GENDERS).toContain('undisclosed');
  });

  it('puts the account type above the password', async () => {
    const body = JSON.stringify((await renderSignUp()).toJSON());
    const accountType = body.indexOf('Account type');
    const password = body.indexOf('At least 8 characters');
    expect(accountType).toBeGreaterThan(-1);
    expect(password).toBeGreaterThan(-1);
    expect(accountType).toBeLessThan(password);
  });

  it('shows what the chosen account type grants without opening it', async () => {
    // A permission, not a preference: the consequence stays on the closed
    // field rather than only inside the sheet nobody reopens.
    const body = JSON.stringify((await renderSignUp()).toJSON());
    expect(body).toContain('Marks their own attendance only');
  });

  it('puts the new fields between the email and the account type', async () => {
    const body = JSON.stringify((await renderSignUp()).toJSON());
    const email = body.indexOf('you@company.com');
    const dob = body.indexOf('Choose your date of birth');
    const gender = body.indexOf('Select your gender');
    const accountType = body.indexOf('Account type');
    expect(email).toBeLessThan(dob);
    expect(dob).toBeLessThan(gender);
    expect(gender).toBeLessThan(accountType);
  });

  it('offers all three account types once opened', async () => {
    const tree = await renderSignUp();
    await openField(tree, 'Account type');
    const body = JSON.stringify(tree.toJSON());
    expect(body).toContain('HR');
    expect(body).toContain('Admin');
    expect(body).toContain('Same access as an admin, under an HR job title');
    expect(body).toContain('Registers faces and sees');
  });

  it('lists the account types least privileged first', async () => {
    const tree = await renderSignUp();
    await openField(tree, 'Account type');
    const body = JSON.stringify(tree.toJSON());
    const user = body.indexOf('Marks their own attendance only');
    const hr = body.indexOf('Same access as an admin');
    const admin = body.indexOf('Registers faces and sees');
    expect(user).toBeLessThan(hr);
    expect(hr).toBeLessThan(admin);
  });

  it('selects HR when HR is tapped, and only HR', async () => {
    const tree = await renderSignUp();
    await openField(tree, 'Account type');
    const hr = tree.root.find(
      node =>
        node.props?.accessibilityRole === 'radio' &&
        node.props?.accessibilityLabel === 'HR' &&
        typeof node.props?.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => {
      hr.props.onPress();
    });
    const body = JSON.stringify(tree.toJSON());
    // The closed field now names HR and explains what it grants.
    expect(body).toContain('Same access as an admin, under an HR job title');
    expect(body).not.toContain('Marks their own attendance only');
  });

  it('still defaults to the lesser privilege', async () => {
    // Turning the cards into a dropdown must not have changed which option
    // the form starts on.
    const tree = await renderSignUp();
    await openField(tree, 'Account type');
    // findAll matches the composite and its host View alike, so the same
    // control appears several times — dedupe by the label it announces.
    const selected = new Set(
      tree.root
        .findAll(node => node.props?.accessibilityRole === 'radio')
        .filter(node => node.props?.accessibilityState?.selected)
        .map(node => node.props.accessibilityLabel),
    );
    expect([...selected]).toEqual(['User']);
  });

  it('refuses to submit until the new fields are answered', async () => {
    const tree = await renderSignUp();
    const submit = tree.root.find(
      node => node.props?.accessibilityRole === 'button' &&
        node.props?.accessibilityLabel === 'Sign up',
    );
    await ReactTestRenderer.act(async () => {
      submit.props.onPress();
    });
    const body = JSON.stringify(tree.toJSON());
    expect(body).toContain('Please choose your date of birth');
    expect(body).toContain('Please choose an option');
  });
});
