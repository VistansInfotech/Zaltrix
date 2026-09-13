import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Avatar from '../../components/Avatar';
import Icon from '../../components/Icon';
import Screen from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import {
  AppColors,
  radius,
  shadows,
  spacing,
  typography,
  useColors,
  useThemedStyles,
} from '../../theme';

type Category = 'updates' | 'alerts';

type FeedItem = {
  id: string;
  key: 'one' | 'two' | 'three' | 'four';
  category: Category;
  minutes: number;
  /** Palette key rather than a literal, so the tag follows the scheme. */
  accent: keyof AppColors;
};

const ITEMS: FeedItem[] = [
  { id: '1', key: 'one', category: 'updates', minutes: 2, accent: 'primary' },
  { id: '2', key: 'two', category: 'alerts', minutes: 1, accent: 'success' },
  { id: '3', key: 'three', category: 'updates', minutes: 3, accent: 'accent' },
  { id: '4', key: 'four', category: 'alerts', minutes: 1, accent: 'primaryLight' },
];

const FILTERS = ['all', 'updates', 'alerts'] as const;
type Filter = (typeof FILTERS)[number];

export default function FeedScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = usePreferences();
  const { user } = useAuth();

  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('feed.greetingMorning');
    if (hour < 18) return t('feed.greetingAfternoon');
    return t('feed.greetingEvening');
  }, [t]);

  const data = useMemo(
    () => (filter === 'all' ? ITEMS : ITEMS.filter(i => i.category === filter)),
    [filter],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Stand-in for a real fetch — the list is static in this build.
    setTimeout(() => setRefreshing(false), 900);
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greetingRow}>
              <View style={styles.greetingText}>
                <Text style={styles.greeting} numberOfLines={1}>
                  {greeting}
                  {firstName ? `, ${firstName}` : ''}
                </Text>
                <Text style={styles.screenTitle}>{t('feed.title')}</Text>
              </View>
              {user ? <Avatar name={user.name} size={46} uri={user.avatar} /> : null}
            </View>

            <View style={styles.filters}>
              {FILTERS.map(f => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f }}
                  style={({ pressed }) => [
                    styles.chip,
                    filter === f && styles.chipActive,
                    pressed && styles.chipPressed,
                  ]}>
                  <Text
                    style={[
                      styles.chipLabel,
                      filter === f && styles.chipLabelActive,
                    ]}>
                    {t(
                      f === 'all'
                        ? 'feed.filterAll'
                        : f === 'updates'
                        ? 'feed.filterUpdates'
                        : 'feed.filterAlerts',
                    )}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <FeedCard item={item} t={t} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="feed" size={38} color={colors.textTertiary} strokeWidth={1.6} />
            <Text style={styles.emptyTitle}>{t('feed.empty')}</Text>
            <Text style={styles.emptyBody}>{t('feed.emptyBody')}</Text>
          </View>
        }
      />
    </Screen>
  );
}

function FeedCard({
  item,
  t,
}: {
  item: FeedItem;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const accent = colors[item.accent];
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardTop}>
        <View style={[styles.tag, { backgroundColor: accent + '1A' }]}>
          <Text style={[styles.tagText, { color: accent }]}>
            {t(`feed.items.${item.key}.tag`)}
          </Text>
        </View>
        <Text style={styles.meta}>{t('feed.minRead', { count: item.minutes })}</Text>
      </View>

      <Text style={styles.cardTitle}>{t(`feed.items.${item.key}.title`)}</Text>
      <Text style={styles.cardBody}>{t(`feed.items.${item.key}.body`)}</Text>
    </Pressable>
  );
}

const makeStyles = (c: AppColors, t: { shadow: (typeof shadows)['light'] }) =>
  StyleSheet.create({
    list: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    header: { paddingTop: spacing.md, paddingBottom: spacing.xs },
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    greetingText: { flex: 1, gap: 2 },
    greeting: { ...typography.body, color: c.textSecondary },
    screenTitle: { ...typography.display, color: c.textPrimary },
    filters: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceAlt,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipPressed: { opacity: 0.75 },
    chipLabel: { ...typography.caption, color: c.textSecondary, fontWeight: '600' },
    chipLabelActive: { color: c.textOnPrimary },

    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.sm,
      ...(t.shadow.card as object),
    },
    cardPressed: { transform: [{ scale: 0.995 }], backgroundColor: c.surfaceAlt },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tag: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    tagText: { ...typography.caption, fontWeight: '700', fontSize: 11 },
    meta: { ...typography.caption, color: c.textTertiary },
    cardTitle: { ...typography.subtitle, color: c.textPrimary },
    cardBody: { ...typography.body, color: c.textSecondary },

    empty: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxxl,
    },
    emptyTitle: { ...typography.subtitle, color: c.textPrimary },
    emptyBody: {
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
