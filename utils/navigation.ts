import type { Router } from 'expo-router';

/**
 * router.back() não faz nada quando a tela atual é a raiz da pilha de
 * navegação (ex: usuário chegou direto nessa rota por um reload do navegador
 * ou por um link/histórico do navegador que a SPA não conhece) — nesses
 * casos o botão de voltar "não fazia nada". Este helper cai para a tela
 * inicial quando não há para onde voltar.
 */
export function goBack(router: Router, fallback: Parameters<Router['replace']>[0] = '/(tabs)'): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
