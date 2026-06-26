import { UserRole } from '../types';
import { getDatabase } from './database';

/**
 * Clientes visíveis: escopo do representante + interseção com user_categories.
 * Coleções visíveis: organização do rep + category_id nulo (ambas) ou nas categorias do usuário.
 */
const VISIBLE_CLIENTS_SQL = `
  SELECT DISTINCT c.*
  FROM clients c
  WHERE (
    ? = 'admin'
    AND c.organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = ?
    )
  )
  OR (
    ? = 'representative'
    AND EXISTS (
      SELECT 1 FROM representative_scopes rs
      WHERE rs.user_id = ?
        AND rs.organization_id = c.organization_id
        AND (rs.brand_id IS NULL OR rs.brand_id = c.brand_id)
        AND (
          rs.access_mode = 'all_in_org'
          OR (
            rs.access_mode = 'by_category'
            AND EXISTS (
              SELECT 1 FROM client_categories cc
              INNER JOIN representative_scope_categories rsc
                ON rsc.category_id = cc.category_id AND rsc.scope_id = rs.id
              WHERE cc.client_id = c.id
            )
          )
          OR (
            rs.access_mode = 'by_territory'
            AND EXISTS (
              SELECT 1 FROM representative_scope_territories rst
              WHERE rst.scope_id = rs.id AND rst.city_code = c.city_code
            )
          )
          OR (
            rs.access_mode = 'by_assignment'
            AND EXISTS (
              SELECT 1 FROM client_assignments ca
              WHERE ca.client_id = c.id
                AND ca.user_id = rs.user_id
                AND (ca.valid_to IS NULL OR ca.valid_to >= datetime('now'))
            )
          )
        )
    )
    AND EXISTS (
      SELECT 1 FROM client_categories cc
      INNER JOIN user_categories uc
        ON uc.category_id = cc.category_id AND uc.user_id = ?
      WHERE cc.client_id = c.id
    )
  )
  ORDER BY c.name ASC
`;

const VISIBLE_COLLECTIONS_SQL = `
  SELECT col.*
  FROM collections col
  WHERE (
    ? = 'admin'
    AND col.organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = ?
    )
  )
  OR (
    ? = 'representative'
    AND col.organization_id IN (
      SELECT DISTINCT rs.organization_id FROM representative_scopes rs WHERE rs.user_id = ?
    )
    AND (
      col.brand_id IS NULL
      OR col.brand_id IN (
        SELECT rs.brand_id FROM representative_scopes rs
        WHERE rs.user_id = ? AND rs.brand_id IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM representative_scopes rs
        WHERE rs.user_id = ? AND rs.brand_id IS NULL
      )
    )
    AND (
      col.category_id IS NULL
      OR col.category_id IN (
        SELECT category_id FROM user_categories WHERE user_id = ?
      )
    )
  )
  ORDER BY col.created_at DESC
`;

export async function queryVisibleClients(userId: string, role: UserRole): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync<any>(VISIBLE_CLIENTS_SQL, [
    role,
    userId,
    role,
    userId,
    userId,
  ]);
}

export async function queryVisibleCollections(userId: string, role: UserRole): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync<any>(VISIBLE_COLLECTIONS_SQL, [
    role,
    userId,
    role,
    userId,
    userId,
    userId,
    userId,
  ]);
}

export async function canUserAccessClient(
  userId: string,
  role: UserRole,
  clientId: string
): Promise<boolean> {
  const rows = await queryVisibleClients(userId, role);
  return rows.some((r) => r.id === clientId);
}

export async function canUserAccessCollection(
  userId: string,
  role: UserRole,
  collectionId: string
): Promise<boolean> {
  const rows = await queryVisibleCollections(userId, role);
  return rows.some((r) => r.id === collectionId);
}
