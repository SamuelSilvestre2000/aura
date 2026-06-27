import { Collection } from '../types';

/** Coleção aberta para vendas e seleção no mapa. */
export function isCollectionOpen(collection: Collection): boolean {
  return collection.isActive !== 0;
}

/** Coleção fechada manualmente — histórico preservado, sem novas vendas. */
export function isCollectionClosed(collection: Collection): boolean {
  return collection.isActive === 0;
}

export function filterOpenCollections(collections: Collection[]): Collection[] {
  return collections.filter(isCollectionOpen);
}
