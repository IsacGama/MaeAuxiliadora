import { OrgBranding } from './types';

export type AppTheme = {
  bg: string;
  surface: string;
  border: string;
  text: string;
  textSoft: string;
  primary: string;
  secondary: string;
  accent: string;
};

const defaultTheme: AppTheme = {
  bg: '#0B1320',
  surface: '#13243B',
  border: '#28456E',
  text: '#F5F8FF',
  textSoft: '#A7B8D1',
  primary: '#1F3B70',
  secondary: '#DA8B3C',
  accent: '#8B2635',
};

const lightDefaultTheme: AppTheme = {
  bg: '#F3F7FF',
  surface: '#FFFFFF',
  border: '#C6D4EC',
  text: '#11243D',
  textSoft: '#4C6486',
  primary: '#1F3B70',
  secondary: '#DA8B3C',
  accent: '#8B2635',
};

const normalizeHex = (value?: string | null, fallback?: string) => {
  if (!value) {
    return fallback ?? '#000000';
  }

  const hex = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex;
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const [_, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return fallback ?? '#000000';
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getTextColorForBackground = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0B1320' : '#F5F8FF';
};

export const createTheme = (branding: OrgBranding | null): AppTheme => {
  return createThemeWithMode(branding, 'dark');
};

export const createThemeWithMode = (
  branding: OrgBranding | null,
  mode: 'light' | 'dark',
): AppTheme => {
  const base = mode === 'dark' ? defaultTheme : lightDefaultTheme;
  if (!branding) {
    return base;
  }

  const primary = normalizeHex(branding.primaryColor, base.primary);
  const secondary = normalizeHex(branding.secondaryColor, base.secondary);
  const accent = normalizeHex(branding.accentColor, base.accent);

  if (mode === 'light') {
    return {
      bg: '#F3F7FF',
      surface: withAlpha(primary, 0.1),
      border: withAlpha(primary, 0.3),
      text: '#11243D',
      textSoft: '#4C6486',
      primary,
      secondary,
      accent,
    };
  }

  return {
    bg: '#0B1320',
    surface: withAlpha(primary, 0.2),
    border: withAlpha(primary, 0.55),
    text: getTextColorForBackground('#0B1320'),
    textSoft: withAlpha('#EAF2FF', 0.74),
    primary,
    secondary,
    accent,
  };
};

export { defaultTheme, lightDefaultTheme };
