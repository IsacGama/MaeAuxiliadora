import { useCallback, useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Animated, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../mobile/auth-context';
import { AppThemeProvider, useComputedTheme } from '../mobile/theme';
import { useOrgContext } from '../mobile/hooks/use-org-context';
import { appConfig } from '../mobile/config';
import { prefetchTodayData } from '../mobile/prefetch';
import { ThemePreferenceProvider, useThemePreference } from '../mobile/theme-preference';
import { FontScalePreferenceProvider } from '../mobile/font-scale-preference';
import { AppAlertHost } from '../mobile/components/app-alert-host';
import {
  addNotificationResponseListener,
  configureNotificationHandling,
  getLastNotificationResponse,
  registerForPushNotifications,
} from '../mobile/notifications';
import { getCacheValue, setCache } from '../mobile/storage';
import type { NotificationResponse } from 'expo-notifications';

const LAST_HANDLED_RESPONSE_KEY = 'spd-mobile:last-handled-notif-response';

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

function BackgroundPrefetch() {
  useEffect(() => {
    prefetchTodayData();
  }, []);

  return null;
}

function NotificationRegistrar() {
  const { isAuthenticated, session, requestWithAuth } = useAuth();
  const router = useRouter();

  const openPushAction = useCallback(
    (response: NotificationResponse) => {
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

  // Ref always points to the latest openPushAction without causing effects to re-run.
  const openPushActionRef = useRef(openPushAction);
  openPushActionRef.current = openPushAction;

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

  // Listener for taps while the app is running.
  // Uses ref so the listener is set up once and never re-registered on navigation.
  useEffect(() => {
    let removeListener: (() => void) | null = null;
    let cancelled = false;

    void addNotificationResponseListener((response) => {
      openPushActionRef.current(response);
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
  }, []); // [] — set up once; ref keeps the callback fresh

  // Cold-start: handle the notification that opened the app from a killed state.
  // Persists the last handled response ID in AsyncStorage so restarts don't
  // re-process the same old notification.
  useEffect(() => {
    let cancelled = false;

    void getLastNotificationResponse().then(async (response) => {
      if (cancelled || !response) return;

      const responseId = response.notification.request.identifier;
      const lastHandled = await getCacheValue<string>(LAST_HANDLED_RESPONSE_KEY);
      if (cancelled || lastHandled === responseId) return;

      await setCache(LAST_HANDLED_RESPONSE_KEY, responseId, {
        ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      if (!cancelled) {
        openPushActionRef.current(response);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []); // [] — run once on mount only

  return null;
}

function PasswordChangeGate() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !session?.user.mustChangePassword ||
      pathname === '/conta'
    ) {
      return;
    }

    router.replace('/conta' as never);
  }, [isAuthenticated, isLoading, pathname, router, session?.user.mustChangePassword]);

  return null;
}

function RootNavigator() {
  const { resolvedMode } = useThemePreference();

  return (
    <>
      <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="oracoes" />
        <Stack.Screen name="rosario" />
        <Stack.Screen name="ativar-conta" />
        <Stack.Screen name="redefinir-senha" />
      </Stack>
    </>
  );
}

/** Sits inside AuthProvider + ThemePreferenceProvider so it can access both. */
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const theme = useComputedTheme(org.branding, resolvedMode);

  // Animate a brief overlay whenever the theme switches.
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const prevMode = useRef(resolvedMode);

  useEffect(() => {
    if (prevMode.current === resolvedMode) return;
    prevMode.current = resolvedMode;
    // Brief flash: 0 → 0.18 → 0 over 350ms
    Animated.sequence([
      Animated.timing(flashOpacity, { toValue: 0.18, duration: 140, useNativeDriver: true }),
      Animated.timing(flashOpacity, { toValue: 0, duration: 210, useNativeDriver: true }),
    ]).start();
  }, [resolvedMode, flashOpacity]);

  return (
    <AppThemeProvider value={theme}>
      <View style={styles.fill}>
        {children}
        {/* Overlay that briefly flashes on theme change */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.bg, opacity: flashOpacity },
          ]}
        />
      </View>
    </AppThemeProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemePreferenceProvider>
          <FontScalePreferenceProvider>
            <ThemeWrapper>
              <BackgroundPrefetch />
              <NotificationRegistrar />
              <PasswordChangeGate />
              <RootNavigator />
              <AppAlertHost />
            </ThemeWrapper>
          </FontScalePreferenceProvider>
        </ThemePreferenceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
