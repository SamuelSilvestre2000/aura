/** Converte Date para ISO date (YYYY-MM-DD) sem fuso. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateBR(value: Date | string): string {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  return date.toLocaleDateString('pt-BR');
}

export function formatPeriodBR(startDate: string, endDate: string): string {
  return `${formatDateBR(startDate)} – ${formatDateBR(endDate)}`;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
