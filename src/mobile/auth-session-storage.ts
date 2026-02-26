import { clearCache, getCacheValue, setCache } from './storage';

const SECURE_SESSION_STORAGE_KEY = 'spd-mobile:auth-session:secure';
const FALLBACK_SESSION_STORAGE_KEY = 'spd-mobile:auth-session';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const AUTH_SESSION_TTL_MS = 30 * DAY_IN_MS;

type SessionEnvelope<T> = {
  value: T;
  savedAt: number;
  expiresAt: number;
};

type SecureStoreLike = {
  isAvailableAsync?: () => Promise<boolean>;
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (
    key: string,
    value: string,
    options?: Record<string, unknown>,
  ) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY?: unknown;
};

let secureStorePromise: Promise<SecureStoreLike | null> | null = null;

const safeParseEnvelope = <T>(raw: string | null): SessionEnvelope<T> | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SessionEnvelope<T>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.expiresAt !== 'number' ||
      !('value' in parsed)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const buildEnvelope = <T>(value: T, ttlMs: number): SessionEnvelope<T> => {
  const now = Date.now();
  return {
    value,
    savedAt: now,
    expiresAt: now + ttlMs,
  };
};

const resolveSecureStore = async (): Promise<SecureStoreLike | null> => {
  try {
    const runtimeRequire =
      (globalThis as { require?: (name: string) => unknown }).require ??
      null;

    let candidate: unknown = null;
    if (runtimeRequire) {
      candidate = runtimeRequire('expo-secure-store');
    } else {
      // eslint-disable-next-line no-new-func
      const req = Function('return require')() as (name: string) => unknown;
      candidate = req('expo-secure-store');
    }

    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const secureStore = candidate as SecureStoreLike;
    if (
      typeof secureStore.getItemAsync !== 'function' ||
      typeof secureStore.setItemAsync !== 'function' ||
      typeof secureStore.deleteItemAsync !== 'function'
    ) {
      return null;
    }

    if (typeof secureStore.isAvailableAsync === 'function') {
      const isAvailable = await secureStore.isAvailableAsync();
      if (!isAvailable) {
        return null;
      }
    }

    return secureStore;
  } catch {
    return null;
  }
};

const getSecureStore = async (): Promise<SecureStoreLike | null> => {
  if (!secureStorePromise) {
    secureStorePromise = resolveSecureStore();
  }
  return secureStorePromise;
};

export const saveAuthSession = async <T>(session: T | null, ttlMs = AUTH_SESSION_TTL_MS) => {
  const secureStore = await getSecureStore();

  if (!session) {
    if (secureStore) {
      await secureStore.deleteItemAsync(SECURE_SESSION_STORAGE_KEY);
    }
    await clearCache(FALLBACK_SESSION_STORAGE_KEY);
    return;
  }

  const envelope = buildEnvelope(session, ttlMs);

  if (secureStore) {
    const options =
      secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY !== undefined
        ? {
            keychainAccessible:
              secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
          }
        : undefined;

    await secureStore.setItemAsync(
      SECURE_SESSION_STORAGE_KEY,
      JSON.stringify(envelope),
      options,
    );
    await clearCache(FALLBACK_SESSION_STORAGE_KEY);
    return;
  }

  await setCache(FALLBACK_SESSION_STORAGE_KEY, session, { ttlMs });
};

export const loadAuthSession = async <T>(ttlMs = AUTH_SESSION_TTL_MS) => {
  const secureStore = await getSecureStore();

  if (secureStore) {
    const raw = await secureStore.getItemAsync(SECURE_SESSION_STORAGE_KEY);
    const envelope = safeParseEnvelope<T>(raw);
    if (envelope && envelope.expiresAt > Date.now()) {
      return envelope.value;
    }

    if (raw) {
      await secureStore.deleteItemAsync(SECURE_SESSION_STORAGE_KEY);
    }
  }

  const fallbackSession = await getCacheValue<T>(FALLBACK_SESSION_STORAGE_KEY);
  if (fallbackSession && secureStore) {
    await saveAuthSession(fallbackSession, ttlMs);
  }

  return fallbackSession;
};
