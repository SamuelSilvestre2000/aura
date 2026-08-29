import { CityExclusion } from '../../types';
import { generateId } from '../database';
import { getSupabase } from './client';

const ROW_TO_EXCLUSION = (row: any): CityExclusion => ({
  id: row.id,
  organizationId: row.organization_id,
  brandId: row.brand_id ?? undefined,
  cityCode: row.city_code,
  note: row.note ?? undefined,
  createdAt: row.created_at,
  createdBy: row.created_by ?? undefined,
});

export async function listCityExclusionsRemote(
  organizationId: string,
  brandId?: string | null
): Promise<CityExclusion[]> {
  const supabase = getSupabase();
  let query = supabase.from('city_exclusions').select('*').eq('organization_id', organizationId);

  // A exclusão sem marca vale para a organização inteira, então entra junto
  // com a da marca ativa.
  if (brandId) query = query.or(`brand_id.eq.${brandId},brand_id.is.null`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(ROW_TO_EXCLUSION);
}

export async function excludeCityRemote(
  organizationId: string,
  cityCode: string,
  brandId?: string | null,
  createdBy?: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('city_exclusions').insert({
    id: generateId('cityx'),
    organization_id: organizationId,
    brand_id: brandId ?? null,
    city_code: cityCode,
    created_by: createdBy ?? null,
  });
  // O índice único é a garantia contra duplicata; marcar duas vezes (duas abas,
  // toque duplo) não é erro que o usuário precise ver.
  if (error && !error.message.includes('duplicate key')) throw new Error(error.message);
}

export async function includeCityRemote(
  organizationId: string,
  cityCode: string,
  brandId?: string | null
): Promise<void> {
  const supabase = getSupabase();
  let query = supabase
    .from('city_exclusions')
    .delete()
    .eq('organization_id', organizationId)
    .eq('city_code', cityCode);

  query = brandId ? query.eq('brand_id', brandId) : query.is('brand_id', null);

  const { error } = await query;
  if (error) throw new Error(error.message);
}
