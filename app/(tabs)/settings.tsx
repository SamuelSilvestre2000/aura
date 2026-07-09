import React, { useCallback, useState, type ComponentProps } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../utils/alert';
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
import { getTabBarBottomInset } from '../../components/CustomTabBar';
import { NotionHeader } from '../../components/NotionHeader';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: mapTheme, setTheme: setMapTheme } = useMapTheme();
  const { user, logout, can: canDo, isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const canManageUsers = canDo('manage_users');
  const canResetDb = canDo('reset_database');
  const canClearCache = canDo('clear_geo_cache');
  const scrollBottom = getTabBarBottomInset(insets);

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
      'Resetar banco de dados',
      'Todos os clientes, coleções e compras serão apagados permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetar tudo',
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
      <SafeAreaView edges={['top']}>
        <NotionHeader title="Configurações" showBorder />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.accountRow}
              onPress={() => {
                if (!user) return;
                if (isAdmin) {
                  router.push(`/user/edit?id=${user.id}`);
                } else {
                  router.push('/user/profile');
                }
              }}
              activeOpacity={0.7}
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
              {user && (
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
            <SettingRow
              icon="log-out-outline"
              title="Sair da conta"
              subtitle="Encerrar sessão neste dispositivo"
              onPress={handleLogout}
            />
          </View>
        </View>

        {canManageUsers && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Representantes</Text>
            <View style={styles.card}>
              {loadingUsers ? (
                <View style={styles.usersLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : representatives.length === 0 ? (
                <View style={styles.emptyUsers}>
                  <Ionicons name="people-outline" size={28} color={COLORS.textMuted} />
                  <Text style={styles.emptyUsersText}>Nenhum representante cadastrado</Text>
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
                          {formatCategoryNames(rep.categories)}
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
                          style={styles.iconAction}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="create-outline" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteUser(rep)}
                          hitSlop={8}
                          style={styles.iconAction}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </React.Fragment>
                ))
              )}
            </View>
            <TouchableOpacity
              style={styles.addRow}
              onPress={() => router.push('/representative/new')}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.textMuted} />
              <Text style={styles.addRowText}>Novo representante</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mapa</Text>
          <View style={styles.card}>
            <View style={styles.themeRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="map-outline" size={20} color={COLORS.textSecondary} />
              </View>
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
                    <Ionicons
                      name={option === 'light' ? 'sunny-outline' : 'moon-outline'}
                      size={16}
                      color={active ? COLORS.primary : COLORS.textMuted}
                    />
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
                  icon="refresh-outline"
                  title="Limpar cache do mapa"
                  subtitle="Força redownload dos dados do IBGE"
                  onPress={handleClearGeoCache}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Território</Text>
          <View style={styles.card}>
            <InfoRow
              icon="location-outline"
              title="Estado atual"
              subtitle="Piauí (código IBGE: 22)"
            />
            <View style={styles.divider} />
            <InfoRow
              icon="grid-outline"
              title="Municípios"
              subtitle="224 municípios carregados via IBGE"
            />
            <View style={styles.divider} />
            <InfoRow
              icon="cloud-download-outline"
              title="Modo offline"
              subtitle="Dados cacheados por 30 dias"
            />
          </View>
        </View>

        {canResetDb && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dados</Text>
            <View style={styles.card}>
              <SettingRow
                icon="warning-outline"
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

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? COLORS.error : COLORS.textSecondary}
        />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  title,
  subtitle,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={20} color={COLORS.textSecondary} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSubtle,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.xl,
  },
  section: { gap: SPACING.sm },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    paddingHorizontal: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
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
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
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
  repActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconAction: {
    padding: 4,
  },
  emptyUsers: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyUsersText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  addRowText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.surfaceBorder,
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
    color: COLORS.primary,
  },
});
