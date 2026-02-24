import { appConfig } from './config';

export const getMediaUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${appConfig.apiUrl}${url}`;
  }

  return `${appConfig.apiUrl}/${url}`;
};
