import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Card from '../../components/Card';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { usePreferences } from '../../context/PreferencesContext';
import { listPayslips, netPay, type Payslip } from '../../services/workspaceData';
import { AppColors, spacing, typography, useThemedStyles } from '../../theme';
import { formatMoney } from '../../utils/format';
import { PayslipRow } from './shared';
import type { WorkspaceStackScreenProps } from '../../navigation/types';

/** Under a native header, which has already cleared the status bar. */
const HEADER_EDGES = ['left', 'right'] as const;

/**
 * Every payslip, newest month first.
 *
 * A payslip already belongs to exactly one month, so the "month-wise" grouping
 * other lists need would put one row under each heading here — noise, not
 * structure. The month *is* the row.
 */
export default function SalaryScreen({
  navigation,
}: WorkspaceStackScreenProps<'Salary'>) {
  const { t, language } = usePreferences();
  const styles = useThemedStyles(makeStyles);

  const [slips, setSlips] = useState<Payslip[] | null>(null);

  useEffect(() => {
    let active = true;
    void listPayslips().then(rows => {
      if (active) {
        setSlips(rows);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  /** Paid so far this calendar year — the number people actually look for. */
  const earned = useMemo(() => {
    if (!slips) {
      return null;
    }
    const year = `${new Date().getFullYear()}`;
    const paid = slips.filter(
      slip => slip.month.startsWith(year) && slip.status === 'paid',
    );
    return paid.length > 0
      ? {
          total: paid.reduce((sum, slip) => sum + netPay(slip), 0),
          currency: paid[0].currency,
          months: paid.length,
        }
      : null;
  }, [slips]);

  return (
    <Screen scroll edges={HEADER_EDGES} contentStyle={styles.content}>
      <Text style={styles.lead}>{t('workspace.salary.lead')}</Text>

      {earned ? (
        <Card style={styles.total}>
          <Text style={styles.totalLabel}>{new Date().getFullYear()}</Text>
          <Text style={styles.totalValue}>
            {formatMoney(earned.total, earned.currency, language)}
          </Text>
          <Text style={styles.totalMeta}>
            {t('workspace.salary.status.paid')} · {earned.months}
          </Text>
        </Card>
      ) : null}

      {slips && slips.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <Icon name="wallet" size={28} strokeWidth={1.6} />
            <Text style={styles.emptyText}>{t('workspace.salary.empty')}</Text>
          </View>
        </Card>
      ) : null}

      {slips && slips.length > 0 ? (
        <Card flush style={styles.list}>
          {slips.map((slip, index) => (
            <PayslipRow
              key={slip.id}
              slip={slip}
              locale={language}
              t={t}
              last={index === slips.length - 1}
              onPress={() => navigation.navigate('Payslip', { id: slip.id })}
            />
          ))}
        </Card>
      ) : null}

      <Text style={styles.note}>{t('workspace.staticNote')}</Text>
    </Screen>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
    lead: { ...typography.body, color: c.textSecondary, marginBottom: spacing.lg },
    total: {
      alignItems: 'center',
      gap: 2,
      marginBottom: spacing.lg,
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
      borderWidth: 1,
    },
    totalLabel: {
      ...typography.caption,
      color: c.primaryDark,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    totalValue: { ...typography.display, color: c.primary },
    totalMeta: { ...typography.caption, color: c.textSecondary },
    list: { marginBottom: spacing.lg },
    empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { ...typography.caption, color: c.textSecondary, textAlign: 'center' },
    note: {
      ...typography.caption,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
