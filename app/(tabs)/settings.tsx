import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { clearGeoCache } from '../../services/ibge';
import { getDatabase } from '../../services/database';
import { deleteUser, listUsers } from '../../services/users';
import { useMapTheme } from '../../hooks/useMapTheme';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';
import { ROLE_LABELS } from '../../constants/permissions';
import { formatCategoryNames } from '../../constants/userCategories';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { MapTheme } from '../../services/preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme: mapTheme, setTheme: setMapTheme } = useMapTheme();
  const { user, logout, can: canDo, isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const canManageUsers = canDo('manage_users');
  const canResetDb = canDo('reset_database');
  const canClearCache = canDo('clear_geo_cache');

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setLoadingUsers(true);
    try {
      setUsers(await listUsers());
    } finally {
      setLoadingUsers(false);
    }
  }, [canManageUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const handleClearGeoCache = async () => {
    Alert.alert(
      'Limpar cache do mapa',
      'Os dados do mapa serão baixados novamente na próxima abertura. Isso requer conexão à internet.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          onPress: async () => {
            await clearGeoCache();
            Alert.alert('Sucesso', 'Cache limpo! Reinicie o app para recarregar o mapa.');
          },
        },
      ]
    );
  };

  const handleResetDB = async () => {
    Alert.alert(
      '⚠️ Resetar banco de dados',
      'ATENÇÃO: Todos os clientes, coleções e compras serão apagados permanentemente!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar TUDO',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await db.execAsync('DELETE FROM purchases; DELETE FROM clients; DELETE FROM collections;');
            Alert.alert('Banco resetado', 'Reinicie o app para aplicar as mudanças.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDeleteUser = (target: User) => {
    Alert.alert(
      'Remover representante',
      `Deseja remover "${target.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await deleteUser(target.id);
            await loadUsers();
          },
        },
      ]
    );
  };

  const representatives = users.filter((u) => u.role === 'representative');

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configurações</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTA</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.accountRow}
              onPress={() => isAdmin && user && router.push(`/user/edit?id=${user.id}`)}
              activeOpacity={isAdmin ? 0.7 : 1}
              disabled={!isAdmin}
            >
              {user?.photoUri ? (
                <Image source={{ uri: user.photoUri }} style={styles.accountPhoto} />
              ) : (
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>
                    {user?.name.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{user?.name ?? '—'}</Text>
                <Text style={styles.accountRole}>
                  {user ? ROLE_LABELS[user.role] : '—'}
                </Text>
                {user?.email && (
                  <Text style={styles.accountEmail}>{user.email}</Text>
                )}
                {user && user.categories.length > 0 && (
                  <Text style={styles.accountCategory}>
                    {formatCategoryNames(user.categories)}
                  </Text>
                )}
              </View>
              {isAdmin && <Text style={styles.editChevron}>›</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <SettingRow
              icon="→"
              title="Sair da conta"
              subtitle="Encerrar sessão neste dispositivo"
              onPress={handleLogout}
            />
          </View>
        </View>

        {canManageUsers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REPRESENTANTES</Text>
            <View style={styles.card}>
              {loadingUsers ? (
                <View style={styles.usersLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                representatives.map((rep, index) => (
                  <React.Fragment key={rep.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.userManageRow}>
                      {rep.photoUri ? (
                        <Image source={{ uri: rep.photoUri }} style={styles.repPhoto} />
                      ) : (
                        <View style={styles.repAvatar}>
                          <Text style={styles.repAvatarText}>
                            {rep.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userManageInfo}>
                        <Text style={styles.userManageName}>{rep.name}</Text>
                        <Text style={styles.userManageMeta}>
                          {formatCategoryNames(rep.categories)} · PIN {rep.pin}
                        </Text>
                        {rep.email && (
                          <Text style={styles.userManageEmail} numberOfLines={1}>
                            {rep.email}
                          </Text>
                        )}
                      </View>
                      <View style={styles.repActions}>
                        <TouchableOpacity
                          onPress={() => router.push(`/user/edit?id=${rep.id}`)}
                          hitSlop={8}
                        >
                          <Text style={styles.userEditBtn}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteUser(rep)} hitSlop={8}>
                          <Text style={styles.userDeleteBtn}>Remover</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </React.Fragment>
                ))
              )}
              {representatives.length === 0 && !loadingUsers && (
                <View style={styles.emptyUsers}>
                  <Text style={styles.emptyUsersText}>Nenhum representante cadastrado</Text>
                </View>
              )}
              <View style={styles.divider} />
              <SettingRow
                icon="+"
                title="Novo representante"
                subtitle="Nome, foto, categoria, e-mail e PIN"
                onPress={() => router.push('/representative/new')}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MAPA</Text>
          <View style={styles.card}>
            <View style={styles.themeRow}>
              <Text style={styles.settingIcon}>◎</Text>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Estilo do mapa</Text>
                <Text style={styles.settingSubtitle}>Fundo claro ou escuro</Text>
              </View>
            </View>
            <View style={styles.themeToggle}>
              {(['light', 'dark'] as MapTheme[]).map((option) => {
                const active = mapTheme === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.themeOption, active && styles.themeOptionActive]}
                    onPress={() => setMapTheme(option)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.themeOptionText, active && styles.themeOptionTextActive]}>
                      {option === 'light' ? 'Claro' : 'Escuro'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {canClearCache && (
              <>
                <View style={styles.divider} />
                <SettingRow
                  icon="↺"
                  title="Limpar cache do mapa"
                  subtitle="Força redownload dos dados do IBGE"
                  onPress={handleClearGeoCache}
                  danger={false}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TERRITÓRIO</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>◉</Text>
              <View>
                <Text style={styles.infoTitle}>Estado atual</Text>
                <Text style={styles.infoSubtitle}>Piauí (código IBGE: 22)</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⊞</Text>
              <View>
                <Text style={styles.infoTitle}>Municípios</Text>
                <Text style={styles.infoSubtitle}>224 municípios carregados via IBGE</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>↓</Text>
              <View>
                <Text style={styles.infoTitle}>Modo offline</Text>
                <Text style={styles.infoSubtitle}>Dados cacheados por 30 dias</Text>
              </View>
            </View>
          </View>
        </View>

        {canResetDb && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DADOS</Text>
            <View style={styles.card}>
              <SettingRow
                icon="!"
                title="Resetar banco de dados"
                subtitle="Apaga todos os dados permanentemente"
                onPress={handleResetDB}
                danger
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, onPress, danger }: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.settingChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.xl,
    paddingBottom: 60,
  },
  section: { gap: SPACING.sm },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingHorizontal: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  accountPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
  },
  accountInfo: { flex: 1 },
  accountName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
  },
  accountRole: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  accountEmail: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  accountCategory: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
    fontWeight: '500',
  },
  usersLoading: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  userManageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  repPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  repAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repAvatarText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: FONTS.sizes.md,
  },
  userManageInfo: { flex: 1 },
  userManageName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
  },
  userManageMeta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  userManageEmail: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  editChevron: { fontSize: 18 },
  repActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  userEditBtn: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  userDeleteBtn: { fontSize: FONTS.sizes.sm, color: COLORS.error, fontWeight: '500' },
  emptyUsers: { padding: SPACING.lg },
  emptyUsersText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  settingIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  settingInfo: { flex: 1 },
  settingTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  settingTitleDanger: { color: COLORS.error },
  settingSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  settingChevron: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  infoIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  infoTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: '500',
  },
  infoSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.surfaceBorder,
    marginHorizontal: SPACING.lg,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
  },
  themeToggle: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  themeOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundSubtle,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  themeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  themeOptionText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: COLORS.primaryLight,
  },
});
