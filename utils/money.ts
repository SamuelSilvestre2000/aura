export function formatBRL(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Interpreta texto digitado (centavos implícitos) como valor em reais. */
export function parseMoneyInput(text: string): number {
  const digits = text.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/** Formata valor para campo de entrada (sem símbolo R$). */
export function formatMoneyInput(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
