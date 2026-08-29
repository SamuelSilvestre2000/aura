import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type Props = {
  title: string;
  /** Explicação da seção — em lista agrupada ela vive abaixo do cartão. */
  footer?: string;
  /**
   * `rows` (padrão): os filhos são FormRow e desenham as próprias divisórias.
   * `plain`: bloco com respiro interno, para conteúdo que não é linha de campo.
   */
  variant?: 'rows' | 'plain';
  children: React.ReactNode;
};

/**
 * Seção de formulário em lista agrupada: cabeçalho pequeno fora do cartão,
 * cartão sem sombra e linhas encostadas separadas por hairline.
 */
export function FormSection({ title, footer, variant = 'rows', children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.card, variant === 'plain' && styles.cardPlain]}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  title: {
    ...FONTS.text.sectionHeader,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  cardPlain: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    paddingHorizontal: SPACING.xs,
  },
});
