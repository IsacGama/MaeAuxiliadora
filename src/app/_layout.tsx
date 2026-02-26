import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../mobile/auth-context';
import { ThemePreferenceProvider, useThemePreference } from '../mobile/theme-preference';
import {
  addNotificationResponseListener,
  configureNotificationHandling,
  isPushRegistrationSupported,
  registerForPushNotifications,
} from '../mobile/notifications';

function NotificationRegistrar() {
  const { isAuthenticated, session } = useAuth();

  useEffect(() => {
    void configureNotificationHandling();
  }, []);

  useEffect(() => {
    if (!isPushRegistrationSupported()) {
      return;
    }

    if (!isAuthenticated || !session?.accessToken) {
      return;
    }

    let cancelled = false;

    void registerForPushNotifications(session.accessToken).catch(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, session?.accessToken]);

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
