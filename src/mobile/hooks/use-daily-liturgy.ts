import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey, normalizeDayKey, parseBrazilianDateToDayKey, shiftDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { LiturgyPayload } from '../types';

type LiturgyState = {
  liturgy: LiturgyPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
  isToday: boolean;
};

type LiturgyDateMismatch = {
  requestedDate: string;
  payloadDate: string;
};

const LITURGY_CACHE_KEY = 'spd-mobile:liturgy:daily';

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    if (error.status === 0 || error.status === 408) {
      return 'Sem conexão no momento. Tentaremos novamente.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export const useDailyLiturgy = () => {
  const [selectedDate, setSelectedDate] = useState(() => getDayKey());
  const [dateMismatch, setDateMismatch] = useState<LiturgyDateMismatch | null>(null);
  const [state, setState] = useState<LiturgyState>({
    liturgy: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
    isToday: false,
  });

  const load = useCallback(async (dayKey: string, forceNetwork = false) => {
    const normalizedDayKey = normalizeDayKey(dayKey);
    const isToday = normalizedDayKey === getDayKey();

    if (forceNetwork) {
      setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
    } else {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    let hasAnyCache = false;

    if (!forceNetwork) {
      const daily = await getDailyCacheValue<LiturgyPayload>(LITURGY_CACHE_KEY, normalizedDayKey);
      if (daily) {
        hasAnyCache = true;
        setState({
          liturgy: daily,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday,
        });
        return;
      }

      const stale = await getCacheEnvelope<LiturgyPayload>(LITURGY_CACHE_KEY);
      if (stale?.value && stale.dayKey === normalizedDayKey) {
        hasAnyCache = true;
        setState({
          liturgy: stale.value,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'cache',
          isToday,
        });
      }
    }

    try {
      const liturgy = await publicApi.fetchDailyLiturgy(normalizedDayKey);
      const payloadDayKey = parseBrazilianDateToDayKey(liturgy.data) ?? normalizedDayKey;
      const hasDateMismatch = payloadDayKey !== normalizedDayKey;
      const resolvedIsToday = payloadDayKey === getDayKey();

      await setCache(LITURGY_CACHE_KEY, liturgy, { dayKey: payloadDayKey });
      setState({
        liturgy,
        isLoading: false,
        isRefreshing: false,
        error: null,
        source: 'network',
        isToday: resolvedIsToday,
      });

      if (hasDateMismatch) {
        setDateMismatch({
          requestedDate: normalizedDayKey,
          payloadDate: payloadDayKey,
        });
        setSelectedDate(payloadDayKey);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar a liturgia diária.'),
      }));
    }
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  const goToPreviousDate = useCallback(() => {
    setSelectedDate((prev) => shiftDayKey(prev, -1));
  }, []);

  const goToNextDate = useCallback(() => {
    setSelectedDate((prev) => shiftDayKey(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(getDayKey());
  }, []);

  const setDate = useCallback((dayKey: string) => {
    setSelectedDate(normalizeDayKey(dayKey));
  }, []);

  const clearDateMismatch = useCallback(() => {
    setDateMismatch(null);
  }, []);

  return useMemo(
    () => ({
      ...state,
      selectedDate,
      dateMismatch,
      refresh: () => load(selectedDate, true),
      goToPreviousDate,
      goToNextDate,
      goToToday,
      setDate,
      clearDateMismatch,
    }),
    [
      clearDateMismatch,
      dateMismatch,
      goToNextDate,
      goToPreviousDate,
      goToToday,
      load,
      selectedDate,
      setDate,
      state,
    ],
  );
};
