
type Hsl = { h: number; s: number; l: number };

export function parseHslToken(token?: string | null): Hsl {
  if (!token) return { h: 220, s: 45, l: 25 };
  const parts = token.trim().split(/\s+/);
  const h = Number(parts[0]) || 0;
  const s = Number(parts[1]?.replace('%', '')) || 0;
  const l = Number(parts[2]?.replace('%', '')) || 0;
  return { h, s, l };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
export function hslToRgb(h: number, s: number, l: number) {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp01(s / 100);
  const ln = clamp01(l / 100);
  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(p, q, hn + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hn) * 255);
  const b = Math.round(hue2rgb(p, q, hn - 1 / 3) * 255);
  return { r, g, b };
}

export function hslToHex(h: number, s: number, l: number) {
  const { r, g, b } = hslToRgb(h, s, l);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function pickForegroundFromHex(hex: string) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#162029' : '#ffffff';
}

export function buildBrandingColorsFromTokens(tokens: Record<string, string | undefined>) {
  const primaryHsl = parseHslToken(tokens['primary']);
  const secondaryHsl = parseHslToken(tokens['secondary']);
  const accentHsl = parseHslToken(tokens['accent']);

  const primary = hslToHex(primaryHsl.h, primaryHsl.s, primaryHsl.l);
  const secondary = hslToHex(secondaryHsl.h, secondaryHsl.s, secondaryHsl.l);
  const accent = hslToHex(accentHsl.h, accentHsl.s, accentHsl.l);

  return {
    primary,
    primaryForeground: pickForegroundFromHex(primary),
    secondary,
    secondaryForeground: pickForegroundFromHex(secondary),
    accent,
    accentForeground: pickForegroundFromHex(accent),
  };
}