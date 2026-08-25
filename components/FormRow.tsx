import React, { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, HIT_TARGET, SPACING } from '../constants/colors';

type Props = {
  label: string;
  /** Marca o campo como obrigatório sem recorrer a asterisco vermelho. */
  required?: boolean;
  /** Primeira linha do cartão não leva divisória em cima. */
  first?: boolean;
  /** Campo alto (seletor, lista) — alinha o rótulo ao topo em vez de ao centro. */
  alignTop?: boolean;
  children: ReactNode;
};

/**
 * Uma linha de formulário em lista agrupada: rótulo fixo à esquerda, controle à
 * direita, divisória começando depois do rótulo. É a anatomia dos formulários
 * do sistema — a caixa cinza em volta de cada campo, com o rótulo miúdo por
 * cima, é vocabulário de formulário web.
 */
export function FormRow({ label, required = false, first = false, alignTop = false, children }: Props) {
  return (
    <View style={[styles.row, !first && styles.rowBorder, alignTop && styles.rowTop]}>
      <View style={styles.labelWrap}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {required ? <Text style={styles.required}>Obrigatório</Text> : null}
      </View>
      <View style={styles.control}>{children}</View>
    </View>
  );
}

const LABEL_WIDTH = 112;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: HIT_TARGET,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  rowTop: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.surfaceBorder,
  },
  labelWrap: {
    width: LABEL_WIDTH,
    flexShrink: 0,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
  },
  required: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
  },
  control: {
    flex: 1,
    minWidth: 0,
  },
});
