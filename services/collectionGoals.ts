import { CollectionGoal } from '../types';
import { getDatabase, generateId } from './database';

const ROW_TO_GOAL = (row: {
  id: string;
  collection_id: string;
  user_id: string;
  goal_amount: number;
  created_at: string;
  updated_at: string;
}): CollectionGoal => ({
  id: row.id,
  collectionId: row.collection_id,
  userId: row.user_id,
  goalAmount: row.goal_amount,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function getGoalForUser(
  collectionId: string,
  userId: string
): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ goal_amount: number }>(
    'SELECT goal_amount FROM collection_goals WHERE collection_id = ? AND user_id = ?',
    [collectionId, userId]
  );
  return row?.goal_amount ?? null;
}

export async function getGoalsMapForUser(userId: string): Promise<Map<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ collection_id: string; goal_amount: number }>(
    'SELECT collection_id, goal_amount FROM collection_goals WHERE user_id = ?',
    [userId]
  );
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.collection_id, row.goal_amount);
  }
  return map;
}

export async function setGoalForUser(
  collectionId: string,
  userId: string,
  goalAmount: number
): Promise<CollectionGoal> {
  if (goalAmount <= 0) {
    throw new Error('Informe um valor de meta maior que zero');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM collection_goals WHERE collection_id = ? AND user_id = ?',
    [collectionId, userId]
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
    `INSERT INTO collection_goals (id, collection_id, user_id, goal_amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, collectionId, userId, goalAmount, now, now]
  );
  const row = await db.getFirstAsync<any>('SELECT * FROM collection_goals WHERE id = ?', [id]);
  return ROW_TO_GOAL(row!);
}
