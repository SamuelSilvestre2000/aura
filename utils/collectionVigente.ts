import { Collection } from '../types';
import { isCollectionOpen } from './collectionStatus';
import { toISODate } from './dates';

/**
 * Coleção vigente: marcada explicitamente (isVigente) ou, na ausência de
 * marcação, cujo período inclui a data de referência.
 */
export function isCollectionVigente(
  collection: Collection,
  referenceDate = new Date()
): boolean {
  if (!isCollectionOpen(collection)) return false;
  if (collection.isVigente) return true;
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
  if (vigentes.length === 0) return fallbackId ?? null;

  const pinned = vigentes.find((c) => c.isVigente);
  if (pinned) return pinned.id;

  if (vigentes.length === 1) return vigentes[0].id;

  const preferred = fallbackId ? vigentes.find((c) => c.id === fallbackId) : undefined;
  if (preferred) return preferred.id;
  return [...vigentes].sort((a, b) =>
    (b.startDate ?? '').localeCompare(a.startDate ?? '')
  )[0].id;
}
