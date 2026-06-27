/** Mantém só dígitos, no máximo 14 (CNPJ). */
export function stripCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

/** Formata como XX.XXX.XXX/XXXX-XX enquanto o usuário digita. */
export function maskCnpjInput(value: string): string {
  const digits = stripCnpj(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Exibe CNPJ salvo (só dígitos) com máscara. */
export function formatCnpj(value: string): string {
  const digits = stripCnpj(value);
  if (digits.length !== 14) return value;
  return maskCnpjInput(digits);
}

function cnpjChecksum(digits: string, weights: number[]): number {
  const sum = weights.reduce((acc, weight, index) => acc + Number(digits[index]) * weight, 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida dígitos verificadores; aceita vazio (campo opcional). */
export function isValidCnpj(value: string): boolean {
  const digits = stripCnpj(value);
  if (digits.length === 0) return true;
  if (digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const first = cnpjChecksum(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = cnpjChecksum(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return first === Number(digits[12]) && second === Number(digits[13]);
}
