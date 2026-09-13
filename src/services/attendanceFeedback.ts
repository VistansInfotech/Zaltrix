/**
 * Audible and haptic confirmation for an attendance scan.
 *
 * Someone marking attendance is usually looking at the camera, not the screen,
 * so the chime is the real feedback channel and the on-screen result is the
 * confirmation they glance at afterwards.
 */
import { Image, Vibration } from 'react-native';
import { createSound } from 'react-native-nitro-sound';

import { toPlayableUri } from './assetUri';

export { toPlayableUri };

type Cue = 'success' | 'error';

const files: Record<Cue, number> = {
  success: require('../assets/sounds/success.wav'),
  error: require('../assets/sounds/error.wav'),
};

/** Distinct patterns, so the two outcomes differ even with the volume down. */
const haptics: Record<Cue, number | number[]> = {
  success: 35,
  error: [0, 90, 80, 90],
};

let player: ReturnType<typeof createSound> | null = null;

function getPlayer() {
  if (!player) {
    player = createSound();
  }
  return player;
}

/**
 * Plays the cue and vibrates. Audio is best-effort: a bundled asset can fail to
 * resolve (release packaging differs per platform) or the device can be muted,
 * and neither should stop attendance being marked — the haptic always fires.
 */
export async function playCue(cue: Cue): Promise<void> {
  Vibration.vibrate(haptics[cue] as number);

  try {
    const source = Image.resolveAssetSource(files[cue]);
    if (!source?.uri) {
      return;
    }
    const sound = getPlayer();
    await sound.stopPlayer().catch(() => {});
    await sound.startPlayer(toPlayableUri(source.uri));
  } catch {
    // Silent by design — the vibration above already confirmed the outcome.
  }
}

/** Releases the player; call when leaving the attendance screens. */
export async function releaseCues(): Promise<void> {
  try {
    await player?.stopPlayer();
  } catch {
    // nothing to stop
  }
}
