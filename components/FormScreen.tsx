import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../constants/colors';
import { getScreenTopInset } from '../utils/safeArea';
import { NotionHeader } from './NotionHeader';
import { HeaderBackButton } from './HeaderBackButton';

type Props = {
  title: string;
  onBack: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  contentStyle?: ViewStyle;
};

export function FormScreen({ title, onBack, headerRight, children, contentStyle }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: getScreenTopInset(insets) }}>
        <NotionHeader
          title={title}
          showBorder
          leftAction={<HeaderBackButton onPress={onBack} />}
          rightAction={headerRight}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  flex: { flex: 1 },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
});
