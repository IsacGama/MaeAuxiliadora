import type { ExpoConfig } from 'expo/config';

const parseHosts = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const appLinkHosts = parseHosts(process.env.EXPO_PUBLIC_APP_LINK_HOSTS);
const associatedDomains = appLinkHosts.map((host) => `applinks:${host}`);
const intentFilters =
  appLinkHosts.length > 0
    ? [
        {
          action: 'VIEW',
          autoVerify: true,
          data: appLinkHosts.flatMap((host) => [
            { scheme: 'https', host, pathPrefix: '/redefinir-senha' },
            { scheme: 'https', host, pathPrefix: '/ativar-conta' },
          ]),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ]
    : undefined;

const config: ExpoConfig = {
  name: 'EclesialHub',
  slug: 'paroquia-digital',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon-generic.png',
  scheme: 'eclesialhub',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-generic.png',
    resizeMode: 'contain',
    backgroundColor: '#1E293B',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.eclesialhub.app',
    associatedDomains,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon-generic.png',
      backgroundColor: '#1E293B',
    },
    package: 'com.eclesialhub.app',
    intentFilters,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon-generic.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        color: '#1E293B',
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'c03af6e5-b01f-41ae-9a44-b2ce902d13ca',
    },
    appLinkHosts,
  },
};

export default config;
