import { Client } from '../types';

/** Nome usado para exibição do cliente: prioriza a razão social (legal_name). */
export function displayClientName(client: Pick<Client, 'name' | 'legalName'>): string {
  return client.legalName?.trim() || client.name;
}
