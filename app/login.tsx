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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>A</Text>
            </View>
            <Text style={styles.title}>Aura</Text>
            <Text style={styles.subtitle}>Gestão de vendas por território</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>E-MAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="nome@empresa.com"
              placeholderTextColor={COLORS.textPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SENHA</Text>
            <TextInput
              style={styles.input}
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
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
            onPress={() => handleLogin()}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.loginBtnText}>Entrar</Text>
            }
          </TouchableOpacity>

          {usesSupabase ? (
            <TouchableOpacity
              onPress={() => handleForgotPassword()}
              disabled={resetting}
              activeOpacity={0.7}
            >
              {resetting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.forgotLink}>Esqueci minha senha</Text>
              )}
            </TouchableOpacity>
          ) : null}

          <Text style={styles.hint}>
            {usesSupabase
              ? 'Use o e-mail cadastrado pelo administrador. Novos representantes recebem senha inicial 123456.'
              : 'Modo offline: use nome de usuário e PIN local.'}
          </Text>

          {!isSupabaseConfigured() ? (
            <Text style={styles.hintMuted}>
              Supabase não configurado — defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.xl, gap: SPACING.xl, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  heroIconText: { color: '#fff', fontSize: FONTS.sizes.lg, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xxl, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textAlign: 'center' },

  section: { gap: SPACING.sm },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: SPACING.xs,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },

  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: '600' },

  forgotLink: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  hint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 18 },
  hintMuted: { color: COLORS.textPlaceholder, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 18 },
});
