import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { usePanelNav } from '../../hooks/usePanelNav';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PurchaseChip } from '../PurchaseChip';
import { formatBRL } from '../../utils/money';
import { clientInitials, displayClientName } from '../../utils/clientName';
import { getAvatarColor } from '../../utils/avatarColor';
import ClientDetailScreen from '../../app/client/[id]';

type Props = {
  client: Client;
  index: number;
  isLast: boolean;
  collectionId: string | null;
  purchased: boolean;
  onToggle: () => void;
  showCategoryBadges?: boolean;
  highlighted?: boolean;
  /** Coleção fechada: não é mais possível registrar compra, só ver o valor comprado. */
  closed?: boolean;
  saleAmount?: number;
};

export function ClientCard({
  client,
  index,
  isLast,
  collectionId,
  purchased,
  onToggle,
  showCategoryBadges = true,
  highlighted = false,
  closed = false,
  saleAmount,
}: Props) {
  const nav = usePanelNav();
  const { labels } = labelsFromCategoryIds(client.categoryIds);
  const name = displayClientName(client);
  const subtitle = showCategoryBadges ? labels.join(', ') : '';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        index === 0 && styles.containerFirst,
        isLast && styles.containerLast,
        index > 0 && styles.containerBorder,
        highlighted && styles.containerHighlighted,
      ]}
      onPress={() =>
        nav.open(`client-${client.id}`, <ClientDetailScreen id={client.id} />, `/client/${client.id}`)
      }
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(client.id) }]}>
        <Text style={styles.avatarText}>{clientInitials(name)}</Text>
      </View>

      {/*
        Título e uma linha de apoio, como na lista de clientes: o telefone é
        ação e mora na tela do cliente, não numa linha de lista.
      */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {/*
        O valor fica em cima e o estado embaixo, alinhados à direita: a coluna
        de reais é o que se compara de relance, e o chip de compra é o controle
        que se toca. Sem chevron — a linha inteira já abre o cliente, e o
        chevron competia com o alvo do chip.
      */}
      <View style={styles.actions}>
        {saleAmount != null && saleAmount > 0 ? (
          <Text style={styles.saleAmountText}>{formatBRL(saleAmount)}</Text>
        ) : null}
        {collectionId && !closed ? (
          <PurchaseChip purchased={purchased} onPress={onToggle} />
        ) : null}
        {collectionId && closed && (saleAmount == null || saleAmount === 0) ? (
          <Text style={styles.closedText}>Fechada</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  containerFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  containerLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  containerBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  containerHighlighted: {
    backgroundColor: COLORS.primaryBg,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { flex: 1, gap: 4 },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  actions: {
    alignItems: 'flex-end',
    gap: 3,
    flexShrink: 0,
  },
  saleAmountText: {
    ...FONTS.tabular,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  closedText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
});
