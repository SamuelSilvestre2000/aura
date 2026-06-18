import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useRouter } from 'expo-router';
import { CategoryPillRow } from '../CategoryPill';
import { labelsFromCategoryIds } from '../../constants/categoryPills';
import { PurchaseChip } from '../PurchaseChip';

type Props = {
  client: Client;
  index: number;
  isLast: boolean;
  collectionId: string | null;
  purchased: boolean;
  onToggle: () => void;
};

export function ClientCard({
  client,
  index,
  isLast,
  collectionId,
  purchased,
  onToggle,
}: Props) {
  const router = useRouter();
  const { labels, slugs } = labelsFromCategoryIds(client.categoryIds);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        index === 0 && styles.containerFirst,
        isLast && styles.containerLast,
        index > 0 && styles.containerBorder,
      ]}
      onPress={() => router.push(`/client/${client.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
        {labels.length > 0 ? (
          <CategoryPillRow labels={labels} slugs={slugs} />
        ) : null}
        {client.phone ? (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.phone} numberOfLines={1}>{client.phone}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {collectionId && (
          <PurchaseChip
            purchased={purchased}
            onPress={onToggle}
          />
        )}
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
  body: { flex: 1, gap: 4 },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  phone: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 0,
  },
});
