import { publicApi } from './api';
import { getDayKey, parseBrazilianDateToDayKey } from './date';
import { getDailyCacheValue, setCache } from './storage';

const SAINT_CACHE_KEY = 'spd-mobile:saint-of-day';
const LITURGY_CACHE_KEY = 'spd-mobile:liturgy:daily';

const prefetchSaintOfDay = async (): Promise<void> => {
  const today = getDayKey();
  const cached = await getDailyCacheValue(SAINT_CACHE_KEY, today);
  if (cached !== null) return;

  const now = new Date();
  const saint = await publicApi.fetchSaintOfDay(now.getDate(), now.getMonth() + 1);
  await setCache(SAINT_CACHE_KEY, saint, { dayKey: today });
};

const prefetchDailyLiturgy = async (): Promise<void> => {
  const today = getDayKey();
  const cached = await getDailyCacheValue(LITURGY_CACHE_KEY, today);
  if (cached !== null) return;

  const liturgy = await publicApi.fetchDailyLiturgy(today);
  const payloadDayKey = parseBrazilianDateToDayKey(liturgy.data) ?? today;
  await setCache(LITURGY_CACHE_KEY, liturgy, { dayKey: payloadDayKey });
};

export const prefetchTodayData = (): void => {
  void Promise.allSettled([prefetchSaintOfDay(), prefetchDailyLiturgy()]);
};
