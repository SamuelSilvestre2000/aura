import { CollectionGoal, Category } from '../types';
import { getDatabase, generateId } from './database';
import { isSupabaseConfigured } from './supabase/client';
import {
  getGoalForUserRemote,
  getGoalsForCollectionAndUserRemote,
  getGoalsMapForUserRemote,
  setGoalForUserRemote,
  setGoalsForUserRemote,
} from './supabase/collectionGoals';
import { categoryIdsForGoals } from '../utils/collectionGoalCategories';

/** Legado: meta única antes da separação por categoria. */
export const GOAL_CATEGORY_ALL = 'all';

const ROW_TO_GOAL = (row: {
  id: string;
  collection_id: string;
  user_id: string;
  category_id: string;
  goal_amount: number;
  created_at: string;
  updated_at: string;
}): CollectionGoal => ({
  id: row.id,
  collectionId: row.collection_id,
  userId: row.user_id,
  categoryId: row.category_id,
  goalAmount: row.goal_amount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type GoalInput = {
  categoryId: string;
  goalAmount: number;
};

export function goalCategoryKey(
  collectionCategoryId: string | null | undefined,
  viewCategoryFilter?: string
): string {
  if (viewCategoryFilter && viewCategoryFilter !== 'all') return viewCategoryFilter;
  return collectionCategoryId ?? GOAL_CATEGORY_ALL;
}

export async function getGoalForUser(
  collectionId: string,
  userId: string,
  categoryId: string
): Promise<number | null> {
  if (isSupabaseConfigured()) return getGoalForUserRemote(collectionId, userId, categoryId);

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ goal_amount: number }>(
    'SELECT goal_amount FROM collection_goals WHERE collection_id = ? AND user_id = ? AND category_id = ?',
    [collectionId, userId, categoryId]
  );
  return row?.goal_amount ?? null;
}

export async function getGoalsForCollectionAndUser(
  collectionId: string,
  userId: string
): Promise<Map<string, number>> {
  if (isSupabaseConfigured()) return getGoalsForCollectionAndUserRemote(collectionId, userId);

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ category_id: string; goal_amount: number }>(
    'SELECT category_id, goal_amount FROM collection_goals WHERE collection_id = ? AND user_id = ?',
    [collectionId, userId]
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.category_id, row.goal_amount);
  }
  return map;
}

export async function getGoalsMapForUser(userId: string): Promise<Map<string, number>> {
  if (isSupabaseConfigured()) return getGoalsMapForUserRemote(userId);

  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    collection_id: string;
    category_id: string;
    goal_amount: number;
  }>(
    'SELECT collection_id, category_id, goal_amount FROM collection_goals WHERE user_id = ?',
    [userId]
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${row.collection_id}:${row.category_id}`, row.goal_amount);
  }
  return map;
}

export function resolveGoalAmount(
  goals: Map<string, number>,
  collectionId: string,
  collectionCategoryId: string | null | undefined,
  viewCategoryFilter: string,
  allCategories: Category[] = []
): number | null {
  if (viewCategoryFilter !== 'all' && viewCategoryFilter !== GOAL_CATEGORY_ALL) {
    const direct = goals.get(`${collectionId}:${viewCategoryFilter}`);
    if (direct != null) return direct;
    const legacy = goals.get(`${collectionId}:${GOAL_CATEGORY_ALL}`);
    return legacy ?? null;
  }

  const categoryIds = categoryIdsForGoals(collectionCategoryId, allCategories);
  let sum = 0;
  let found = false;
  for (const catId of categoryIds) {
    const value = goals.get(`${collectionId}:${catId}`);
    if (value != null) {
      sum += value;
      found = true;
    }
  }

  if (!found) {
    const legacy = goals.get(`${collectionId}:${GOAL_CATEGORY_ALL}`);
    if (legacy != null) return legacy;
  }

  return found ? sum : null;
}

export async function setGoalForUser(
  collectionId: string,
  userId: string,
  goalAmount: number,
  categoryId: string
): Promise<CollectionGoal> {
  if (goalAmount <= 0) {
    throw new Error('Informe um valor de meta maior que zero');
  }

  if (isSupabaseConfigured()) {
    return setGoalForUserRemote(collectionId, userId, goalAmount, categoryId);
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM collection_goals WHERE collection_id = ? AND user_id = ? AND category_id = ?',
    [collectionId, userId, categoryId]
  );

  if (existing) {
    await db.runAsync(
      'UPDATE collection_goals SET goal_amount = ?, updated_at = ? WHERE id = ?',
      [goalAmount, now, existing.id]
    );
    const row = await db.getFirstAsync<any>('SELECT * FROM collection_goals WHERE id = ?', [
      existing.id,
    ]);
    return ROW_TO_GOAL(row);
  }

  const id = generateId('goal');
  await db.runAsync(
    `INSERT INTO collection_goals (
      id, collection_id, user_id, category_id, goal_amount, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, collectionId, userId, categoryId, goalAmount, now, now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM collection_goals WHERE id = ?', [id]);
  return ROW_TO_GOAL(row!);
}

/** Salva metas por categoria (ignora valores zero ou negativos). */
export async function setGoalsForUser(
  collectionId: string,
  userId: string,
  goals: GoalInput[]
): Promise<void> {
  if (isSupabaseConfigured()) return setGoalsForUserRemote(collectionId, userId, goals);

  for (const goal of goals) {
    if (goal.goalAmount > 0) {
      await setGoalForUser(collectionId, userId, goal.goalAmount, goal.categoryId);
    }
  }
}
