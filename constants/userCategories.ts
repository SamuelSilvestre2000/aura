import { Category } from '../types';

export const REP_PIN_OPTIONS = ['1', '2', '3', '4', '5', '6'] as const;

export const DEFAULT_REP_PIN = '1';

export function formatCategoryNames(categories: Category[]): string {
  if (categories.length === 0) return '—';
  return categories.map((c) => c.name).join(', ');
}
