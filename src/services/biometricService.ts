import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

export type BiometryKind = 'FaceID' | 'TouchID' | 'Biometrics' | null;

export type BiometricCapability = {
  available: boolean;
  /** null when the device has no enrolled biometrics or no sensor. */
  kind: BiometryKind;
  /** i18n key under `biometric.` describing this sensor to the user. */
  labelKey: 'faceId' | 'touchId' | 'fingerprint' | 'biometrics';
};

// allowDeviceCredentials:false keeps the prompt to real biometrics; our own PIN
// screen is the fallback, so we never want the OS passcode sheet here.
const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: false,
});

const UNAVAILABLE: BiometricCapability = {
  available: false,
  kind: null,
  labelKey: 'biometrics',
};

export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    if (!available || !biometryType) {
      return UNAVAILABLE;
    }

    if (biometryType === BiometryTypes.FaceID) {
      return { available: true, kind: 'FaceID', labelKey: 'faceId' };
    }
    if (biometryType === BiometryTypes.TouchID) {
      return { available: true, kind: 'TouchID', labelKey: 'touchId' };
    }
    // Android reports the generic `Biometrics` type for fingerprint and face.
    return { available: true, kind: 'Biometrics', labelKey: 'fingerprint' };
  } catch {
    return UNAVAILABLE;
  }
}

export type BiometricResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'failed'; message?: string };

export async function promptBiometric(
  promptMessage: string,
  cancelLabel: string,
): Promise<BiometricResult> {
  try {
    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: cancelLabel,
    });

    if (success) {
      return { status: 'success' };
    }
    // The library surfaces user cancellation as an error string, not a throw.
    if (error && /cancel/i.test(error)) {
      return { status: 'cancelled' };
    }
    return { status: 'failed', message: error };
  } catch (e) {
    return { status: 'failed', message: e instanceof Error ? e.message : undefined };
  }
}
