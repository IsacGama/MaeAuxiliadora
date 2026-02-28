import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';
export type ResolvedThemeMode = 'light' | 'dark';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  resolvedMode: ResolvedThemeMode;
  isLoading: boolean;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = 'spd-mobile:theme-preference';
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

const normalizePreference = (value: string | null): ThemePreference => {
  if (value === 'LIGHT' || value === 'DARK' || value === 'SYSTEM') {
    return value;
  }
  return 'LIGHT';
};

export const ThemePreferenceProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('LIGHT');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        setPreferenceState(normalizePreference(stored));
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreference();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const resolvedMode: ResolvedThemeMode = useMemo(() => {
    if (preference === 'LIGHT') return 'light';
    if (preference === 'DARK') return 'dark';
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      resolvedMode,
      isLoading,
      setPreference,
    }),
    [isLoading, preference, resolvedMode, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
};

export const useThemePreference = () => {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference precisa estar dentro de <ThemePreferenceProvider>');
  }
  return context;
};
