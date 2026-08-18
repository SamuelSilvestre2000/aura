import { AVATAR_PALETTE } from '../constants/colors';

/** Mesmo id sempre cai na mesma cor da paleta — evita que o avatar mude de cor a cada render. */
export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
