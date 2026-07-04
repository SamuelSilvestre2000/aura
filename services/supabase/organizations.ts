import { DEFAULT_BRAND_ID, DEFAULT_ORG_ID } from '../../constants/organizations';
import { getSupabase } from './client';

export async function getDefaultOrganizationIdRemote(): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', DEFAULT_ORG_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? DEFAULT_ORG_ID;
}

export async function getDefaultBrandIdRemote(): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('brands')
    .select('id')
    .eq('id', DEFAULT_BRAND_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? DEFAULT_BRAND_ID;
}

export async function getUserOrganizationIdsRemote(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.organization_id as string);
}

export async function ensureUserOrganizationRemote(
  userId: string,
  role: 'admin' | 'representative',
  organizationId: string = DEFAULT_ORG_ID
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('user_organizations')
    .upsert({ user_id: userId, organization_id: organizationId, role }, { onConflict: 'user_id,organization_id' });
  if (error) throw new Error(error.message);
}
