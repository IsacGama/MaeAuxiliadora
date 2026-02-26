import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { authApi } from './api';
import { HttpError } from './http';
import { clearCache, getCacheValue, setCache } from './storage';

type ExpoNotificationsModule = typeof import('expo-notifications');
type NotificationResponseListener = (response: NotificationResponse) => void;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';
const PUSH_TOKEN_CACHE_KEY = 'spd-mobile:push-token';
const PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY =
  'spd-mobile:push-token-pending-unregister';
const PUSH_TOKEN_TTL_MS = 3650 * 24 * 60 * 60 * 1000; // 10 anos

let notificationsModulePromise: Promise<ExpoNotificationsModule> | null = null;
let notificationHandlerConfigured = false;

const loadNotificationsModule = async (): Promise<ExpoNotificationsModule> => {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }
  return notificationsModulePromise;
};

const resolveProjectId = () => {
  const fromExpoConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const fromEasConfig = Constants.easConfig?.projectId;
  return fromExpoConfig || fromEasConfig || undefined;
};

const resolvePlatform = (): 'ANDROID' | 'IOS' =>
  Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

export const isPushRegistrationSupported = () =>
  !isExpoGo && Device.isDevice;

export type PushRegistrationResult =
  | {
      status: 'registered';
      token: string;
    }
  | {
      status: 'skipped';
      reason:
        | 'expo-go'
        | 'not-a-physical-device'
        | 'permission-not-granted'
        | 'missing-project-id';
    }
  | {
      status: 'failed';
      reason: 'token-unavailable' | 'backend-register-failed' | 'unexpected-error';
      message?: string;
    };

export async function configureNotificationHandling() {
  if (isExpoGo || notificationHandlerConfigured) {
    return;
  }

  const Notifications = await loadNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

export async function registerForPushNotifications(accessToken: string) {
  await flushPendingPushTokenUnregister(accessToken);

  if (isExpoGo) {
    return {
      status: 'skipped',
      reason: 'expo-go',
    } satisfies PushRegistrationResult;
  }

  if (!Device.isDevice) {
    return {
      status: 'skipped',
      reason: 'not-a-physical-device',
    } satisfies PushRegistrationResult;
  }

  const Notifications = await loadNotificationsModule();
  await configureNotificationHandling();

  const currentPermission = await Notifications.getPermissionsAsync();
  let permission = currentPermission.status;

  if (permission !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    permission = requested.status;
  }

  if (permission !== 'granted') {
    return {
      status: 'skipped',
      reason: 'permission-not-granted',
    } satisfies PushRegistrationResult;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E293B',
      sound: 'default',
    });
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    return {
      status: 'skipped',
      reason: 'missing-project-id',
    } satisfies PushRegistrationResult;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    if (!token) {
      return {
        status: 'failed',
        reason: 'token-unavailable',
      } satisfies PushRegistrationResult;
    }

    await authApi.registerDevice(accessToken, {
      token,
      platform: resolvePlatform(),
    });
    await setCache(PUSH_TOKEN_CACHE_KEY, token, { ttlMs: PUSH_TOKEN_TTL_MS });

    return {
      status: 'registered',
      token,
    } satisfies PushRegistrationResult;
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: 'failed',
        reason: 'backend-register-failed',
        message: `HTTP ${error.status}: ${error.message}`,
      } satisfies PushRegistrationResult;
    }

    return {
      status: 'failed',
      reason: 'unexpected-error',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    } satisfies PushRegistrationResult;
  }
}

export async function unregisterPushNotifications(
  accessToken: string,
  token: string,
) {
  if (!token) {
    return;
  }
  await authApi.unregisterDevice(accessToken, token);
  await clearCache(PUSH_TOKEN_CACHE_KEY);
}

export const getRegisteredPushToken = () =>
  getCacheValue<string>(PUSH_TOKEN_CACHE_KEY);

export const clearRegisteredPushToken = () =>
  clearCache(PUSH_TOKEN_CACHE_KEY);

export const queuePushTokenForUnregister = async (token: string) => {
  const normalized = token.trim();
  if (!normalized) {
    return;
  }

  const currentPending =
    (await getCacheValue<string[]>(PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY)) ??
    [];

  if (currentPending.includes(normalized)) {
    return;
  }

  await setCache(
    PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY,
    [...currentPending, normalized],
    { ttlMs: PUSH_TOKEN_TTL_MS },
  );
};

export const flushPendingPushTokenUnregister = async (accessToken: string) => {
  const pendingTokens =
    (await getCacheValue<string[]>(PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY)) ??
    [];

  if (!pendingTokens.length) {
    return;
  }

  const stillPending: string[] = [];

  for (const token of pendingTokens) {
    try {
      await authApi.unregisterDevice(accessToken, token);
    } catch {
      stillPending.push(token);
    }
  }

  if (stillPending.length) {
    await setCache(PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY, stillPending, {
      ttlMs: PUSH_TOKEN_TTL_MS,
    });
    return;
  }

  await clearCache(PUSH_TOKEN_PENDING_UNREGISTER_CACHE_KEY);
};

export async function addNotificationResponseListener(
  listener: NotificationResponseListener,
) {
  if (isExpoGo) {
    return () => {};
  }

  const Notifications = await loadNotificationsModule();
  const subscription = Notifications.addNotificationResponseReceivedListener(
    listener,
  );

  return () => {
    subscription.remove();
  };
}

export async function getLastNotificationResponse() {
  if (isExpoGo) {
    return null;
  }

  const Notifications = await loadNotificationsModule();
  return Notifications.getLastNotificationResponseAsync();
}
