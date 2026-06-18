import { Category } from '../types';
import { DEFAULT_ORG_ID } from '../constants/organizations';
import { getDatabase } from './database';

const ROW_TO_CATEGORY = (row: any): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  organizationId: row.organization_id ?? undefined,
  dimensionId: row.dimension_id ?? undefined,
});

export async function listCategories(organizationId: string = DEFAULT_ORG_ID): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM categories
     WHERE organization_id = ? OR organization_id IS NULL
     ORDER BY name ASC`,
    [organizationId]
  );
  return rows.map(ROW_TO_CATEGORY);
}

export async function getCategoriesByUserId(userId: string): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT c.* FROM categories c
     INNER JOIN user_categories uc ON uc.category_id = c.id
     WHERE uc.user_id = ?
     ORDER BY c.name ASC`,
    [userId]
  );
  return rows.map(ROW_TO_CATEGORY);
}

export async function setUserCategories(userId: string, categoryIds: string[]): Promise<void> {
  const db = await getDatabase();
  const uniqueIds = [...new Set(categoryIds)];

  await db.runAsync('DELETE FROM user_categories WHERE user_id = ?', [userId]);

  for (const categoryId of uniqueIds) {
    await db.runAsync(
      'INSERT OR IGNORE INTO user_categories (user_id, category_id) VALUES (?, ?)',
      [userId, categoryId]
    );
  }
}

export async function attachCategoriesToUsers<T extends { id: string; categories?: Category[] }>(
  users: T[]
): Promise<(T & { categories: Category[] })[]> {
  const result: (T & { categories: Category[] })[] = [];

  for (const user of users) {
    const categories = await getCategoriesByUserId(user.id);
    result.push({ ...user, categories });
  }

  return result;
}
