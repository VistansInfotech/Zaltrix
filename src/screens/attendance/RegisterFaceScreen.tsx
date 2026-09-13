import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import { FaceOvalMask, FaceOvalRing, type OvalState } from './FaceOval';
import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import SettingsRow from '../../components/SettingsRow';
import TextField from '../../components/TextField';
import { usePreferences } from '../../context/PreferencesContext';
import {
  EnrolledPerson,
  enrollPerson,
  findEnrolledById,
  listEnrolled,
} from '../../services/attendanceStore';
import { playCue } from '../../services/attendanceFeedback';
import type { DetectedFace } from '../../services/faceDetector';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useThemedStyles,
} from '../../theme';
import {
  FaceCaptureError,
  Framing,
  judgeFraming,
  useFaceCapture,
  useStableFaceDetectorOutput,
} from './useFaceCapture';
import type { AttendanceStackScreenProps } from '../../navigation/types';

type Step = 'details' | 'capture' | 'confirm';

type Captured = {
  embedding: number[];
  faceUri?: string;
  previewUri?: string;
  warning?: 'notFrontal' | 'eyesClosed';
};

/** Consecutive good frames required — stops a blur or a glance triggering it. */
const STABLE_FRAMES = 5;
/** Pause after a failure before the camera arms itself again. */
const RETRY_COOLDOWN_MS = 2000;

/**
 * This screen sits under a native stack header, which already clears the
 * status bar. Keeping the 'top' edge would inset the content a second time and
 * leave a band of empty space below the title.
 */
const HEADER_EDGES = ['left', 'right'] as const;

