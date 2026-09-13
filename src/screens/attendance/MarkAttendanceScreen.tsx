import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import Icon from '../../components/Icon';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AttendanceRecord,
  EnrolledPerson,
  listCandidates,
  logAttendance,
} from '../../services/attendanceStore';
import { playCue, releaseCues } from '../../services/attendanceFeedback';
import type { DetectedFace } from '../../services/faceDetector';
import { findBestMatch, getFaceModel } from '../../services/faceRecognition';
import { AppColors, radius, spacing, typography, useThemedStyles } from '../../theme';
import {
  FaceCaptureError,
  judgeFraming,
  useFaceCapture,
  useStableFaceDetectorOutput,
} from './useFaceCapture';
import type { AttendanceStackScreenProps } from '../../navigation/types';

/** Consecutive good frames before we scan — stops firing on a passer-by. */
const STABLE_FRAMES = 4;
/** How long a result stays up, and how long before the next auto-scan. */
const RESULT_MS = 2800;

type Phase = 'idle' | 'ready' | 'scanning' | 'success' | 'error';

export default function MarkAttendanceScreen({
  navigation,
}: AttendanceStackScreenProps<'MarkAttendance'>) {
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [phase, setPhase] = useState<Phase>('idle');
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'speed' });
  const { capture } = useFaceCapture();

  const stableFrames = useRef(0);
  const scanning = useRef(false);
  const cooldownUntil = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const pulse = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;

  /** Always current, so the pinned detector output never calls a stale scan. */
  const runScanRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Warm the model up front — a 5MB load on first match would look like a hang.
  useEffect(() => {
    let active = true;
    getFaceModel()
      .then(() => active && setModelReady(true))
      .catch(() => {
        if (active) {
          setMessage(t('attendance.errorModel'));
          setPhase('error');
        }
      });
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => () => void releaseCues(), []);

  useEffect(() => {
    if (phase === 'scanning') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
    return undefined;
  }, [phase, pulse]);

  useEffect(() => {
    if (phase === 'success' || phase === 'error') {
      resultScale.setValue(0);
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, resultScale]);

  /* --------------------------------- scanning ------------------------------- */

  async function runScan() {
    if (scanning.current) {
      return;
    }
    scanning.current = true;
    setPhase('scanning');
    setMessage(null);

    try {
      const { embedding: probe } = await capture(photoOutput);
      const candidates = await listCandidates();
      const match = findBestMatch<EnrolledPerson>(probe, candidates);

      if (!match) {
        setMessage(t('attendance.resultNoMatch'));
        setPhase('error');
        void playCue('error');
      } else {
        const saved = await logAttendance({
          personId: match.item.id,
          name: match.item.name,
          score: match.score,
        });
        setRecord(saved);
        setPhase('success');
        void playCue('success');
      }
    } catch (e) {
      const reason = e instanceof FaceCaptureError ? e.reason : 'failed';
      setMessage(t(`attendance.capture.${reason}`));
      setPhase('error');
      void playCue('error');
    } finally {
      scanning.current = false;
      stableFrames.current = 0;
      cooldownUntil.current = Date.now() + RESULT_MS;
      setTimeout(() => {
        if (phaseRef.current === 'success' || phaseRef.current === 'error') {
          setPhase('idle');
          setRecord(null);
          setMessage(null);
        }
      }, RESULT_MS);
    }
  }

  runScanRef.current = runScan;

  const onFacesDetected = useCallback(
    (faces: DetectedFace[]) => {
      if (!modelReady || scanning.current || Date.now() < cooldownUntil.current) {
        return;
      }

      // Same gate as enrolment, so a scan only fires on a pose that can match.
      if (judgeFraming(faces) !== 'ready') {
        stableFrames.current = 0;
        if (phaseRef.current === 'ready') {
          setPhase('idle');
        }
        return;
      }

      stableFrames.current += 1;
      if (phaseRef.current === 'idle') {
        setPhase('ready');
      }
      if (stableFrames.current >= STABLE_FRAMES) {
        stableFrames.current = 0;
        void runScanRef.current();
      }
    },
    [modelReady],
  );

  const faceOutput = useStableFaceDetectorOutput({
    performanceMode: 'fast',
    cameraFacing: 'front',
    outputResolution: 'full',
    onFacesDetected,
    onError: useCallback(() => {
      stableFrames.current = 0;
    }, []),
  });

  const outputs = useMemo(() => [photoOutput, faceOutput], [photoOutput, faceOutput]);

  /* --------------------------------- render --------------------------------- */

  const ringColour =
    phase === 'success'
      ? '#4ADE80'
      : phase === 'error'
      ? '#FF7A7A'
      : phase === 'ready' || phase === 'scanning'
      ? '#E0C55F'
      : 'rgba(255,255,255,0.55)';

  const hint =
    phase === 'scanning'
      ? t('attendance.scanning')
      : phase === 'ready'
      ? t('attendance.holdStill')
      : !modelReady
      ? t('attendance.loadingModel')
      : t('attendance.lookAtCamera');

  return (
    <View style={styles.screen}>
      {device && hasPermission ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isFocused}
          outputs={outputs}
          onError={() => {
            setMessage(t('attendance.capture.failed'));
            setPhase('error');
          }}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.hint}>
            {hasPermission
              ? t('attendance.errorNoCamera')
              : t('attendance.errorPermission')}
          </Text>
        </View>
      )}

      <View pointerEvents="none" style={styles.ringLayer}>
        <Animated.View
          style={[
            styles.ring,
            { borderColor: ringColour },
            phase === 'scanning' && {
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
              ],
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] }),
            },
          ]}
        />
      </View>

      {phase === 'success' && record ? (
        <View pointerEvents="none" style={styles.resultLayer}>
          <Animated.View style={[styles.resultCard, { transform: [{ scale: resultScale }] }]}>
            <View style={[styles.resultBadge, styles.resultBadgeOk]}>
              <Icon name="check" size={40} color="#0F0B13" strokeWidth={3.2} />
            </View>
            <Text style={styles.thanks}>{t('attendance.thanks')}</Text>
            <View style={[styles.punchChip, record.kind === 'out' && styles.punchChipOut]}>
              <Text style={styles.punchChipText}>
                {t(
                  record.kind === 'in'
                    ? 'attendance.punchedIn'
                    : 'attendance.punchedOut',
                )}
              </Text>
            </View>
            <Text style={styles.resultName} numberOfLines={1}>
              {record.name}
            </Text>
            <Text style={styles.resultMeta}>
              {t('attendance.idLabel')} {record.personId} ·{' '}
              {new Date(record.at).toLocaleTimeString(language, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.resultScore}>
              {t('attendance.confidence', { percent: Math.round(record.score * 100) })}
            </Text>
          </Animated.View>
        </View>
      ) : null}

      {phase === 'error' && message ? (
        <View pointerEvents="none" style={styles.resultLayer}>
          <Animated.View style={[styles.resultCard, { transform: [{ scale: resultScale }] }]}>
            <View style={[styles.resultBadge, styles.resultBadgeBad]}>
              <Icon name="close" size={38} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.errorTitle}>{t('attendance.notRecognised')}</Text>
            <Text style={styles.resultMeta}>{message}</Text>
          </Animated.View>
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={12}
          style={styles.closeButton}>
          <Icon name="close" size={22} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.topTitle}>{t('attendance.markTitle')}</Text>
        <View style={styles.closeButton} />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xl }]}>
        {phase === 'scanning' ? <ActivityIndicator color="#FFFFFF" /> : null}
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </View>
  );
}

