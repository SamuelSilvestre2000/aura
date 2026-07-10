import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { CollectionsProvider } from '../hooks/useCollections';
import { PurchasesProvider } from '../hooks/usePurchases';
import { NOTION_MODAL_OPTIONS } from '../constants/navigation';
import { COLORS } from '../constants/colors';

/**
 * Nenhum estilo do app define fontFamily, então no nativo o SO já usa a fonte
 * padrão (San Francisco no iOS, Roboto no Android). Na web isso cai na fonte
 * padrão do navegador em vez de imitar a fonte nativa — injeta a mesma pilha
 * de fontes de sistema que o react-native-web usa quando fontFamily: 'System'
 * é definido. Roda no carregamento do módulo (antes da 1ª renderização) para
 * não piscar com a fonte errada.
 */
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('aura-system-font')) {
  const style = document.createElement('style');
  style.id = 'aura-system-font';
  style.textContent = `
    html, body, #root, input, textarea, select, button {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const onLoginScreen = segments[0] === 'login';

    if (!user && !onLoginScreen) {
      router.replace('/login');
    } else if (user && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AuthProvider>
          <CollectionsProvider>
          <PurchasesProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="client/[id]" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="client/new" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="client/edit" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="collection/new" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="collection/[id]" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="representative/new" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="sale/[clientId]" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="user/edit" options={NOTION_MODAL_OPTIONS} />
              <Stack.Screen name="user/profile" options={NOTION_MODAL_OPTIONS} />
            </Stack>
          </AuthGate>
          </PurchasesProvider>
          </CollectionsProvider>
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