export default function RegisterFaceScreen({
  navigation,
}: AttendanceStackScreenProps<'RegisterFace'>) {
  const { t } = usePreferences();
  const styles = useThemedStyles(makeStyles);
  const isFocused = useIsFocused();

  const [step, setStep] = useState<Step>('details');
  // Pre-filled when arriving from the roster's re-capture action, so the new
  // face replaces that person's record rather than enrolling a second copy of
  // them under a slightly different ID.
  const [name, setName] = useState('');
  const [id, setId] = useState('');

  const [nameError, setNameError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedFrame, setFailedFrame] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Captured | null>(null);
  const [framing, setFraming] = useState<Framing>('none');
  const [viewing, setViewing] = useState<string | null>(null);
  /**
   * The camera area in real pixels. Measured rather than taken from
   * useWindowDimensions because a navigation header sits above it, and the
   * guide has to be centred in the camera, not in the window.
   */
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [people, setPeople] = useState<EnrolledPerson[]>([]);

  // The roster is shown under the form, so it must refresh after a save.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void listEnrolled().then(list => active && setPeople(list));
      return () => {
        active = false;
      };
    }, []),
  );

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'quality' });
  const { capture } = useFaceCapture();

  const capturing = useRef(false);
  const goodFrames = useRef(0);
  const armedAt = useRef(0);
  const framingRef = useRef<Framing>('none');
  framingRef.current = framing;

  /** Fills as the user holds a good pose, so the capture never feels abrupt. */
  const hold = useRef(new Animated.Value(0)).current;
  /** Breathes while the shutter is working. */
  const pulse = useRef(new Animated.Value(0)).current;
  /** Always running, so the guide reads as live rather than a static outline. */
  const idle = useRef(new Animated.Value(0)).current;

  /**
   * The detector callback lives inside a pinned native output, so it must not
   * close over one render's `runCapture` — that would capture the first render's
   * `capture`, and with it the first detector ever constructed.
   */
  const runCaptureRef = useRef<() => Promise<void>>(async () => {});

  const onFacesDetected = useCallback((faces: DetectedFace[]) => {
    if (capturing.current || Date.now() < armedAt.current) {
      return;
    }

    const next = judgeFraming(faces);
    if (next !== framingRef.current) {
      const f = faces[0];
      console.log(
        `[face] live -> ${next}` +
          (f
            ? ` fill=${(
                Math.min(f.bounds.width, f.bounds.height) /
                Math.min(f.frameWidth, f.frameHeight)
              ).toFixed(3)} frame=${f.frameWidth}x${f.frameHeight}`
            : ''),
      );
      setFraming(next);
      // Clear the previous attempt's error once the pose is usable again.
      if (next === 'ready') {
        setError(null);
        setFailedFrame(null);
      }
    }

    if (next !== 'ready') {
      goodFrames.current = 0;
      return;
    }

    goodFrames.current += 1;
    if (goodFrames.current >= STABLE_FRAMES) {
      goodFrames.current = 0;
      void runCaptureRef.current();
    }
  }, []);

  const faceOutput = useStableFaceDetectorOutput({
    performanceMode: 'fast',
    cameraFacing: 'front',
    // The preview is a centre-crop of a 4:3 sensor on a tall screen, so a face
    // that fills the preview covers far less of the captured still. Detecting
    // against the full frame makes the live measurements match the capture.
    outputResolution: 'full',
    onFacesDetected,
    onError: useCallback(() => {
      goodFrames.current = 0;
      setFraming('none');
    }, []),
  });

  // A fresh array literal would look like a configuration change to the
  // CameraSession on every render, restarting it.
  const outputs = useMemo(() => [photoOutput, faceOutput], [photoOutput, faceOutput]);

  /* -------------------------------- animation ------------------------------- */

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idle, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(idle, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle]);

  useEffect(() => {
    Animated.timing(hold, {
      toValue: framing === 'ready' ? 1 : 0,
      duration: framing === 'ready' ? 900 : 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [framing, hold]);

  useEffect(() => {
    if (!busy) {
      pulse.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [busy, pulse]);

  /* ---------------------------------- flow ---------------------------------- */

  async function goToCapture() {
    const trimmedName = name.trim();
    const trimmedId = id.trim();
    setNameError(trimmedName.length < 2 ? t('attendance.errorName') : null);
    setIdError(trimmedId.length < 1 ? t('attendance.errorId') : null);
    if (trimmedName.length < 2 || trimmedId.length < 1) {
      return;
    }

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        setError(t('attendance.errorPermission'));
        return;
      }
    }
    setError(null);
    setStep('capture');
  }

  /** Fires on its own once the pose has been good for STABLE_FRAMES in a row. */
  async function runCapture() {
    if (capturing.current) {
      return;
    }
    capturing.current = true;
    setBusy(true);
    setError(null);

    try {
      const result = await capture(photoOutput, { strict: true, withPreview: true });
      setCaptured(result);
      setFailedFrame(null);
      void playCue('success');
      setStep('confirm');
    } catch (e) {
      const reason = e instanceof FaceCaptureError ? e.reason : 'failed';
      setError(t(`attendance.capture.${reason}`));
      setFailedFrame(e instanceof FaceCaptureError ? e.previewUri ?? null : null);
      void playCue('error');
      armedAt.current = Date.now() + RETRY_COOLDOWN_MS;
      setFraming('none');
    } finally {
      capturing.current = false;
      setBusy(false);
    }
  }

  runCaptureRef.current = runCapture;

  async function saveCaptured() {
    if (!captured) {
      return;
    }
    setBusy(true);
    try {
      const existing = await findEnrolledById(id);
      await enrollPerson({
        id,
        name,
        embedding: captured.embedding,
        photo: captured.faceUri ?? null,
      });
      void playCue('success');
      navigation.navigate('AttendanceHome', {
        registered: name.trim(),
        replaced: existing !== undefined,
      });
    } catch {
      setError(t('attendance.errorSave'));
      setStep('capture');
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setCaptured(null);
    setError(null);
    setFailedFrame(null);
    goodFrames.current = 0;
    armedAt.current = Date.now() + 600;
    setFraming('none');
    setStep('capture');
  }

  /** What the guide should look like: waiting, framed, or firing. */
  const ovalState: OvalState = busy
    ? 'capturing'
    : framing === 'ready'
      ? 'ready'
      : 'idle';

  const guidance = useMemo(() => {
    if (busy) {
      return t('attendance.capturing');
    }
    switch (framing) {
      case 'multiple':
        return t('attendance.guideMultiple');
      case 'tooSmall':
        return t('attendance.guideCloser');
      case 'tooClose':
        return t('attendance.guideFurther');
      case 'offCentre':
        return t('attendance.guideCentre');
      case 'notFrontal':
        return t('attendance.guideStraight');
      case 'ready':
        return t('attendance.holdStill');
      default:
        return t('attendance.guideNoFace');
    }
  }, [framing, busy, t]);

  /* --------------------------------- details -------------------------------- */

  if (step === 'details') {
    return (
      <Screen scroll avoidKeyboard edges={HEADER_EDGES} contentStyle={styles.content}>
        <Text style={styles.lead}>{t('attendance.registerLead')}</Text>

        {error ? (
          <View style={styles.bannerWrap}>
            <Banner tone="danger" message={error} />
          </View>
        ) : null}

        <TextField
          label={t('attendance.nameLabel')}
          placeholder={t('attendance.namePlaceholder')}
          value={name}
          onChangeText={v => {
            setName(v);
            setNameError(null);
          }}
          error={nameError}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
        />
        <TextField
          label={t('attendance.idLabel')}
          placeholder={t('attendance.idPlaceholder')}
          value={id}
          onChangeText={v => {
            setId(v);
            setIdError(null);
          }}
          error={idError}
          autoCapitalize="characters"
          autoCorrect={false}
          hint={t('attendance.idHint')}
          returnKeyType="done"
          onSubmitEditing={() => void goToCapture()}
        />
        <Button
          label={t('attendance.continue')}
          onPress={() => void goToCapture()}
        />

        <Text style={styles.privacy}>{t('attendance.privacyNote')}</Text>
      </Screen>
    );
  }

  /* --------------------------------- confirm -------------------------------- */

  /**
   * Rendered over the still-mounted camera rather than replacing it, so the
   * capture outputs stay attached to a single AVCaptureSession.
   */
  function renderConfirm() {
    if (!captured) {
      return null;
    }
    // The full frame reads better at full-screen; the cropped face is stored.
    const shown = captured.previewUri ?? captured.faceUri;
    return (
      <View style={styles.confirmOverlay}>
        {shown ? (
          <Image
            source={{ uri: shown }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={e =>
              console.log('[face] preview failed to render', e.nativeEvent?.error)
            }
            accessibilityRole="image"
            accessibilityLabel={t('attendance.confirmTitle')}
          />
        ) : null}

        {/* Shows the photo only through the guide the user framed themselves
            in, so the preview and the capture agree on what was captured. */}
        <FaceOvalMask width={frame.width} height={frame.height} />

        <View style={styles.confirmTop}>
          <Text style={styles.confirmHeading}>{t('attendance.confirmTitle')}</Text>
          <Text style={styles.confirmSub}>{t('attendance.confirmBody')}</Text>
          {captured.warning ? (
            <Text style={styles.confirmWarning}>
              {t(`attendance.warning.${captured.warning}`)}
            </Text>
          ) : null}
        </View>

        <View style={styles.confirmBottom}>
          <Text style={styles.confirmName} numberOfLines={1}>
            {name.trim()}
          </Text>
          <Text style={styles.confirmId} numberOfLines={1}>
            {t('attendance.idLabel')} · {id.trim()}
          </Text>

          <Button
            label={busy ? t('attendance.saving') : t('attendance.confirmSave')}
            onPress={saveCaptured}
            disabled={busy}
          />
          <Pressable
            onPress={retake}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t('attendance.confirmRetake')}
            style={({ pressed }) => [styles.retakeLink, pressed && styles.retakePressed]}>
            <Text style={styles.retakeText}>{t('attendance.confirmRetake')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* --------------------------------- capture -------------------------------- */

  return (
    <View
      style={styles.cameraScreen}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setFrame(prev =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          // Live only while capturing, but never unmounted: an AVCaptureOutput
          // may belong to exactly one session, and tearing the camera down for
          // the confirm step meant Retake re-attached the same pinned outputs
          // to a fresh session — which AVFoundation asserts on and aborts.
          // Not gated on `busy` either: deactivating mid-capture kills the
          // capture in flight.
          isActive={isFocused && step === 'capture'}
          outputs={outputs}
          onError={() => setError(t('attendance.capture.failed'))}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.guideText}>{t('attendance.errorNoCamera')}</Text>
        </View>
      )}

      {step === 'capture' ? (
        <FaceOvalRing
          width={frame.width}
          height={frame.height}
          state={ovalState}
          style={[
            busy && {
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
              ],
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }),
            },
            !busy &&
              framing === 'ready' && {
                transform: [
                  { scale: hold.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                ],
              },
            !busy &&
              framing !== 'ready' && {
                transform: [
                  { scale: idle.interpolate({ inputRange: [0, 1], outputRange: [1, 1.022] }) },
                ],
                opacity: idle.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }),
              },
          ]}
        />
      ) : null}

      {viewing ? (
        <Pressable
          style={styles.viewerBackdrop}
          onPress={() => setViewing(null)}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}>
          <Image
            source={{ uri: viewing }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel={t('attendance.lastFrame')}
          />
          <View style={styles.viewerHint}>
            <Text style={styles.viewerHintText}>{t('attendance.tapToClose')}</Text>
          </View>
        </Pressable>
      ) : null}

      {step === 'capture' ? (
      <View style={styles.cameraFooter}>
        <Text style={styles.guideText}>{guidance}</Text>
        {error ? <Text style={styles.cameraError}>{error}</Text> : null}
        {busy ? <ActivityIndicator color="#FFFFFF" style={styles.footerSpinner} /> : null}

        {failedFrame ? (
          <Pressable
            onPress={() => setViewing(failedFrame)}
            accessibilityRole="button"
            accessibilityLabel={t('attendance.viewLastFrame')}
            style={({ pressed }) => pressed && styles.retakePressed}>
            <Image
              source={{ uri: failedFrame }}
              style={styles.failedThumb}
              resizeMode="cover"
              accessibilityRole="image"
              accessibilityLabel={t('attendance.lastFrame')}
            />
            <Text style={styles.tapToView}>{t('attendance.tapToView')}</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}

      {step === 'confirm' && captured ? renderConfirm() : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    lead: { ...typography.body, color: c.textSecondary, marginBottom: spacing.xl },
    bannerWrap: { marginBottom: spacing.lg },
    rosterHeading: {
      ...typography.overline,
      color: c.textTertiary,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    privacy: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },

    // The camera screen is always dark: it is mostly camera feed.
    cameraScreen: { flex: 1, backgroundColor: '#000000' },

    cameraFooter: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: spacing.sm,
      paddingBottom: spacing.xxl,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    guideText: { ...typography.bodyStrong, color: '#FFFFFF', textAlign: 'center' },
    cameraError: { ...typography.caption, color: '#FF9B9B', textAlign: 'center' },
    footerSpinner: { marginTop: spacing.xs },
    failedThumb: { width: 76, height: 76, borderRadius: radius.md, opacity: 0.9 },
    tapToView: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      marginTop: 4,
      fontSize: 11,
    },

    viewerBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      zIndex: 10,
    },
    viewerHint: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: spacing.xxl,
      alignItems: 'center',
    },
    viewerHintText: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },

    confirmOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000000',
      zIndex: 20,
    },
    confirmTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    confirmHeading: { ...typography.title, color: '#FFFFFF', textAlign: 'center' },
    confirmSub: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.75)',
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    confirmWarning: {
      ...typography.caption,
      color: '#E0C55F',
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    confirmBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    confirmName: { ...typography.subtitle, color: '#FFFFFF', textAlign: 'center' },
    confirmId: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retakeLink: { padding: spacing.md, alignItems: 'center' },
    retakePressed: { opacity: 0.6 },
    retakeText: { ...typography.button, color: '#FFFFFF' },
  });
