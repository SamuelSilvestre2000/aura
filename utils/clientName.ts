import { Client } from '../types';

/**
 * Siglas de razão social — ficam em caixa alta mesmo depois de normalizar o
 * resto do nome. `-ME` no fim de nome de firma individual é o caso mais comum.
 */
const ACRONYMS = new Set([
  'ME',
  'MEI',
  'EPP',
  'EI',
  'LTDA',
  'LTD',
  'EIRELI',
  'CIA',
  'SA',
  'S/A',
  'S.A',
  'S/S',
  'CNPJ',
]);

/** Partículas que ficam minúsculas quando não abrem o nome. */
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'a', 'o']);

/**
 * Uma letra sozinha costuma ser inicial ("J A M Pimentel"), então fica em
 * maiúscula — menos o "e" sem ponto, que em nome de firma é conjunção
 * ("Costa e Souza"). "A" e "O" isolados são quase sempre inicial, e ficam.
 */
const SINGLE_LETTER_PARTICLES = new Set(['e']);

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Formata um pedaço de palavra (entre hífens, barras ou pontos). */
function formatPart(part: string, isFirstOverall: boolean): string {
  if (!part) return part;

  const upper = part.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;

  const lower = part.toLowerCase();
  const bare = part.replace(/\./g, '');

  if (!isFirstOverall && bare.length === 1 && SINGLE_LETTER_PARTICLES.has(lower)) return lower;

  // Inicial solta ("J A M PIMENTEL", "AUCIELE R. DO NASCIMENTO")
  if (bare.length === 1) return upper;

  if (!isFirstOverall && PARTICLES.has(lower)) return lower;

  return capitalize(lower);
}

function formatToken(token: string, index: number): string {
  // separa pontuação de borda ("-ME" → "-" + "ME") para não atrapalhar as regras
  const lead = token.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? '';
  const trail = token.slice(lead.length).match(/[^\p{L}\p{N}.]+$/u)?.[0] ?? '';
  const core = token.slice(lead.length, token.length - trail.length);
  if (!core) return token;

  // hífen e barra internos ("ANTAO-ME", "S/A") mantêm a divisão
  const formatted = core
    .split(/([-/])/)
    .map((piece, i) => (piece === '-' || piece === '/' ? piece : formatPart(piece, index === 0 && i === 0)))
    .join('');

  return lead + formatted + trail;
}

/**
 * Razão social vem em CAIXA ALTA do cadastro, e nome em caixa alta é mais lento
 * de ler — perde-se o contorno das palavras. Normaliza só quando o nome está
 * todo em maiúsculas: se alguém digitou com minúsculas, respeita o que digitou.
 */
export function formatClientName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || /\p{Ll}/u.test(trimmed)) return trimmed;

  return trimmed.split(/\s+/).map(formatToken).join(' ');
}

/** Nome usado para exibição do cliente: prioriza a razão social (legal_name). */
export function displayClientName(client: Pick<Client, 'name' | 'legalName'>): string {
  return formatClientName(client.legalName?.trim() || client.name);
}

/**
 * Letra de índice para agrupar a lista. Tira o acento (Álvaro cai em A) e joga
 * tudo que não é letra num grupo só, no fim.
 */
export function nameIndexLetter(name: string): string {
  const first = name
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/**
 * Iniciais para o avatar sem foto, como em Contatos: duas letras dizem mais que
 * o mesmo glifo de loja repetido em centenas de linhas.
 */
export function clientInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w))
    .filter((w) => !PARTICLES.has(w.toLowerCase()))
    .filter((w) => !ACRONYMS.has(w.toUpperCase().replace(/[^\p{L}/]/gu, '')));

  if (words.length === 0) return '?';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}
