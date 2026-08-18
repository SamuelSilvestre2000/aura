import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useDesktopPanel, PANEL_WIDTH } from '../contexts/DesktopPanel';
import { COLORS, RADIUS, SPACING } from '../constants/colors';
import ClientsScreen from '../app/(tabs)/clients';
import CollectionsScreen from '../app/(tabs)/collections';
import SettingsScreen from '../app/(tabs)/settings';

/** `backdropFilter` não existe no ViewStyle do React Native — só roda na web (isDesktop já exige Platform.OS === 'web'), então nativo nunca chega a montar isto. */
const WEB_BLUR = {
  backdropFilter: 'blur(24px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
} as any;

/**
 * No desktop, Clientes/Coleções/Conta abrem como painel que flutua sobre o
 * mapa (estilo Apple Maps) em vez de navegar para uma página cheia — o mapa
 * continua ocupando a tela inteira por baixo. O painel começa depois da
 * cápsula de ícones (railWidthAnim + o vão entre as duas). As telas em si não
 * mudam: cada uma já reserva espaço no topo para a TopTabBar, então funcionam
 * sem alteração dentro do painel.
 */
export function DesktopSidePanel() {
  const isDesktop = useIsDesktop();
  const { panel, cityContent, searchContent, stack, railWidthAnim } = useDesktopPanel();

  if (!isDesktop || (!panel && stack.length === 0)) return null;

  const top = stack[stack.length - 1];

  // A cápsula da rail já flutua com margem SPACING.md — soma outro SPACING.md
  // de vão entre as duas, mais a margem própria do painel.
  const panelLeft = Animated.add(railWidthAnim, SPACING.md * 2);

  return (
    <Animated.View style={[styles.panel, { left: panelLeft }, WEB_BLUR]}>
      {top ? (
        top.node
      ) : (
        <>
          {panel === 'clients' && <ClientsScreen />}
          {panel === 'collections' && <CollectionsScreen />}
          {panel === 'settings' && <SettingsScreen />}
          {panel === 'city' && cityContent}
          {panel === 'search' && searchContent}
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: SPACING.md,
    bottom: SPACING.md,
    zIndex: 10,
    width: PANEL_WIDTH,
    maxWidth: '45%',
    backgroundColor: COLORS.floatingPanelBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.floatingBorder,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 10,
  },
});
