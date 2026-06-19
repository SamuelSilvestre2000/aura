import { Collection } from '../types';
import { toISODate } from './dates';

/** Colecao cujo periodo inclui a data de referencia. */
export function isCollectionVigente(
  collection: Collection,
  referenceDate = new Date()
): boolean {
  if (!collection.startDate || !collection.endDate) return false;
  const today = toISODate(referenceDate);
  return collection.startDate <= today && today <= collection.endDate;
}

/** ID da colecao vigente; usa fallback (ex.: ativa no mapa) se nenhuma estiver no periodo. */
export function getVigenteCollectionId(
  collections: Collection[],
  fallbackId?: string | null
): string | null {
  const vigentes = collections.filter((c) => isCollectionVigente(c));
  if (vigentes.length === 1) return vigentes[0].id;
  if (vigentes.length > 1) {
    const preferred = fallbackId ? vigentes.find((c) => c.id === fallbackId) : undefined;
    if (preferred) return preferred.id;
    return [...vigentes].sort((a, b) =>
      (b.startDate ?? '').localeCompare(a.startDate ?? '')
    )[0].id;
  }
  return fallbackId ?? null;
}
