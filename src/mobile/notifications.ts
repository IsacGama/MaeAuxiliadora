import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NotificationResponse } from 'expo-notifications';
import { authApi } from './api';

type ExpoNotificationsModule = typeof import('expo-notifications');
type NotificationResponseListener = (response: NotificationResponse) => void;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

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
  if (!isPushRegistrationSupported()) {
    return null;
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
    return null;
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
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;

  if (!token) {
    return null;
  }

  await authApi.registerDevice(accessToken, {
    token,
    platform: resolvePlatform(),
  });

  return token;
}

export async function unregisterPushNotifications(
  accessToken: string,
  token: string,
) {
  if (!token) {
    return;
  }
  await authApi.unregisterDevice(accessToken, token);
}

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
