import { OrgBranding } from './types';

export type AppTheme = {
  bg: string;
  surface: string;
  surfaceOpaque: string;
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
  surfaceOpaque: '#13243B',
  border: '#28456E',
  text: '#F5F8FF',
  textSoft: '#A7B8D1',
  primary: '#6B90C8',
  secondary: '#DA8B3C',
  accent: '#8B2635',
};

const lightDefaultTheme: AppTheme = {
  bg: '#F3F7FF',
  surface: '#FFFFFF',
  surfaceOpaque: '#FFFFFF',
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

const toHex2 = (n: number): string =>
  Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

const getLuminance = (r: number, g: number, b: number): number =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/** Composite: place `hex` at `alpha` over `bgHex`, returns an opaque hex. */
const blendOnto = (hex: string, alpha: number, bgHex: string): string => {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(bgHex);
  return `#${toHex2(bg.r * (1 - alpha) + fg.r * alpha)}${toHex2(bg.g * (1 - alpha) + fg.g * alpha)}${toHex2(bg.b * (1 - alpha) + fg.b * alpha)}`;
};

/** Blends `hex` toward white until luminance >= minLum. No-op if already sufficient. */
const ensureMinLuminance = (hex: string, minLum: number): string => {
  const { r, g, b } = hexToRgb(hex);
  if (getLuminance(r, g, b) >= minLum) return hex;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 10; i++) {
    const t = (lo + hi) / 2;
    if (getLuminance(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t) < minLum) lo = t;
    else hi = t;
  }
  return `#${toHex2(r + (255 - r) * hi)}${toHex2(g + (255 - g) * hi)}${toHex2(b + (255 - b) * hi)}`;
};

/** Blends `hex` toward black until luminance <= maxLum. No-op if already sufficient. */
const ensureMaxLuminance = (hex: string, maxLum: number): string => {
  const { r, g, b } = hexToRgb(hex);
  if (getLuminance(r, g, b) <= maxLum) return hex;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 10; i++) {
    const t = (lo + hi) / 2;
    if (getLuminance(r * (1 - t), g * (1 - t), b * (1 - t)) > maxLum) lo = t;
    else hi = t;
  }
  return `#${toHex2(r * (1 - hi))}${toHex2(g * (1 - hi))}${toHex2(b * (1 - hi))}`;
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

  const rawPrimary = normalizeHex(branding.primaryColor, base.primary);
  const secondary = normalizeHex(branding.secondaryColor, base.secondary);
  const accent = normalizeHex(branding.accentColor, base.accent);

  if (mode === 'light') {
    // Ensure primary is dark enough to be readable on the light (#F3F7FF) background.
    const primary = ensureMaxLuminance(rawPrimary, 0.28);
    return {
      bg: '#F3F7FF',
      surface: withAlpha(rawPrimary, 0.1),
      surfaceOpaque: blendOnto(rawPrimary, 0.1, '#F3F7FF'),
      border: withAlpha(rawPrimary, 0.3),
      text: '#11243D',
      textSoft: '#4C6486',
      primary,
      secondary,
      accent,
    };
  }

  // Ensure primary is light enough to be readable on the dark (#0B1320) background.
  const primary = ensureMinLuminance(rawPrimary, 0.40);
  return {
    bg: '#0B1320',
    surface: withAlpha(rawPrimary, 0.2),
    surfaceOpaque: blendOnto(rawPrimary, 0.2, '#0B1320'),
    border: withAlpha(rawPrimary, 0.55),
    text: getTextColorForBackground('#0B1320'),
    textSoft: withAlpha('#EAF2FF', 0.74),
    primary,
    secondary,
    accent,
  };
};

export { defaultTheme, lightDefaultTheme };
