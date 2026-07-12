import { User, UserRole } from '../../types';
import { DEFAULT_ORG_ID } from '../../constants/organizations';
import { DEFAULT_REP_PIN } from '../../constants/userCategories';
import { generateId } from '../database';
import { getSupabase } from './client';
import { uploadUserAvatar } from './storage';

type DbUserRow = {
  id: string;
  auth_user_id: string | null;
  name: string;
  role: UserRole;
  pin: string;
  email: string | null;
  photo_uri: string | null;
  created_at: string;
};

type DbCategoryRow = {
  id: string;
  name: string;
  slug: string;
  organization_id: string | null;
  dimension_id: string | null;
};

function mapUser(row: DbUserRow, categories: DbCategoryRow[]): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    pin: row.pin,
    email: row.email ?? undefined,
    photoUri: row.photo_uri ?? undefined,
    createdAt: row.created_at,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      organizationId: c.organization_id ?? undefined,
      dimensionId: c.dimension_id ?? undefined,
    })),
  };
}

async function fetchCategoriesForUser(userId: string): Promise<DbCategoryRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_categories')
    .select('categories(id, name, slug, organization_id, dimension_id)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const cat = row.categories as DbCategoryRow | DbCategoryRow[] | null;
    if (!cat) return [];
    return Array.isArray(cat) ? cat : [cat];
  });
}

async function hydrateUser(row: DbUserRow): Promise<User> {
  const categories = await fetchCategoriesForUser(row.id);
  return mapUser(row, categories);
}

export async function fetchAppUserByAuthId(authUserId: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return hydrateUser(data as DbUserRow);
}

export async function linkCurrentAuthUser(): Promise<User> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('link_current_auth_user');
  if (error) throw new Error(error.message);
  return hydrateUser(data as DbUserRow);
}

export async function listUsersRemote(): Promise<User[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('role', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbUserRow[];
  return Promise.all(rows.map((row) => hydrateUser(row)));
}

export async function getUserByIdRemote(id: string): Promise<User | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return hydrateUser(data as DbUserRow);
}

export type CreateRepresentativeRemoteData = {
  name: string;
  email: string;
  categoryIds: string[];
  password: string;
  photoUri?: string | null;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidAuthPassword(password: string): boolean {
  return password.trim().length >= 6;
}

/** Cria conta Auth sem trocar a sessão do admin logado. */
async function createAuthUserWithoutSwitchingSession(
  email: string,
  password: string
): Promise<void> {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const adminSession = sessionData.session;

  const { error: signUpError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (signUpError) throw new Error(signUpError.message);

  await supabase.auth.signOut();
  if (adminSession) {
    const { error: restoreError } = await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });
    if (restoreError) throw new Error(restoreError.message);
  }
}

export async function createRepresentativeRemote(
  data: CreateRepresentativeRemoteData
): Promise<User> {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();

  if (!name) throw new Error('Nome obrigatório');
  if (!isValidEmail(email)) throw new Error('E-mail inválido');
  if (!isValidAuthPassword(password)) throw new Error('Senha inválida. Use ao menos 6 caracteres.');
  if (data.categoryIds.length === 0) throw new Error('Selecione ao menos uma categoria');

  const supabase = getSupabase();
  const id = generateId('usr');
  const scopeId = generateId('scope');
  const now = new Date().toISOString();

  await createAuthUserWithoutSwitchingSession(email, password);

  const photoUri = data.photoUri ? await uploadUserAvatar(data.photoUri, id) : null;

  const { error: userError } = await supabase.from('users').insert({
    id,
    name,
    role: 'representative',
    pin: password,
    email,
    photo_uri: photoUri,
    created_at: now,
  });
  if (userError) throw new Error(userError.message);

  const { error: orgError } = await supabase.from('user_organizations').insert({
    user_id: id,
    organization_id: DEFAULT_ORG_ID,
    role: 'representative',
  });
  if (orgError) throw new Error(orgError.message);

  const categoryRows = data.categoryIds.map((categoryId) => ({
    user_id: id,
    category_id: categoryId,
  }));
  const { error: catError } = await supabase.from('user_categories').insert(categoryRows);
  if (catError) throw new Error(catError.message);

  const { error: scopeError } = await supabase.from('representative_scopes').insert({
    id: scopeId,
    user_id: id,
    organization_id: DEFAULT_ORG_ID,
    brand_id: null,
    access_mode: 'by_category',
    created_at: now,
  });
  if (scopeError) throw new Error(scopeError.message);

  const scopeCategoryRows = data.categoryIds.map((categoryId) => ({
    scope_id: scopeId,
    category_id: categoryId,
  }));
  const { error: scopeCatError } = await supabase
    .from('representative_scope_categories')
    .insert(scopeCategoryRows);
  if (scopeCatError) throw new Error(scopeCatError.message);

  const user = await getUserByIdRemote(id);
  if (!user) throw new Error('Falha ao criar representante');
  return user;
}

