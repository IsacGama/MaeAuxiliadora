import * as FileSystem from 'expo-file-system/legacy';
import audioManifestData from '../data/audio-manifest.json';
import { appConfig } from './config';
import { DevotionLanguage } from './devotions';

type AudioManifestEntry = {
  key: string;
  id: string;
  title: string;
  source: string;
  lang: DevotionLanguage;
  locale: string;
  voice: string;
  hash: string;
  path: string;
};

type AudioManifest = {
  version: number;
  provider: string;
  generatedAt: string | null;
  executeMode: boolean;
  profile: {
    rate: string;
    pitch: string;
    format: string;
  };
  langs: DevotionLanguage[];
  count: number;
  byKey: Record<string, string>;
  entries: AudioManifestEntry[];
};

const manifestCacheDirectory = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}devotion-audio/`
  : null;
const manifestCachePath = manifestCacheDirectory
  ? `${manifestCacheDirectory}manifest.json`
  : null;

const embeddedManifest = audioManifestData as AudioManifest;
let manifestSnapshot: AudioManifest = embeddedManifest;
let manifestPromise: Promise<AudioManifest> | null = null;
let lastRemoteRefreshAt = 0;
const REMOTE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const manifestEndpoint = `${trimTrailingSlash(
  appConfig.devotionAudioBaseUrl || appConfig.apiUrl,
)}/public/devotions/audio/manifest`;

const isValidManifest = (payload: unknown): payload is AudioManifest => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const entries = (payload as any).entries;
  return Array.isArray(entries);
};

const hasManifestEntries = (payload: AudioManifest | null | undefined) =>
  Boolean(payload && Array.isArray(payload.entries) && payload.entries.length > 0);

const ensureCacheDirectory = async () => {
  if (!manifestCacheDirectory) {
    return;
  }
  const info = await FileSystem.getInfoAsync(manifestCacheDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(manifestCacheDirectory, {
      intermediates: true,
    });
  }
};

const saveManifestCache = async (manifest: AudioManifest) => {
  if (!manifestCachePath) {
    return;
  }

  try {
    await ensureCacheDirectory();
    await FileSystem.writeAsStringAsync(
      manifestCachePath,
      JSON.stringify(manifest),
      {
        encoding: FileSystem.EncodingType.UTF8,
      },
    );
  } catch {
    // Ignora falha de cache local.
  }
};

const readManifestCache = async (): Promise<AudioManifest | null> => {
  if (!manifestCachePath) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(manifestCachePath);
    if (!info.exists) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(manifestCachePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(raw);
    if (!isValidManifest(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const loadRemoteManifest = async (): Promise<AudioManifest | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(manifestEndpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!isValidManifest(payload)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const refreshRemoteManifestInBackground = async () => {
  const remote = await loadRemoteManifest();
  if (!remote) {
    return;
  }
  manifestSnapshot = remote;
  lastRemoteRefreshAt = Date.now();
  await saveManifestCache(remote);
};

export const getDevotionAudioManifest = async (options?: {
  forceRemote?: boolean;
}) => {
  const forceRemote = options?.forceRemote === true;

  if (!forceRemote && hasManifestEntries(manifestSnapshot)) {
    const now = Date.now();
    if (
      now - lastRemoteRefreshAt > REMOTE_REFRESH_INTERVAL_MS &&
      !manifestPromise
    ) {
      void refreshRemoteManifestInBackground();
      lastRemoteRefreshAt = now;
    }
    return manifestSnapshot;
  }

  if (manifestPromise) {
    return manifestPromise;
  }

  manifestPromise = (async () => {
    if (forceRemote) {
      const remote = await loadRemoteManifest();
      if (remote) {
        manifestSnapshot = remote;
        lastRemoteRefreshAt = Date.now();
        await saveManifestCache(remote);
        return remote;
      }
    }

    const remote = await loadRemoteManifest();
    if (remote) {
      manifestSnapshot = remote;
      lastRemoteRefreshAt = Date.now();
      await saveManifestCache(remote);
      return remote;
    }

    const cached = await readManifestCache();
    if (cached) {
      manifestSnapshot = cached;
      lastRemoteRefreshAt = Date.now();
      void refreshRemoteManifestInBackground();
      return cached;
    }

    manifestSnapshot = embeddedManifest;
    return embeddedManifest;
  })().finally(() => {
    manifestPromise = null;
  });

  return manifestPromise;
};

export const getDevotionAudioManifestSync = () => manifestSnapshot;

export const getDevotionAudioPath = async (options: {
  prayerId: string;
  lang: DevotionLanguage;
  voice: string;
}) => {
  const manifest = await getDevotionAudioManifest();
  const key = `${options.lang}:${options.voice}:${options.prayerId}`;
  return manifest.byKey[key] ?? null;
};

export const hasDevotionAudioFor = async (options: {
  prayerId: string;
  lang: DevotionLanguage;
}) => {
  const manifest = await getDevotionAudioManifest();
  return manifest.entries.some(
    (entry) => entry.id === options.prayerId && entry.lang === options.lang,
  );
};
