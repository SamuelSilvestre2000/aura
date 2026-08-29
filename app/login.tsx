import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Alert } from '../utils/alert';
import { requestPasswordReset } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase/client';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';
import { FormRow } from '../components/FormRow';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, loading: authLoading, usesSupabase } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace('/(tabs)');
  }, [authLoading, user, router]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Atenção', 'Informe sua senha.');
      return;
    }

    setSubmitting(true);
    try {
      const ok = await login(normalizedEmail, password);
      if (!ok) {
        Alert.alert(
          'Acesso negado',
          usesSupabase
            ? 'E-mail ou senha incorretos, ou perfil ainda não vinculado.'
            : 'Credenciais incorretas.'
        );
        setPassword('');
        return;
      }
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('E-mail necessário', 'Informe seu e-mail acima para receber o link de recuperação.');
      return;
    }

    setResetting(true);
    try {
      await requestPasswordReset(normalizedEmail);
      Alert.alert(
        'E-mail enviado',
        'Se existir uma conta com este e-mail, você receberá instruções para redefinir a senha.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível enviar o e-mail.';
      Alert.alert('Erro', msg);
    } finally {
      setResetting(false);
    }
  };

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/*
            Coluna de largura fixa e centrada. Sem ela o campo de e-mail
            acompanhava a janela e passava de mil pixels de largura no desktop —
            a tela nunca teve tratamento para tela grande.
          */}
          <View style={styles.column}>
            <View style={styles.hero}>
              <View style={styles.mark}>
                <Text style={styles.markText}>A</Text>
              </View>
              <Text style={styles.title}>Aura</Text>
              <Text style={styles.subtitle}>Gestão de vendas por território</Text>
            </View>

            {/*
              Os campos são linhas de lista agrupada, como em todo formulário do
              app: rótulo à esquerda, valor à direita, divisória fina entre as
              duas. A caixa cinza com rótulo em caixa alta por cima é vocabulário
              de formulário web, e já tinha saído do resto das telas.
            */}
            <View style={styles.card}>
              <FormRow label="E-mail" first>
                <TextInput
                  style={styles.rowInput}
                  placeholder="nome@empresa.com"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="username"
                  returnKeyType="next"
                />
              </FormRow>

              <FormRow label="Senha">
                <TextInput
                  style={styles.rowInput}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={() => handleLogin()}
                />
              </FormRow>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
              onPress={() => handleLogin()}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Entrar"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Entrar</Text>
              )}
            </TouchableOpacity>

            {usesSupabase ? (
              <TouchableOpacity
                onPress={() => handleForgotPassword()}
                disabled={resetting}
                activeOpacity={0.7}
                style={styles.forgotBtn}
                accessibilityRole="button"
              >
                {resetting ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.forgotLink}>Esqueci minha senha</Text>
                )}
              </TouchableOpacity>
            ) : null}

            {/*
              A dica antiga trazia a senha inicial em texto puro, numa tela que
              qualquer um alcança sem estar autenticado. Quem precisa dela é o
              administrador, que a entrega junto com o cadastro.
            */}
            <Text style={styles.hint}>
              {usesSupabase
                ? 'Use o e-mail cadastrado pelo administrador. A senha inicial é entregue por ele.'
                : 'Modo offline: use nome de usuário e PIN local.'}
            </Text>

            {!isSupabaseConfigured() ? (
              <Text style={styles.hintMuted}>
                Supabase não configurado — defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Medida da folha de entrada do sistema — larga o bastante para um e-mail longo. */
const CARD_MAX_WIDTH = 380;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.backgroundSubtle },
  center: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /*
    flexGrow e não flex: o conteúdo centraliza quando cabe na tela e volta a
    rolar quando o teclado o espreme, em vez de ficar preso e cortado.
  */
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  column: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    gap: SPACING.lg,
  },

  hero: { alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.md },
  mark: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  markText: {
    color: '#fff',
    fontSize: FONTS.sizes.xxl,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: { ...FONTS.text.title1, color: COLORS.textPrimary },
  subtitle: {
    ...FONTS.text.subheadline,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  /*
    alignSelf esticado para o toque pegar a linha inteira: dentro do FormRow o
    controle alinha à direita, e sem isto o campo ocuparia só a largura do texto
    já digitado — um alvo que começa com poucos pixels.
  */
  rowInput: {
    alignSelf: 'stretch',
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    paddingVertical: 0,
    textAlign: 'right',
  },

  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { ...FONTS.text.headline, color: '#fff' },

  forgotBtn: { alignItems: 'center', paddingVertical: SPACING.xs },
  forgotLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
  },

  hint: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  hintMuted: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
