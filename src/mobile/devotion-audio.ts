import * as FileSystem from 'expo-file-system/legacy';
import { appConfig } from './config';
import { getDevotionAudioManifest } from './devotion-audio-manifest';
import { DevotionLanguage } from './devotions';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const offlineDirectory = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}devotion-audio/`
  : null;

type ManifestEntry = {
  id: string;
  lang: DevotionLanguage;
  voice: string;
  path: string;
  hash: string;
};

const resolveManifestEntry = (
  manifest: { entries?: ManifestEntry[] },
  prayerId: string,
  language: DevotionLanguage,
): ManifestEntry | null => {
  const entries = (manifest.entries ?? []) as ManifestEntry[];
  const found = entries.find(
    (entry) => entry.id === prayerId && entry.lang === language,
  );
  return found ?? null;
};

const resolveManifestEntries = (
  manifest: { entries?: ManifestEntry[] },
  options: { language: DevotionLanguage; prayerIds?: string[] },
) => {
  const entries = (manifest.entries ?? []) as ManifestEntry[];
  const filtered = entries.filter((entry) => entry.lang === options.language);

  if (!options.prayerIds?.length) {
    return filtered;
  }

  const allowedPrayerIds = new Set(options.prayerIds);
  return filtered.filter((entry) => allowedPrayerIds.has(entry.id));
};

const toAbsoluteAudioUrl = (relativePath: string) => {
  if (!relativePath) {
    return null;
  }
  const normalizedPath =
    relativePath.startsWith('/audio/')
      ? `/public/devotions/audio/${relativePath.slice('/audio/'.length)}`
      : relativePath;
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  const base =
    trimTrailingSlash(appConfig.devotionAudioBaseUrl || appConfig.apiUrl);
  const fullPath = normalizedPath.startsWith('/')
    ? normalizedPath
    : `/${normalizedPath}`;
  return `${base}${fullPath}`;
};

const ensureOfflineDir = async () => {
  if (!offlineDirectory) {
    return null;
  }

  const info = await FileSystem.getInfoAsync(offlineDirectory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(offlineDirectory, { intermediates: true });
  }
  return offlineDirectory;
};

const toLocalAudioPath = (entry: ManifestEntry) => {
  if (!offlineDirectory) {
    return null;
  }

  const safePrayer = entry.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${offlineDirectory}${entry.lang}-${safePrayer}-${entry.hash}.mp3`;
};

export const getPrayerAudioSource = async (options: {
  prayerId: string;
  language: DevotionLanguage;
}): Promise<{ uri: string; cached: boolean; remote: boolean } | null> => {
  const manifest = await getDevotionAudioManifest();
  const entry = resolveManifestEntry(manifest, options.prayerId, options.language);
  if (!entry) {
    return null;
  }

  const remoteUrl = toAbsoluteAudioUrl(entry.path);
  if (!remoteUrl) {
    return null;
  }

  const localPath = toLocalAudioPath(entry);
  if (localPath) {
    const localInfo = await FileSystem.getInfoAsync(localPath);
    if (localInfo.exists) {
      return { uri: localPath, cached: true, remote: false };
    }
  }

  return { uri: remoteUrl, cached: false, remote: true };
};

export const downloadPrayerAudioEntries = async (options: {
  language: DevotionLanguage;
  prayerIds?: string[];
  onProgress?: (payload: {
    current: number;
    total: number;
    downloaded: number;
    skipped: number;
    failed: number;
  }) => void;
}) => {
  const manifest = await getDevotionAudioManifest();
  const allEntries = resolveManifestEntries(manifest, {
    language: options.language,
    prayerIds: options.prayerIds,
  });

  const uniqueById = new Map<string, ManifestEntry>();
  allEntries.forEach((entry) => {
    if (!uniqueById.has(entry.id)) {
      uniqueById.set(entry.id, entry);
    }
  });

  const entries = [...uniqueById.values()];
  const total = entries.length;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  if (!total) {
    return { total, downloaded, skipped, failed };
  }

  await ensureOfflineDir();

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const remoteUrl = toAbsoluteAudioUrl(entry.path);
    const localPath = toLocalAudioPath(entry);

    if (!remoteUrl || !localPath) {
      failed += 1;
      options.onProgress?.({ current: index + 1, total, downloaded, skipped, failed });
      continue;
    }

    try {
      const localInfo = await FileSystem.getInfoAsync(localPath);
      if (localInfo.exists) {
        skipped += 1;
      } else {
        await FileSystem.downloadAsync(remoteUrl, localPath);
        downloaded += 1;
      }
    } catch {
      failed += 1;
    }

    options.onProgress?.({
      current: index + 1,
      total,
      downloaded,
      skipped,
      failed,
    });
  }

  return { total, downloaded, skipped, failed };
};

export const clearDownloadedPrayerAudios = async () => {
  if (!offlineDirectory) {
    return;
  }

  const info = await FileSystem.getInfoAsync(offlineDirectory);
  if (!info.exists) {
    return;
  }

  await FileSystem.deleteAsync(offlineDirectory, { idempotent: true });
};

export const getDownloadedPrayerAudioStats = async () => {
  if (!offlineDirectory) {
    return { count: 0, bytes: 0 };
  }

  const info = await FileSystem.getInfoAsync(offlineDirectory);
  if (!info.exists) {
    return { count: 0, bytes: 0 };
  }

  const fileNames = await FileSystem.readDirectoryAsync(offlineDirectory);
  let bytes = 0;
  let count = 0;

  for (const fileName of fileNames) {
    const filePath = `${offlineDirectory}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists || fileInfo.isDirectory) {
      continue;
    }
    count += 1;
    bytes += fileInfo.size ?? 0;
  }

  return { count, bytes };
};

export const hasPrayerAudioManifestEntry = async (
  prayerId: string,
  language: DevotionLanguage,
) => {
  const manifest = await getDevotionAudioManifest();
  return Boolean(resolveManifestEntry(manifest, prayerId, language));
};
