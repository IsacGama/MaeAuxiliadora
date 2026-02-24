import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../mobile/auth-context';
import { ThemePreferenceProvider, useThemePreference } from '../mobile/theme-preference';

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
          <RootNavigator />
        </ThemePreferenceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
