import * as Keychain from 'react-native-keychain';

import { hashSecret, randomHex, safeEqual } from './crypto';

/**
 * Secrets live in the iOS Keychain / Android Keystore, never in AsyncStorage.
 * Each secret gets its own service name so they can be reset independently.
 */
const SERVICE_CREDENTIALS = 'app.zaltrix.credentials';
const SERVICE_PIN = 'app.zaltrix.pin';

type StoredCredential = {
  salt: string;
  hash: string;
};

async function writeSecret(
  service: string,
  account: string,
  payload: object,
): Promise<boolean> {
  try {
    const result = await Keychain.setGenericPassword(
      account,
      JSON.stringify(payload),
      { service },
    );
    return result !== false;
  } catch {
    return false;
  }
}

async function readSecret<T>(service: string): Promise<{ account: string; value: T } | null> {
  try {
    const result = await Keychain.getGenericPassword({ service });
    if (!result) {
      return null;
    }
    return { account: result.username, value: JSON.parse(result.password) as T };
  } catch {
    return null;
  }
}

async function clearSecret(service: string): Promise<void> {
  try {
    await Keychain.resetGenericPassword({ service });
  } catch {
    // ignore
  }
}

/* ------------------------------- password ------------------------------- */

export async function savePassword(email: string, password: string): Promise<boolean> {
  const salt = randomHex(16);
  return writeSecret(SERVICE_CREDENTIALS, email.toLowerCase(), {
    salt,
    hash: hashSecret(password, salt),
  } satisfies StoredCredential);
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const stored = await readSecret<StoredCredential>(SERVICE_CREDENTIALS);
  if (!stored || stored.account !== email.toLowerCase()) {
    return false;
  }
  return safeEqual(hashSecret(password, stored.value.salt), stored.value.hash);
}

export async function hasStoredAccount(): Promise<string | null> {
  const stored = await readSecret<StoredCredential>(SERVICE_CREDENTIALS);
  return stored?.account ?? null;
}

/* ---------------------------------- PIN --------------------------------- */

export async function savePin(pin: string): Promise<boolean> {
  const salt = randomHex(16);
  return writeSecret(SERVICE_PIN, 'pin', {
    salt,
    hash: hashSecret(pin, salt),
  } satisfies StoredCredential);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await readSecret<StoredCredential>(SERVICE_PIN);
  if (!stored) {
    return false;
  }
  return safeEqual(hashSecret(pin, stored.value.salt), stored.value.hash);
}

export async function hasPin(): Promise<boolean> {
  return (await readSecret<StoredCredential>(SERVICE_PIN)) !== null;
}

export async function clearPin(): Promise<void> {
  await clearSecret(SERVICE_PIN);
}

/** Wipe every secret — used when the account itself is removed. */
export async function clearAllSecrets(): Promise<void> {
  await Promise.all([clearSecret(SERVICE_CREDENTIALS), clearSecret(SERVICE_PIN)]);
}