const makeStyles = (_c: AppColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000000' },
    fallback: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },

    ringLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: { width: '72%', aspectRatio: 0.78, borderRadius: 999, borderWidth: 4 },

    resultLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    resultCard: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.xl,
      backgroundColor: 'rgba(23,19,28,0.96)',
      alignSelf: 'stretch',
    },
    resultBadge: {
      width: 86,
      height: 86,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    resultBadgeOk: { backgroundColor: '#4ADE80' },
    resultBadgeBad: { backgroundColor: '#C62828' },
    thanks: { ...typography.title, color: '#4ADE80' },
    punchChip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(74,222,128,0.18)',
      marginTop: spacing.xs,
    },
    punchChipOut: { backgroundColor: 'rgba(224,197,95,0.20)' },
    punchChipText: {
      ...typography.overline,
      color: '#FFFFFF',
      fontSize: 11,
      letterSpacing: 1.2,
    },
    errorTitle: { ...typography.title, color: '#FF9B9B', textAlign: 'center' },
    resultName: { ...typography.display, color: '#FFFFFF', textAlign: 'center' },
    resultMeta: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
    },
    resultScore: {
      ...typography.caption,
      color: 'rgba(255,255,255,0.45)',
      marginTop: spacing.xs,
    },

    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.14)',
    },
    topTitle: { ...typography.subtitle, color: '#FFFFFF' },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.xl,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    hint: { ...typography.bodyStrong, color: '#FFFFFF', textAlign: 'center' },
  });
