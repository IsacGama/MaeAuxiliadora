import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokensFile from '../tokens/branding.json';
import { buildBrandingColorsFromTokens } from '../mobile/branding-tokens';

const USER_THEME_KEY = 'spd:user-theme';

type Colors = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
};

type MobileThemeContextValue = {
  colors: Colors;
  fonts: typeof tokensFile.fonts;
  isDark: boolean;
  toggle: () => void;
  setBranding: (tokens: Record<string, string | undefined>) => void;
};

const defaultColors = buildBrandingColorsFromTokens(tokensFile.defaults as Record<string, string>);

const MobileThemeContext = createContext<MobileThemeContextValue>({
  colors: defaultColors,
  fonts: tokensFile.fonts,
  isDark: Appearance.getColorScheme() === 'dark',
  toggle: () => {},
  setBranding: () => {},
});

export function MobileThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(Appearance.getColorScheme() === 'dark');
  const [colors, setColors] = useState<Colors>(defaultColors);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      // Only apply system changes if user didn't override
      AsyncStorage.getItem(USER_THEME_KEY).then((override) => {
        if (override === 'dark' || override === 'light') return;
        setIsDark(colorScheme === 'dark');
      });
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // load user override if present
    (async () => {
      try {
        const u = await AsyncStorage.getItem(USER_THEME_KEY);
        if (u === 'dark') setIsDark(true);
        else if (u === 'light') setIsDark(false);
      } catch {
        // ignore
      }
    })();
  }, []);

  const toggle = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(USER_THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  const setBranding = useCallback((incomingTokens: Record<string, string | undefined>) => {
    // merge defaults with incoming tokens
    const merged = { ...(tokensFile.defaults as Record<string, string>), ...incomingTokens };
    const built = buildBrandingColorsFromTokens(merged);
    setColors(built);
  }, []);

  const value = useMemo(() => ({ colors, fonts: tokensFile.fonts, isDark, toggle, setBranding }), [colors, isDark, toggle, setBranding]);

  return <MobileThemeContext.Provider value={value}>{children}</MobileThemeContext.Provider>;
}

export function useMobileTheme() {
  return React.useContext(MobileThemeContext);
}
