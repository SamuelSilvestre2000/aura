import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Client } from '../../types';
import { STATUS_COLORS, COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useRouter } from 'expo-router';

type Props = {
  client: Client;
  collectionId: string | null;
  purchased: boolean;
  onToggle: () => void;
};

export function ClientCard({ client, collectionId, purchased, onToggle }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/client/${client.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: purchased ? STATUS_COLORS.all : COLORS.surfaceBorderStrong }]} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
          {client.phone && (
            <Text style={styles.phone} numberOfLines={1}>{client.phone}</Text>
          )}
        </View>
      </View>
      {collectionId && (
        <TouchableOpacity
          style={[styles.toggle, purchased && styles.toggleActive]}
          onPress={(e) => { e.stopPropagation(); onToggle(); }}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, purchased && styles.toggleTextActive]}>
            {purchased ? 'Comprou' : 'Pendente'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  info: { flex: 1 },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  phone: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 1,
  },
  toggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.backgroundSubtle,
    flexShrink: 0,
  },
  toggleActive: {
    backgroundColor: COLORS.successBg,
    borderColor: STATUS_COLORS.all,
  },
  toggleText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: STATUS_COLORS.all,
    fontWeight: '600',
  },
});
