import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Banner from '../../components/Banner';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DateField from '../../components/DateField';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { usePreferences } from '../../context/PreferencesContext';
import {
  BOOKING_TYPES,
  createBooking,
  type BookingType,
} from '../../services/workspaceData';
import {
  AppColors,
  radius,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import { BOOKING_ICONS, bookingTypeTint } from './shared';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

const HEADER_EDGES = ['left', 'right'] as const;

/** Kinds that occupy a span of time rather than a single moment. */
const SPANS_TIME: ReadonlySet<BookingType> = new Set(['hotel', 'flight', 'train']);

type Errors = Partial<
  Record<'title' | 'reference' | 'amount' | 'start' | 'end', string>
>;

/**
 * Raising a booking by hand.
 *
 * The kind is chosen first, as a vertical list rather than a dropdown: there
 * are only five, each has a recognisable icon, and the choice changes what the
 * rest of the form is asking for — a hotel wants a property and two dates, a
 * car wants a route and one.
 */
export default function NewBookingScreen({
  navigation,
}: WorkspaceStackScreenProps<'NewBooking'>) {
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [type, setType] = useState<BookingType>('flight');
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [starts, setStarts] = useState<Date | null>(null);
  const [ends, setEnds] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  /** Anything from five years back to five years out covers a booking. */
  const bounds = useMemo(() => {
    const from = new Date();
    from.setFullYear(from.getFullYear() - 5);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 5);
    return { from, to };
  }, []);

  const spansTime = SPANS_TIME.has(type);

  function validate(): boolean {
    const next: Errors = {};

    if (!title.trim()) {
      next.title = t('workspace.newBooking.errorTitle');
    }
    if (!reference.trim()) {
      next.reference = t('workspace.newBooking.errorReference');
    }
    // Commas and spaces are how people type money; strip them before judging.
    const parsed = Number(amount.replace(/[^0-9.]/g, ''));
    if (!amount.trim() || Number.isNaN(parsed)) {
      next.amount = t('workspace.newBooking.errorAmount');
    }
    if (!starts) {
      next.start = t('workspace.newBooking.errorStart');
    } else if (ends && ends < starts) {
      next.end = t('workspace.newBooking.errorEndBefore');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) {
      return;
    }
    setSaving(true);
    await createBooking({
      type,
      title,
      reference,
      // Validated above.
      startsAt: starts!.toISOString(),
      // A kind that happens in a moment never carries an end, whatever was
      // left in the field before the kind was switched.
      endsAt: spansTime && ends ? ends.toISOString() : null,
      amount: Number(amount.replace(/[^0-9.]/g, '')),
    });
    setSaving(false);
    // Back to the grid, which re-reads on focus and shows the new row.
    navigation.goBack();
  }

  return (
    <Screen scroll avoidKeyboard edges={HEADER_EDGES} contentStyle={styles.content}>
      <Text style={styles.heading}>{t('workspace.newBooking.chooseType')}</Text>
      {/* Small blocks that wrap, not a full-height list: five rows at 60pt
          each pushed the fields that actually need typing below the fold.
          Each carries the colour its kind wears everywhere else, so the
          selection is readable without hunting for the filled radio. */}
      <View style={styles.typeGrid}>
        {BOOKING_TYPES.map(option => {
          const selected = type === option;
          const tint = bookingTypeTint(option, colors);
          const label = t(`workspace.bookings.type.${option}`);
          return (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              style={({ pressed }) => [
                styles.typeBlock,
                selected
                  ? { backgroundColor: tint.bg, borderColor: tint.fg }
                  : styles.typeBlockIdle,
                pressed && styles.typeBlockPressed,
              ]}>
              <View
                style={[
                  styles.typeIcon,
                  { backgroundColor: selected ? tint.fg : colors.surfaceAlt },
                ]}>
                <Icon
                  name={BOOKING_ICONS[option]}
                  size={20}
                  color={selected ? colors.textOnPrimary : colors.textTertiary}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[
                  styles.typeLabel,
                  selected && { color: tint.fg, fontWeight: '700' },
                ]}
                numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.heading}>{t('workspace.newBooking.details')}</Text>
      <Card>
        <TextField
          label={t('workspace.newBooking.titleLabel')}
          placeholder={t(
            type === 'hotel'
              ? 'workspace.newBooking.titlePlaceholderStay'
              : 'workspace.newBooking.titlePlaceholderTravel',
          )}
          value={title}
          onChangeText={v => {
            setTitle(v);
            setErrors(e => ({ ...e, title: undefined }));
          }}
          error={errors.title}
          autoCapitalize="words"
        />
        <TextField
          label={t('workspace.newBooking.referenceLabel')}
          placeholder={t('workspace.newBooking.referencePlaceholder')}
          value={reference}
          onChangeText={v => {
            setReference(v);
            setErrors(e => ({ ...e, reference: undefined }));
          }}
          error={errors.reference}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TextField
          label={t('workspace.newBooking.amountLabel')}
          placeholder={t('workspace.newBooking.amountPlaceholder')}
          value={amount}
          onChangeText={v => {
            setAmount(v);
            setErrors(e => ({ ...e, amount: undefined }));
          }}
          error={errors.amount}
          keyboardType="numeric"
        />
      </Card>

      <Text style={styles.heading}>{t('workspace.newBooking.when')}</Text>
      <Card>
        <DateField
          label={t('workspace.newBooking.startLabel')}
          placeholder={t('workspace.newBooking.startPlaceholder')}
          value={starts}
          onChange={date => {
            setStarts(date);
            setErrors(e => ({ ...e, start: undefined }));
          }}
          error={errors.start}
          minimumDate={bounds.from}
          maximumDate={bounds.to}
          locale={language}
          doneLabel={t('common.done')}
          closeLabel={t('common.close')}
        />
        {/* Only for the kinds that occupy a span. A car to the airport has no
            end time, and asking for one invites a made-up answer. */}
        {spansTime ? (
          <DateField
            label={t('workspace.newBooking.endLabel')}
            placeholder={t('workspace.newBooking.endPlaceholder')}
            hint={t('workspace.newBooking.endOptional')}
            value={ends}
            onChange={date => {
              setEnds(date);
              setErrors(e => ({ ...e, end: undefined }));
            }}
            error={errors.end}
            minimumDate={starts ?? bounds.from}
            maximumDate={bounds.to}
            locale={language}
            doneLabel={t('common.done')}
            closeLabel={t('common.close')}
          />
        ) : null}
      </Card>

      <View style={styles.noticeWrap}>
        <Banner tone="info" message={t('workspace.bookings.status.new')} />
      </View>

      <Button
        label={
          saving
            ? t('workspace.newBooking.saving')
            : t('workspace.newBooking.submit')
        }
        loading={saving}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    heading: {
      ...typography.caption,
      color: c.textTertiary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },


    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    typeBlock: {
      // Three to a row on a phone, five across on a tablet — sized by content
      // rather than a fraction, so the labels never have to be clipped.
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 96,
      flexGrow: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1.5,
    },
    typeBlockIdle: { backgroundColor: c.surface, borderColor: c.border },
    typeBlockPressed: { opacity: 0.7 },
    typeIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeLabel: { ...typography.caption, color: c.textSecondary, fontWeight: '600' },

    noticeWrap: { marginTop: spacing.lg },
    submit: { marginTop: spacing.lg },
  });
