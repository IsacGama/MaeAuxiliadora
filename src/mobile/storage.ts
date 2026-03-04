import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from './config';
import { getDayKey } from './date';

type CacheEnvelope<T> = {
  value: T;
  savedAt: number;
  expiresAt: number;
  dayKey?: string;
};

const buildEnvelope = <T>(value: T, options?: { dayKey?: string; ttlMs?: number }): CacheEnvelope<T> => {
  const now = Date.now();
  return {
    value,
    savedAt: now,
    expiresAt: now + (options?.ttlMs ?? appConfig.cacheTtlMs),
    dayKey: options?.dayKey,
  };
};

const safeParse = <T>(raw: string | null): CacheEnvelope<T> | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
};

export const setCache = async <T>(key: string, value: T, options?: { dayKey?: string; ttlMs?: number }) => {
  const envelope = buildEnvelope(value, options);
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
};

export const getCacheEnvelope = async <T>(key: string) => {
  const envelope = safeParse<T>(await AsyncStorage.getItem(key));
  if (!envelope) {
    return null;
  }

  if (Date.now() > envelope.expiresAt) {
    await AsyncStorage.removeItem(key);
    return null;
  }

  return envelope;
};

export const getCacheValue = async <T>(key: string) => {
  const envelope = await getCacheEnvelope<T>(key);
  return envelope?.value ?? null;
};

export const getDailyCacheValue = async <T>(key: string, dayKey: string = getDayKey()) => {
  const envelope = await getCacheEnvelope<T>(key);
  if (!envelope) {
    return null;
  }

  if (envelope.dayKey !== dayKey) {
    return null;
  }

  return envelope.value;
};

export const clearCache = async (key: string) => {
  await AsyncStorage.removeItem(key);
};

export const clearStorageByPrefix = async (
  prefix: string,
  options?: { preserveKeys?: string[] },
) => {
  const allKeys = await AsyncStorage.getAllKeys();
  if (!allKeys.length) {
    return 0;
  }

  const preserveSet = new Set(options?.preserveKeys ?? []);
  const keysToRemove = allKeys.filter(
    (key) => key.startsWith(prefix) && !preserveSet.has(key),
  );

  if (!keysToRemove.length) {
    return 0;
  }

  await AsyncStorage.multiRemove(keysToRemove);
  return keysToRemove.length;
};
