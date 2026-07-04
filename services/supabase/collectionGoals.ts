import { CollectionGoal } from '../../types';
import { generateId } from '../database';
import { GoalInput } from '../collectionGoals';
import { getSupabase } from './client';

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

export async function getGoalForUserRemote(
  collectionId: string,
  userId: string,
  categoryId: string
): Promise<number | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('collection_goals')
    .select('goal_amount')
    .eq('collection_id', collectionId)
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.goal_amount ?? null;
}

export async function getGoalsForCollectionAndUserRemote(
  collectionId: string,
  userId: string
): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('collection_goals')
    .select('category_id, goal_amount')
    .eq('collection_id', collectionId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.category_id, row.goal_amount);
  }
  return map;
}

export async function getGoalsMapForUserRemote(userId: string): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('collection_goals')
    .select('collection_id, category_id, goal_amount')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(`${row.collection_id}:${row.category_id}`, row.goal_amount);
  }
  return map;
}

export async function setGoalForUserRemote(
  collectionId: string,
  userId: string,
  goalAmount: number,
  categoryId: string
): Promise<CollectionGoal> {
  if (goalAmount <= 0) {
    throw new Error('Informe um valor de meta maior que zero');
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data: existing, error: fetchError } = await supabase
    .from('collection_goals')
    .select('id')
    .eq('collection_id', collectionId)
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    const { data, error } = await supabase
      .from('collection_goals')
      .update({ goal_amount: goalAmount, updated_at: now })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return ROW_TO_GOAL(data);
  }

  const id = generateId('goal');
  const { data, error } = await supabase
    .from('collection_goals')
    .insert({
      id,
      collection_id: collectionId,
      user_id: userId,
      category_id: categoryId,
      goal_amount: goalAmount,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return ROW_TO_GOAL(data);
}

export async function setGoalsForUserRemote(
  collectionId: string,
  userId: string,
  goals: GoalInput[]
): Promise<void> {
  for (const goal of goals) {
    if (goal.goalAmount > 0) {
      await setGoalForUserRemote(collectionId, userId, goal.goalAmount, goal.categoryId);
    }
  }
}
