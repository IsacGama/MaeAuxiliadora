const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const parseIntSafe = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const appConfig = {
  apiUrl: trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'),
  publicWebUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_WEB_URL ?? 'https://eclesialhub.isacgama.tech',
  ),
  devotionAudioBaseUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_DEVOTION_AUDIO_BASE_URL ??
      process.env.EXPO_PUBLIC_API_URL ??
      'http://localhost:3000',
  ),
  liturgyApiUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_LITURGY_API_URL ?? 'https://liturgia.up.railway.app/v2',
  ),
  saintApiUrl: trimTrailingSlash(
    process.env.EXPO_PUBLIC_SAINT_API_URL ?? 'https://catolicoapp.com/wp-json/wp/v2/santos',
  ),
  orgDomain: (process.env.EXPO_PUBLIC_ORG_DOMAIN ?? '').trim(),
  requestTimeoutMs: parseIntSafe(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS, 10000),
  cacheTtlMs: 24 * 60 * 60 * 1000,
};

export type AppConfig = typeof appConfig;
