import { Category } from '../types';

/** Categorias que recebem meta nesta coleção. */
export function applicableGoalCategories(
  collectionCategoryId: string | null | undefined,
  availableCategories: Category[]
): Category[] {
  if (collectionCategoryId) {
    const match = availableCategories.find((c) => c.id === collectionCategoryId);
    return match ? [match] : [];
  }
  return availableCategories;
}

export function categoryIdsForGoals(
  collectionCategoryId: string | null | undefined,
  availableCategories: Category[]
): string[] {
  return applicableGoalCategories(collectionCategoryId, availableCategories).map((c) => c.id);
}
