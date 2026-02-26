import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../mobile/auth-context';
import { appConfig } from '../mobile/config';
import { ThemePreferenceProvider, useThemePreference } from '../mobile/theme-preference';
import {
  addNotificationResponseListener,
  configureNotificationHandling,
  registerForPushNotifications,
} from '../mobile/notifications';

function NotificationRegistrar() {
  const { isAuthenticated, session, requestWithAuth } = useAuth();

  useEffect(() => {
    void configureNotificationHandling();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) {
      return;
    }

    let cancelled = false;
    console.log(`[push] iniciando registro. apiUrl=${appConfig.apiUrl}`);

    void requestWithAuth((accessToken) => registerForPushNotifications(accessToken))
      .then((result) => {
        if (cancelled) return;

        if (result.status === 'registered') {
          console.log('[push] dispositivo registrado com sucesso');
          return;
        }

        if (result.status === 'skipped') {
          console.warn(`[push] registro ignorado: ${result.reason}`);
          return;
        }

        console.warn(
          `[push] falha ao registrar dispositivo: ${result.reason}${result.message ? ` | ${result.message}` : ''}`,
        );
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'erro desconhecido';
        console.warn(`[push] falha inesperada no fluxo de registro: ${message}`);
      });

    return () => {
      if (cancelled) return;
      cancelled = true;
    };
  }, [isAuthenticated, requestWithAuth, session?.accessToken]);

  useEffect(() => {
    let removeListener: (() => void) | null = null;
    let cancelled = false;

    void addNotificationResponseListener(() => {
      // reservado para deep linking no próximo passo
    }).then((unsubscribe) => {
      if (cancelled) {
        unsubscribe();
        return;
      }
      removeListener = unsubscribe;
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  return null;
}

function RootNavigator() {
  const { resolvedMode } = useThemePreference();

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemePreferenceProvider>
          <NotificationRegistrar />
          <RootNavigator />
        </ThemePreferenceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
