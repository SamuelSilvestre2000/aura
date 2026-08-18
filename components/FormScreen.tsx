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
import { useIsDesktop } from '../hooks/useIsDesktop';
import { NotionHeader } from './NotionHeader';
import { HeaderBackButton } from './HeaderBackButton';
import { PullToRefresh } from './PullToRefresh';
import { getTopBarInset } from './TopTabBar';

type Props = {
  title: string;
  onBack: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  contentStyle?: ViewStyle;
  /** Quando informado, habilita puxar-para-atualizar no conteúdo do formulário. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function FormScreen({
  title,
  onBack,
  headerRight,
  children,
  contentStyle,
  onRefresh,
  refreshing = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  /**
   * No desktop esta tela é empilhada dentro da sidebar, ao lado dos painéis
   * base (Clientes/Coleções/Conta) — o header precisa reservar o mesmo
   * espaço do topo que eles (getTopBarInset) para os títulos alinharem na
   * mesma altura. No mobile ela ainda é página cheia sem barra por cima.
   */
  const headerTopInset = isDesktop ? getTopBarInset(insets) : getScreenTopInset(insets);

  const scrollView = (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: headerTopInset }}>
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
        {onRefresh ? (
          <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
            {scrollView}
          </PullToRefresh>
        ) : (
          scrollView
        )}
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
