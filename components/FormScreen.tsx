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
import { useScreenTopInset } from '../hooks/useScreenTopInset';

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
   * Mesma regra de todas as telas: dentro do painel do desktop a moldura do
   * painel já é a margem; no mobile isto é página cheia, sem barra por cima.
   */
  const headerTopInset = useScreenTopInset('modal');

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
    <View style={[styles.container, isDesktop && styles.containerDesktop]}>
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
  // No painel flutuante do desktop, deixa o vidro do painel (DesktopSidePanel)
  // aparecer em vez de cobrir tudo com fundo opaco. Totalmente transparente
  // (não translúcido) — empilhar duas camadas translúcidas soma opacidade.
  containerDesktop: {
    backgroundColor: 'transparent',
  },
  flex: { flex: 1 },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
});
