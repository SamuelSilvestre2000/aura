import { CityExclusion } from '../types';
import { DEFAULT_ORG_ID } from '../constants/organizations';
import { generateId, getDatabase } from './database';
import { isSupabaseConfigured } from './supabase/client';
import {
  excludeCityRemote,
  includeCityRemote,
  listCityExclusionsRemote,
} from './supabase/cityExclusions';

const ROW_TO_EXCLUSION = (row: any): CityExclusion => ({
  id: row.id,
  organizationId: row.organization_id,
  brandId: row.brand_id ?? undefined,
  cityCode: row.city_code,
  note: row.note ?? undefined,
  createdAt: row.created_at,
  createdBy: row.created_by ?? undefined,
});

export async function listCityExclusions(
  organizationId: string = DEFAULT_ORG_ID,
  brandId?: string | null
): Promise<CityExclusion[]> {
  if (isSupabaseConfigured()) return listCityExclusionsRemote(organizationId, brandId);

  const db = await getDatabase();
  const rows = brandId
    ? await db.getAllAsync<any>(
        `SELECT * FROM city_exclusions
         WHERE organization_id = ? AND (brand_id = ? OR brand_id IS NULL)`,
        [organizationId, brandId]
      )
    : await db.getAllAsync<any>(
        `SELECT * FROM city_exclusions WHERE organization_id = ? AND brand_id IS NULL`,
        [organizationId]
      );
  return rows.map(ROW_TO_EXCLUSION);
}

export async function excludeCity(
  cityCode: string,
  organizationId: string = DEFAULT_ORG_ID,
  brandId?: string | null,
  createdBy?: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    return excludeCityRemote(organizationId, cityCode, brandId, createdBy);
  }

  const db = await getDatabase();
  // OR IGNORE em vez de erro: o índice único já garante a unicidade, e marcar
  // duas vezes não é falha que o usuário precise ver.
  await db.runAsync(
    `INSERT OR IGNORE INTO city_exclusions
       (id, organization_id, brand_id, city_code, created_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId('cityx'),
      organizationId,
      brandId ?? null,
      cityCode,
      new Date().toISOString(),
      createdBy ?? null,
    ]
  );
}

export async function includeCity(
  cityCode: string,
  organizationId: string = DEFAULT_ORG_ID,
  brandId?: string | null
): Promise<void> {
  if (isSupabaseConfigured()) return includeCityRemote(organizationId, cityCode, brandId);

  const db = await getDatabase();
  await db.runAsync(
    brandId
      ? `DELETE FROM city_exclusions WHERE organization_id = ? AND city_code = ? AND brand_id = ?`
      : `DELETE FROM city_exclusions WHERE organization_id = ? AND city_code = ? AND brand_id IS NULL`,
    brandId ? [organizationId, cityCode, brandId] : [organizationId, cityCode]
  );
}
