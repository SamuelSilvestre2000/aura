import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, HIT_TARGET, SPACING } from '../constants/colors';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useDesktopPanel } from '../contexts/DesktopPanel';

type Props = {
  /** Fecha algo além do painel (limpar seleção, por exemplo). */
  onClose?: () => void;
};

/**
 * Fechar o painel, sempre na quina superior direita.
 *
 * A quina tem um significado só — dispensar —, e quando a tela também cria
 * algo o botão de criar fica à esquerda deste. Sem isso, Clientes e Coleções
 * ficavam com "criar" exatamente onde a cidade tem "fechar", e não havia como
 * dispensar o painel a não ser clicando de novo no ícone da rail.
 *
 * Só existe no desktop: no celular as abas são destinos (não fecham) e a folha
 * da cidade se dispensa arrastando, que é o gesto dela.
 */
export function PanelCloseButton({ onClose }: Props) {
  const isDesktop = useIsDesktop();
  const { closePanel } = useDesktopPanel();

  if (!isDesktop) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onClose ?? closePanel}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Fechar"
    >
      <View style={styles.circle}>
        <Ionicons name="close" size={17} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

export const PANEL_ACTION_SIZE = 32;

const styles = StyleSheet.create({
  button: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: -SPACING.sm,
  },
  circle: {
    width: PANEL_ACTION_SIZE,
    height: PANEL_ACTION_SIZE,
    borderRadius: PANEL_ACTION_SIZE / 2,
    backgroundColor: COLORS.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
