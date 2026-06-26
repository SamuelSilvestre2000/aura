import { Category, Client, Collection } from '../types';
import { CATEGORY_ID_LABELS } from '../constants/categoryPills';

/** Filtro ativo na UI — `all` mostra todas as categorias permitidas ao usuário. */
export type CategoryFilterValue = 'all' | string;

export const ALL_CATEGORIES_FILTER: CategoryFilterValue = 'all';

export function clientMatchesCategoryFilter(
  client: Client,
  filter: CategoryFilterValue,
  allowedCategoryIds?: string[]
): boolean {
  const clientCats = client.categoryIds ?? [];

  if (filter !== ALL_CATEGORIES_FILTER) {
    return clientCats.includes(filter);
  }

  if (!allowedCategoryIds?.length) return true;
  return clientCats.some((id) => allowedCategoryIds.includes(id));
}

export function collectionMatchesCategoryFilter(
  collection: Collection,
  filter: CategoryFilterValue,
  allowedCategoryIds?: string[]
): boolean {
  if (filter !== ALL_CATEGORIES_FILTER) {
    if (!collection.categoryId) {
      return allowedCategoryIds?.includes(filter) ?? true;
    }
    return collection.categoryId === filter;
  }

  if (!allowedCategoryIds?.length) return true;
  if (!collection.categoryId) return true;
  return allowedCategoryIds.includes(collection.categoryId);
}

export function filterClientsByCategory(
  clients: Client[],
  filter: CategoryFilterValue,
  allowedCategoryIds?: string[]
): Client[] {
  return clients.filter((c) => clientMatchesCategoryFilter(c, filter, allowedCategoryIds));
}

export function filterCollectionsByCategory(
  collections: Collection[],
  filter: CategoryFilterValue,
  allowedCategoryIds?: string[]
): Collection[] {
  return collections.filter((c) =>
    collectionMatchesCategoryFilter(c, filter, allowedCategoryIds)
  );
}

export function categoryLabel(categoryId: string | null | undefined): string {
  if (!categoryId) return 'Ambas';
  return CATEGORY_ID_LABELS[categoryId] ?? categoryId;
}

export function resolveEffectiveCategoryFilter(
  filter: CategoryFilterValue,
  categories: Category[]
): CategoryFilterValue {
  if (categories.length <= 1) {
    return categories[0]?.id ?? ALL_CATEGORIES_FILTER;
  }
  return filter;
}

export function shouldShowCategorySwitcher(categories: Category[]): boolean {
  return categories.length > 1;
}

export function allowedCategoryIdList(categories: Category[]): string[] {
  return categories.map((c) => c.id);
}
