import { Category } from '../types';

export const DEFAULT_REP_PIN = '123456';
export const MIN_ACCESS_PIN_LENGTH = 4;
export const MAX_ACCESS_PIN_LENGTH = 8;

/** @deprecated Representantes usam PIN numérico livre; mantido só por compatibilidade. */
export const REP_PIN_OPTIONS = ['1', '2', '3', '4', '5', '6'] as const;

export function isValidAccessPin(pin: string): boolean {
  const trimmed = pin.trim();
  return (
    /^\d+$/.test(trimmed) &&
    trimmed.length >= MIN_ACCESS_PIN_LENGTH &&
    trimmed.length <= MAX_ACCESS_PIN_LENGTH
  );
}

export function formatCategoryNames(categories: Category[]): string {
  if (categories.length === 0) return '—';
  return categories.map((c) => c.name).join(', ');
}
