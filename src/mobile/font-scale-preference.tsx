import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontScalePreference = 'DEFAULT' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';

type FontScalePreferenceContextValue = {
  preference: FontScalePreference;
  fontScale: number;
  isLoading: boolean;
  setPreference: (next: FontScalePreference) => Promise<void>;
};

export const FONT_SCALE_PREFERENCE_STORAGE_KEY = 'spd-mobile:font-scale-preference';

const FontScalePreferenceContext = createContext<FontScalePreferenceContextValue | undefined>(undefined);

const normalizePreference = (value: string | null): FontScalePreference => {
  if (
    value === 'DEFAULT' ||
    value === 'MEDIUM' ||
    value === 'LARGE' ||
    value === 'EXTRA_LARGE'
  ) {
    return value;
  }
  return 'DEFAULT';
};

const fontScaleByPreference: Record<FontScalePreference, number> = {
  DEFAULT: 1,
  MEDIUM: 1.08,
  LARGE: 1.16,
  EXTRA_LARGE: 1.26,
};

export const scaleFont = (size: number, fontScale: number) =>
  Math.round(size * fontScale * 10) / 10;

export const FontScalePreferenceProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = useState<FontScalePreference>('DEFAULT');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(FONT_SCALE_PREFERENCE_STORAGE_KEY);
        setPreferenceState(normalizePreference(stored));
      } finally {
        setIsLoading(false);
      }
    };

    void loadPreference();
  }, []);

  const setPreference = useCallback(async (next: FontScalePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(FONT_SCALE_PREFERENCE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<FontScalePreferenceContextValue>(
    () => ({
      preference,
      fontScale: fontScaleByPreference[preference],
      isLoading,
      setPreference,
    }),
    [isLoading, preference, setPreference],
  );

  return (
    <FontScalePreferenceContext.Provider value={value}>
      {children}
    </FontScalePreferenceContext.Provider>
  );
};

export const useFontScalePreference = () => {
  const context = useContext(FontScalePreferenceContext);
  if (!context) {
    throw new Error('useFontScalePreference precisa estar dentro de <FontScalePreferenceProvider>');
  }
  return context;
};
