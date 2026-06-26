import React, { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { listUsers } from '../services/users';
import { User } from '../types';
import { ROLE_LABELS } from '../constants/permissions';
import { formatCategoryNames } from '../constants/userCategories';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace('/(tabs)');
  }, [authLoading, user, router]);

  useEffect(() => {
    listUsers()
      .then((data) => {
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0].id);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  const handleLogin = async (pinValue?: string) => {
    if (!selectedUser) return;
    const finalPin = pinValue ?? pin;
    if (!finalPin.trim()) { Alert.alert('Atenção', 'Informe o PIN de acesso.'); return; }
    setSubmitting(true);
    try {
      const ok = await login(selectedUser.name, finalPin);
      if (!ok) { Alert.alert('PIN incorreto', 'Tente novamente.'); setPin(''); return; }
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingUsers) {
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

          {/* Header */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>A</Text>
            </View>
            <Text style={styles.title}>Aura</Text>
            <Text style={styles.subtitle}>Gestão de vendas por território</Text>
          </View>

          {/* Quem está acessando */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>QUEM ESTÁ ACESSANDO</Text>
            <View style={styles.card}>
              {users.map((item, index) => {
                const active = item.id === selectedUserId;
                return (
                  <React.Fragment key={item.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <TouchableOpacity
                      style={styles.userRow}
                      onPress={() => { setSelectedUserId(item.id); setPin(''); }}
                      activeOpacity={0.7}
                    >
                      {item.photoUri ? (
                        <Image source={{ uri: item.photoUri }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatarPlaceholder, active && styles.avatarPlaceholderActive]}>
                          <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, active && styles.userNameActive]}>{item.name}</Text>
                        <Text style={styles.userMeta}>
                          {ROLE_LABELS[item.role]}
                          {item.categories.length > 0 ? ` · ${formatCategoryNames(item.categories)}` : ''}
                        </Text>
                      </View>
                      {active && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* PIN */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PIN DE ACESSO</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="••••••"
              placeholderTextColor={COLORS.textPlaceholder}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, submitting && styles.loginBtnDisabled]}
            onPress={() => handleLogin()}
            disabled={submitting || !selectedUser}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.loginBtnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <Text style={styles.hint}>
            Representantes novos usam o PIN padrão 123456 até definirem outro.
          </Text>
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

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.surfaceBorder },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSubtle,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.primary,
  },
  avatarText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.md, fontWeight: '700' },
  avatarTextActive: { color: COLORS.primary },
  userInfo: { flex: 1 },
  userName: { color: COLORS.textPrimary, fontSize: FONTS.sizes.md, fontWeight: '500' },
  userNameActive: { color: COLORS.primary, fontWeight: '600' },
  userMeta: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginTop: 1 },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  pinRowWrap: { padding: SPACING.lg, gap: SPACING.md },
  pinHint: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  pinRow: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
  pinChip: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSubtle,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pinChipText: { color: COLORS.textPrimary, fontSize: FONTS.sizes.xl, fontWeight: '600' },
  pinChipTextActive: { color: '#fff' },

  pinInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    letterSpacing: 8,
    textAlign: 'center',
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

  hint: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, textAlign: 'center', lineHeight: 18 },
});
