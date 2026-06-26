import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DEFAULT_REP_PIN, isValidAccessPin, MAX_ACCESS_PIN_LENGTH } from '../constants/userCategories';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

type CreateProps = {
  mode: 'create';
  value: string;
  onChange: (pin: string) => void;
  useCustomPin: boolean;
  onUseCustomPinChange: (useCustom: boolean) => void;
};

type AdminEditProps = {
  mode: 'admin-edit';
  resetPending: boolean;
  onReset: () => void;
  onCancelReset: () => void;
};

type Props = CreateProps | AdminEditProps;

export function RepresentativePinField(props: Props) {
  if (props.mode === 'admin-edit') {
    const { resetPending, onReset, onCancelReset } = props;
    return (
      <View style={styles.field}>
        <Text style={styles.label}>PIN DE ACESSO</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            {resetPending
              ? `Ao salvar, o PIN será redefinido para ${DEFAULT_REP_PIN}.`
              : 'O representante define o próprio PIN no primeiro acesso. Você pode redefini-lo para o padrão.'}
          </Text>
          {!resetPending ? (
            <TouchableOpacity style={styles.actionBtn} onPress={onReset} activeOpacity={0.75}>
              <Text style={styles.actionBtnText}>Resetar para padrão ({DEFAULT_REP_PIN})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancelReset} activeOpacity={0.75}>
              <Text style={styles.cancelBtnText}>Cancelar reset</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const { value, onChange, useCustomPin, onUseCustomPinChange } = props;
  const pinInvalid = useCustomPin && value.length > 0 && !isValidAccessPin(value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>PIN DE ACESSO</Text>
      {!useCustomPin ? (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            Será criado com o PIN padrão <Text style={styles.pinEmphasis}>{DEFAULT_REP_PIN}</Text>.
          </Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onUseCustomPinChange(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnText}>Definir outro PIN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.hint}>Informe um PIN numérico de 4 a 8 dígitos</Text>
          <TextInput
            style={[styles.input, pinInvalid && styles.inputInvalid]}
            placeholder="••••••"
            placeholderTextColor={COLORS.textPlaceholder}
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={MAX_ACCESS_PIN_LENGTH}
            autoFocus
          />
          {pinInvalid ? (
            <Text style={styles.errorText}>PIN inválido. Use apenas números (4–8 dígitos).</Text>
          ) : null}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              onChange(DEFAULT_REP_PIN);
              onUseCustomPinChange(false);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.cancelBtnText}>Usar PIN padrão ({DEFAULT_REP_PIN})</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: SPACING.sm },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  hint: {
    color: COLORS.textPlaceholder,
    fontSize: FONTS.sizes.xs,
    marginBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.md,
  },
  cardText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
  pinEmphasis: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.backgroundSubtle,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
  },
  inputInvalid: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.xs,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  actionBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
