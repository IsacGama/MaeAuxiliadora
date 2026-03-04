import React, { createContext, useContext, useMemo } from 'react';
import { OrgBranding } from './types';

// ---------------------------------------------------------------------------
// AppTheme — the unified set of semantic colours used by every screen
// ---------------------------------------------------------------------------

export type AppTheme = {
  bg: string;
  surface: string;
  surfaceOpaque: string;
  border: string;
  text: string;
  textSoft: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  /** Nav bar (tab bar, hero header) background — derived from raw primary HSL like frontend sidebar. */
  navBg: string;
  /** Text / icon on navBg. Always near-white because navBg is always dark. */
  navForeground: string;
  /** Active tab tint on navBg — uses the secondary brand colour. */
  navActiveTint: string;
  /** Destructive action colour (mode-aware: saturated red, accessible in both modes). */
  destructive: string;
  /** Text colour on a destructive-coloured background. */
  destructiveForeground: string;
};

// ---------------------------------------------------------------------------
// Default themes
// ---------------------------------------------------------------------------

const defaultTheme: AppTheme = {
  bg: '#0B1320',
  surface: '#13243B',
  surfaceOpaque: '#13243B',
  border: '#28456E',
  text: '#F5F8FF',
  textSoft: '#A7B8D1',
  primary: '#6B90C8',
  primaryForeground: '#F5F8FF',
  secondary: '#DA8B3C',
  secondaryForeground: '#F5F8FF',
  accent: '#8B2635',
  accentForeground: '#F5F8FF',
  navBg: '#071020',
  navForeground: '#c8d8ee',
  navActiveTint: '#DA8B3C',
  destructive: '#f87171',
  destructiveForeground: '#1b2a41',
};

const lightDefaultTheme: AppTheme = {
  bg: '#F3F7FF',
  surface: '#FFFFFF',
  surfaceOpaque: '#FFFFFF',
  border: '#C6D4EC',
  text: '#11243D',
  textSoft: '#4C6486',
  primary: '#1F3B70',
  primaryForeground: '#F5F8FF',
  secondary: '#DA8B3C',
  secondaryForeground: '#F5F8FF',
  accent: '#8B2635',
  accentForeground: '#F5F8FF',
  navBg: '#1a3460',
  navForeground: '#f1f5f9',
  navActiveTint: '#DA8B3C',
  destructive: '#b91c1c',
  destructiveForeground: '#f1f5f9',
};

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

const normalizeHex = (value?: string | null, fallback?: string): string => {
  if (!value) return fallback ?? '#000000';
  const hex = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
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

export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const toHex2 = (n: number): string =>
  Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

const blendOnto = (hex: string, alpha: number, bgHex: string): string => {
  const fg = hexToRgb(hex);
  const bg = hexToRgb(bgHex);
  return `#${toHex2(bg.r * (1 - alpha) + fg.r * alpha)}${toHex2(bg.g * (1 - alpha) + fg.g * alpha)}${toHex2(bg.b * (1 - alpha) + fg.b * alpha)}`;
};

// ---------------------------------------------------------------------------
// HSL conversion — ported from frontend branding-theme.ts
// ---------------------------------------------------------------------------

type Hsl = { h: number; s: number; l: number };

const hexToHsl = (hex: string): Hsl => {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0, gn = 0, bn = 0;
  if (h < 60) { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else { rn = c; bn = x; }
  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
  };
};

const hslToHex = (h: number, s: number, l: number): string => {
  const { r, g, b } = hslToRgb(h, s, l);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
};

// ---------------------------------------------------------------------------
// Contrast / adaptation  — ported from frontend branding-theme.ts
// ---------------------------------------------------------------------------

/**
 * Pick a foreground colour (text on a solid-coloured button) based on the
 * ORIGINAL brand hex.  Uses the same 0.6 luminance threshold as the frontend.
 *
 * Frontend equivalent returns HSL tokens "222 47% 11%" / "210 40% 98%";
 * here we return the corresponding hex values.
 */
const pickForeground = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // luminance > 0.6 → dark text on light bg, otherwise light text on dark bg
  return luminance > 0.6 ? '#1b2a41' : '#f1f5f9';
};

/**
 * Matches the frontend exactly:
 *   • Dark mode  – if lightness < 50 %, boost to 50 % (otherwise keep as-is).
 *   • Light mode – NO adaptation; keep original colour.
 *
 * IMPORTANT: foreground (button text) colours must always be calculated from
 * the ORIGINAL hex, not from the adapted HSL, so button text stays correct
 * (e.g. white on dark blue, dark on gold).
 */
const adaptHslForMode = (hsl: Hsl, isDark: boolean): Hsl => {
  if (!isDark || hsl.l >= 50) return hsl;
  return { ...hsl, l: 50 };
};

export const getTextColorForBackground = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1b2a41' : '#f1f5f9';
};

// ---------------------------------------------------------------------------
// Theme creation
// ---------------------------------------------------------------------------

export const createTheme = (branding: OrgBranding | null): AppTheme => {
  return createThemeWithMode(branding, 'dark');
};

