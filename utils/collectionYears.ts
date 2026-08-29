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

/**
 * Acha, dentro de `collections`, a mesma coleção (mesmo tipo/temporada,
 * organização e marca) `yearOffset` anos antes/depois de `collection`.
 * Usado para alternar entre anos de uma mesma coleção recorrente
 * (ex.: "Alto Verão 2026" ↔ "Alto Verão 2025").
 */
export function findCollectionTypeYearSibling(
  collections: Collection[],
  collection: Collection,
  yearOffset: number
): Collection | null {
  if (!collection.collectionTypeId) return null;

  const targetYear = getCollectionYear(collection) + yearOffset;
  return (
    collections.find(
      (c) =>
        c.id !== collection.id &&
        c.collectionTypeId === collection.collectionTypeId &&
        c.organizationId === collection.organizationId &&
        c.brandId === collection.brandId &&
        getCollectionYear(c) === targetYear
    ) ?? null
  );
}

/**
 * A partir de uma coleção, sobe ano a ano (mesmo tipo/organização/marca) até
 * achar a versão mais recente já cadastrada da série. Usado para abrir o
 * mapa sempre no ano mais novo da temporada (ex.: se existir "Alto Verão
 * 2027", ele deve ser o padrão, mesmo que a coleção resolvida como vigente
 * ainda seja a de 2026).
 */
export function findMostRecentCollectionInSeries(
  collections: Collection[],
  collection: Collection
): Collection {
  let current = collection;
  for (let guard = 0; guard < 50; guard += 1) {
    const next = findCollectionTypeYearSibling(collections, current, 1);
    if (!next) break;
    current = next;
  }
  return current;
}
