/** Pragmatic email check — rejects obvious typos without fighting valid oddities. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Deliberately permissive: digits, spaces and the usual separators, 7-15 digits.
 * Phone formats vary enormously by country, so this catches typos and junk
 * without rejecting a number that is merely unfamiliar.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[+]?[\d\s()./-]+$/.test(trimmed)) {
    return false;
  }
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export type PasswordStrength = 0 | 1 | 2 | 3;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < 8) {
    return 0;
  }

  let score = 0;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  return Math.min(3, Math.max(1, score)) as PasswordStrength;
}

export const STRENGTH_KEYS = ['weak', 'fair', 'good', 'strong'] as const;

/** Rejects 1111 / 1234 / 4321 style PINs that offer almost no protection. */
export function isWeakPin(pin: string): boolean {
  if (new Set(pin).size === 1) {
    return true;
  }

  const digits = pin.split('').map(Number);
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);

  return ascending || descending;
}
