import { useCallback, useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../mobile/auth-context';
import { appConfig } from '../mobile/config';
import { ThemePreferenceProvider, useThemePreference } from '../mobile/theme-preference';
import {
  addNotificationResponseListener,
  configureNotificationHandling,
  getLastNotificationResponse,
  registerForPushNotifications,
} from '../mobile/notifications';
import type { NotificationResponse } from 'expo-notifications';

type PushAction =
  | { type: 'POST'; slug: string }
  | { type: 'MESSAGE'; notificationId?: string }
  | { type: 'EXTERNAL_URL'; url: string }
  | { type: 'EVENT'; checkInToken?: string };

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const parsePushAction = (response: NotificationResponse): PushAction => {
  const data = asRecord(response.notification.request.content.data) ?? {};
  const destination =
    asString(data.destinationType)?.toUpperCase() ??
    asString(data.destination)?.toUpperCase();

  if (destination === 'POST') {
    const slug = asString(data.postSlug) ?? asString(data.slug);
    if (slug) {
      return { type: 'POST', slug };
    }
  }

  if (destination === 'EXTERNAL_URL') {
    const url = asString(data.url) ?? asString(data.href);
    if (url) {
      return { type: 'EXTERNAL_URL', url };
    }
  }

  if (destination === 'EVENT' || destination === 'CHECKIN') {
    const checkInToken = asString(data.checkInToken) ?? asString(data.token);
    return { type: 'EVENT', checkInToken };
  }

  return {
    type: 'MESSAGE',
    notificationId: asString(data.notificationId) ?? asString(data.id),
  };
};

function NotificationRegistrar() {
  const { isAuthenticated, session, requestWithAuth } = useAuth();
  const router = useRouter();
  const handledResponseIdsRef = useRef<Set<string>>(new Set());

  const openPushAction = useCallback(
    (response: NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponseIdsRef.current.has(responseId)) {
        return;
      }
      handledResponseIdsRef.current.add(responseId);

      const action = parsePushAction(response);

      if (action.type === 'POST') {
        router.push(
          {
            pathname: '/noticias/[slug]' as never,
            params: { slug: action.slug },
          } as never,
        );
        return;
      }

      if (action.type === 'EXTERNAL_URL') {
        void Linking.openURL(action.url).catch(() => undefined);
        return;
      }

      if (action.type === 'EVENT') {
        if (action.checkInToken) {
          router.push(
            {
              pathname: '/eventos/checkin/[token]' as never,
              params: { token: action.checkInToken },
            } as never,
          );
          return;
        }
        router.push('/eventos' as never);
        return;
      }

      if (action.notificationId) {
        router.push(
          {
            pathname: '/mensagens' as never,
            params: { id: action.notificationId },
          } as never,
        );
        return;
      }

      router.push('/mensagens' as never);
    },
    [router],
  );

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

    void addNotificationResponseListener((response) => {
      openPushAction(response);
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
  }, [openPushAction]);

  useEffect(() => {
    let cancelled = false;

    void getLastNotificationResponse().then((response) => {
      if (cancelled || !response) {
        return;
      }
      openPushAction(response);
    });

    return () => {
      cancelled = true;
    };
  }, [openPushAction]);

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
