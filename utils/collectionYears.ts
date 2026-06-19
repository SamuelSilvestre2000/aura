import { Collection } from '../types';

/** Ano de referência da coleção (prioriza início do período). */
export function getCollectionYear(collection: Collection): number {
  if (collection.startDate) {
    return Number(collection.startDate.slice(0, 4));
  }
  if (collection.endDate) {
    return Number(collection.endDate.slice(0, 4));
  }
  const parsed = new Date(collection.createdAt);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
}

export function getAvailableCollectionYears(collections: Collection[]): number[] {
  const years = new Set(collections.map(getCollectionYear));
  return [...years].sort((a, b) => b - a);
}

/** Ordena da mais antiga para a mais nova (novas ficam embaixo). */
export function compareCollectionsByDate(a: Collection, b: Collection): number {
  const aDate = a.startDate ?? a.createdAt;
  const bDate = b.startDate ?? b.createdAt;
  const byStart = aDate.localeCompare(bDate);
  if (byStart !== 0) return byStart;

  const aEnd = a.endDate ?? a.createdAt;
  const bEnd = b.endDate ?? b.createdAt;
  return aEnd.localeCompare(bEnd);
}

export function filterCollectionsByYear(collections: Collection[], year: number): Collection[] {
  return collections
    .filter((c) => getCollectionYear(c) === year)
    .sort(compareCollectionsByDate);
}
