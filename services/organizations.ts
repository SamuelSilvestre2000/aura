import { getDatabase } from './database';
import {
  DEFAULT_BRAND_ID,
  DEFAULT_ORG_ID,
} from '../constants/organizations';

export {
  DEFAULT_ORG_ID,
  DEFAULT_ORG_SLUG,
  DEFAULT_BRAND_ID,
  DEFAULT_DIMENSION_ID,
} from '../constants/organizations';

export async function getDefaultOrganizationId(): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM organizations WHERE id = ?',
    [DEFAULT_ORG_ID]
  );
  return row?.id ?? DEFAULT_ORG_ID;
}

export async function getDefaultBrandId(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM brands WHERE id = ?',
    [DEFAULT_BRAND_ID]
  );
  return row?.id ?? DEFAULT_BRAND_ID;
}

export async function getUserOrganizationIds(userId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ organization_id: string }>(
    'SELECT organization_id FROM user_organizations WHERE user_id = ?',
    [userId]
  );
  return rows.map((r) => r.organization_id);
}

export async function ensureUserOrganization(
  userId: string,
  role: 'admin' | 'representative',
  organizationId: string = DEFAULT_ORG_ID
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO user_organizations (user_id, organization_id, role)
     VALUES (?, ?, ?)`,
    [userId, organizationId, role]
  );
}