export const createThemeWithMode = (
  branding: OrgBranding | null,
  mode: 'light' | 'dark',
): AppTheme => {
  const base = mode === 'dark' ? defaultTheme : lightDefaultTheme;
  if (!branding) return base;

  const isDark = mode === 'dark';

  const rawPrimaryHex = normalizeHex(branding.primaryColor, isDark ? defaultTheme.primary : lightDefaultTheme.primary);
  const rawSecondaryHex = normalizeHex(branding.secondaryColor, base.secondary);
  const rawAccentHex = normalizeHex(branding.accentColor, base.accent);

  // Adapt every brand colour for the current mode via HSL
  const primaryHsl = adaptHslForMode(hexToHsl(rawPrimaryHex), isDark);
  const secondaryHsl = adaptHslForMode(hexToHsl(rawSecondaryHex), isDark);
  const accentHsl = adaptHslForMode(hexToHsl(rawAccentHex), isDark);

  const primary = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);
  const secondary = hslToHex(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l);
  const accent = hslToHex(accentHsl.h, accentHsl.s, accentHsl.l);

  // In light mode, very bright secondary colours (e.g. yellow) become
  // unreadable when reused as text on light surfaces. Derive an "ink"
  // variant for general UI text while preserving the raw brand colour
  // for nav active tint on dark tab bar.
  const secondaryIsLight = getTextColorForBackground(rawSecondaryHex) === '#1b2a41';
  const secondaryForUi =
    !isDark && secondaryIsLight
      ? hslToHex(secondaryHsl.h, secondaryHsl.s, Math.max(24, Math.min(38, secondaryHsl.l - 18)))
      : secondary;

  // Foreground computed from effective UI colours.
  const primaryForeground = pickForeground(primary);
  const secondaryForeground = pickForeground(secondaryForUi);
  const accentForeground = pickForeground(accent);

  // ---------------------------------------------------------------------------
  // navBg — derived from ORIGINAL (un-adapted) primary HSL, matching frontend
  // sidebar formula: dark = l-17 (min 4%), light = l-5 (min 10%).
  // This produces the dark-navy sidebar feel in dark mode and a rich deep
  // brand-coloured bar in light mode — without the bright-blue boost artifact.
  // ---------------------------------------------------------------------------
  const rawPrimaryHsl = hexToHsl(rawPrimaryHex);
  const navBgL = isDark
    ? Math.max(rawPrimaryHsl.l - 17, 4)
    : Math.max(rawPrimaryHsl.l - 5, 10);
  const navBg = hslToHex(rawPrimaryHsl.h, rawPrimaryHsl.s, navBgL);
  // navForeground is always near-white because navBg is always a dark colour.
  const navForeground = '#f1f5f9';
  const navActiveTint = !isDark ? rawSecondaryHex : secondary;

  // ---------------------------------------------------------------------------
  // Destructive — accessible red in both modes.
  //   Dark  : lighter red (#f87171) stands out on dark bg.
  //   Light : darker red (#b91c1c) readable on white bg.
  // ---------------------------------------------------------------------------
  const destructive = isDark ? '#f87171' : '#b91c1c';
  const destructiveForeground = isDark ? '#1b2a41' : '#f1f5f9';

  if (isDark) {
    return {
      bg: '#0B1320',
      surface: withAlpha(rawPrimaryHex, 0.2),
      surfaceOpaque: blendOnto(rawPrimaryHex, 0.2, '#0B1320'),
      border: withAlpha(rawPrimaryHex, 0.55),
      text: '#F5F8FF',
      textSoft: withAlpha('#EAF2FF', 0.74),
      primary,
      primaryForeground,
      secondary: secondaryForUi,
      secondaryForeground,
      accent,
      accentForeground,
      navBg,
      navForeground,
      navActiveTint,
      destructive,
      destructiveForeground,
    };
  }

  return {
    bg: '#F3F7FF',
    surface: withAlpha(rawPrimaryHex, 0.1),
    surfaceOpaque: blendOnto(rawPrimaryHex, 0.1, '#F3F7FF'),
    border: withAlpha(rawPrimaryHex, 0.3),
    text: '#11243D',
    textSoft: '#4C6486',
    primary,
    primaryForeground,
    secondary: secondaryForUi,
    secondaryForeground,
    accent,
    accentForeground,
    navBg,
    navForeground,
    navActiveTint,
    destructive,
    destructiveForeground,
  };
};

// ---------------------------------------------------------------------------
// React context — compute once in root, consumed everywhere via useAppTheme()
// ---------------------------------------------------------------------------

const AppThemeContext = createContext<AppTheme>(defaultTheme);

export const AppThemeProvider = AppThemeContext.Provider;

export const useAppTheme = (): AppTheme => useContext(AppThemeContext);

/**
 * Helper hook for root layout: creates theme from org branding + mode and
 * returns a memoised value ready to be passed to <AppThemeProvider>.
 */
export const useComputedTheme = (
  branding: OrgBranding | null | undefined,
  mode: 'light' | 'dark',
): AppTheme =>
  useMemo(() => createThemeWithMode(branding ?? null, mode), [branding, mode]);

// ---------------------------------------------------------------------------
// Re-exports for backwards compat
// ---------------------------------------------------------------------------

export { defaultTheme, lightDefaultTheme };