export async function updateUserRemote(
  id: string,
  data: {
    name: string;
    email?: string;
    categoryIds?: string[];
    photoUri?: string | null;
  }
): Promise<User> {
  const existing = await getUserByIdRemote(id);
  if (!existing) throw new Error('Usuário não encontrado');

  const name = data.name.trim();
  if (!name) throw new Error('Nome obrigatório');

  const supabase = getSupabase();
  const email =
    existing.role === 'representative'
      ? data.email?.trim().toLowerCase()
      : data.email?.trim().toLowerCase() || existing.email || null;

  if (existing.role === 'representative') {
    if (!email || !isValidEmail(email)) throw new Error('E-mail inválido');
    if (!data.categoryIds || data.categoryIds.length === 0) {
      throw new Error('Selecione ao menos uma categoria');
    }
  }

  let photoUri = existing.photoUri ?? null;
  if (data.photoUri !== undefined) {
    photoUri = data.photoUri ? await uploadUserAvatar(data.photoUri, id) : null;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ name, email, photo_uri: photoUri })
    .eq('id', id);
  if (updateError) throw new Error(updateError.message);

  if (existing.role === 'representative' && data.categoryIds) {
    await supabase.from('user_categories').delete().eq('user_id', id);
    await supabase.from('user_categories').insert(
      data.categoryIds.map((categoryId) => ({ user_id: id, category_id: categoryId }))
    );

    const { data: scopeRow } = await supabase
      .from('representative_scopes')
      .select('id')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (scopeRow?.id) {
      await supabase.from('representative_scope_categories').delete().eq('scope_id', scopeRow.id);
      await supabase.from('representative_scope_categories').insert(
        data.categoryIds.map((categoryId) => ({
          scope_id: scopeRow.id,
          category_id: categoryId,
        }))
      );
    }
  }

  const updated = await getUserByIdRemote(id);
  if (!updated) throw new Error('Falha ao atualizar usuário');
  return updated;
}

export async function updateOwnProfileRemote(
  userId: string,
  data: { password?: string; photoUri?: string | null }
): Promise<User> {
  const existing = await getUserByIdRemote(userId);
  if (!existing) throw new Error('Usuário não encontrado');

  const supabase = getSupabase();

  if (data.password) {
    if (!isValidAuthPassword(data.password)) {
      throw new Error('Senha inválida. Use ao menos 6 caracteres.');
    }
    const { error: authError } = await supabase.auth.updateUser({ password: data.password });
    if (authError) throw new Error(authError.message);
    await supabase.from('users').update({ pin: data.password }).eq('id', userId);
  }

  if (data.photoUri !== undefined) {
    const photoUri = data.photoUri ? await uploadUserAvatar(data.photoUri, userId) : null;
    const { error } = await supabase
      .from('users')
      .update({ photo_uri: photoUri })
      .eq('id', userId);
    if (error) throw new Error(error.message);
  }

  const updated = await getUserByIdRemote(userId);
  if (!updated) throw new Error('Falha ao atualizar perfil');
  return updated;
}

export async function deleteUserRemote(id: string): Promise<void> {
  const supabase = getSupabase();
  const existing = await getUserByIdRemote(id);
  if (!existing || existing.role === 'admin') return;

  const { error } = await supabase.from('users').delete().eq('id', id).eq('role', 'representative');
  if (error) throw new Error(error.message);
}

export async function resetRepresentativePasswordRemote(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
  if (error) throw new Error(error.message);
}

export { DEFAULT_REP_PIN as DEFAULT_REP_PASSWORD };
