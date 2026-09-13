import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { spacing, useColors } from '../theme';

type Props = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView — off for screens that manage their own list. */
  scroll?: boolean;
  /** Lift content above the keyboard. Defaults to true for form screens. */
  avoidKeyboard?: boolean;
  edges?: readonly Edge[];
  background?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function Screen({
  children,
  scroll = false,
  avoidKeyboard = false,
  edges = ['top', 'left', 'right'],
  background,
  style,
  contentStyle,
}: Props) {
  const colors = useColors();
  const bg = background ?? colors.background;

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: bg }, style]}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
});
