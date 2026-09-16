import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import {
  findPayslip,
  netPay,
  sumComponents,
  type PayComponent,
  type Payslip,
} from '../../services/workspaceData';
import {
  AppColors,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';
import { formatMoney, formatMonthKey } from '../../utils/format';
import { payslipTone, StatusChip } from './shared';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

const HEADER_EDGES = ['left', 'right'] as const;

/**
 * One payslip, broken into what was earned and what was taken off.
 *
 * Both totals are summed from the lines rather than stored beside them, so the
 * breakdown and the headline figure cannot disagree — which is the one thing
 * that makes a payslip worth nothing.
 */
export default function PayslipScreen({
  route,
}: WorkspaceStackScreenProps<'Payslip'>) {
  const { id } = route.params;
  const { t, language } = usePreferences();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  const [slip, setSlip] = useState<Payslip | null>(null);

  useEffect(() => {
    let active = true;
    void findPayslip(id).then(found => {
      if (active) {
        setSlip(found ?? null);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!slip) {
    return (
      <Screen edges={HEADER_EDGES} contentStyle={styles.content}>
        <View />
      </Screen>
    );
  }

  const tone = payslipTone(slip.status, colors);
  const gross = sumComponents(slip.earnings);
  const taken = sumComponents(slip.deductions);
  const money = (amount: number) => formatMoney(amount, slip.currency, language);

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      <Card style={styles.hero}>
        <Text style={styles.month}>{formatMonthKey(slip.month, language)}</Text>
        <Text style={styles.net}>{money(netPay(slip))}</Text>
        <Text style={styles.netLabel}>{t('workspace.salary.net')}</Text>
        <View style={styles.chipRow}>
          <StatusChip label={t(`workspace.salary.status.${slip.status}`)} tone={tone} />
        </View>
        {slip.paidOn ? (
          <Text style={styles.paidOn}>
            {t('workspace.salary.paidOn', {
              date: new Date(slip.paidOn).toLocaleDateString(language, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            })}
          </Text>
        ) : null}
      </Card>

      <Text style={styles.heading}>{t('workspace.salary.earnings')}</Text>
      <Card flush>
        {slip.earnings.map((line, index) => (
          <Line
            key={line.label}
            line={line}
            format={money}
            t={t}
            last={index === slip.earnings.length - 1}
          />
        ))}
      </Card>
      <Total label={t('workspace.salary.gross')} value={money(gross)} />

      <Text style={styles.heading}>{t('workspace.salary.deductions')}</Text>
      <Card flush>
        {slip.deductions.map((line, index) => (
          <Line
            key={line.label}
            line={line}
            format={money}
            t={t}
            negative
            last={index === slip.deductions.length - 1}
          />
        ))}
      </Card>
      <Total label={t('workspace.salary.deductions')} value={`− ${money(taken)}`} />

      <View style={styles.netRow}>
        <Text style={styles.netRowLabel}>{t('workspace.salary.net')}</Text>
        <Text style={styles.netRowValue}>{money(netPay(slip))}</Text>
      </View>

      <Text style={styles.note}>{t('workspace.staticNote')}</Text>
    </Screen>
  );
}

function Line({
  line,
  format,
  t,
  negative = false,
  last = false,
}: {
  line: PayComponent;
  format: (amount: number) => string;
  t: (key: string) => string;
  negative?: boolean;
  last?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.line, last && styles.lineLast]}>
      <Text style={styles.lineLabel} numberOfLines={1}>
        {t(`workspace.salary.component.${line.label}`)}
      </Text>
      <Text style={[styles.lineValue, negative && styles.lineNegative]}>
        {negative ? '− ' : ''}
        {format(line.amount)}
      </Text>
    </View>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    hero: {
      alignItems: 'center',
      gap: 2,
      marginBottom: spacing.md,
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
      borderWidth: 1,
    },
    month: {
      ...typography.caption,
      color: c.primaryDark,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    net: { ...typography.display, color: c.primary },
    netLabel: { ...typography.caption, color: c.textSecondary },
    chipRow: { marginTop: spacing.sm },
    paidOn: { ...typography.caption, color: c.textSecondary, marginTop: spacing.xs },

    heading: {
      ...typography.caption,
      color: c.textTertiary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.1,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    lineLast: { borderBottomWidth: 0 },
    lineLabel: { ...typography.body, color: c.textPrimary, flex: 1 },
    lineValue: { ...typography.bodyStrong, color: c.textPrimary, fontSize: 15 },
    lineNegative: { color: c.danger },

    total: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    totalLabel: { ...typography.caption, color: c.textSecondary },
    totalValue: { ...typography.caption, color: c.textSecondary, fontWeight: '700' },

    netRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
    },
    netRowLabel: { ...typography.subtitle, color: c.textPrimary },
    netRowValue: { ...typography.title, color: c.primary },

    note: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
