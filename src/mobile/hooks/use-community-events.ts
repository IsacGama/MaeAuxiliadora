import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, publicApi } from '../api';
import { useAuth } from '../auth-context';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { CommunityEvent, EventRsvpStatus, MemberEventRsvp } from '../types';

type EventsState = {
  events: CommunityEvent[];
  myRsvpByEventId: Record<string, MemberEventRsvp>;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmittingRsvp: boolean;
  lastSubmittingEventId: string | null;
  error: string | null;
  source: 'network' | 'cache' | null;
};

type CachedEventsPayload = {
  events: CommunityEvent[];
  myRsvpByEventId: Record<string, MemberEventRsvp>;
};

const cacheKeyForParish = (parishId: string) =>
  `spd-mobile:community-events:${parishId}`;

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

const normalizeCache = (
  value: CachedEventsPayload | CommunityEvent[] | null | undefined,
): CachedEventsPayload | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return {
      events: value,
      myRsvpByEventId: {},
    };
  }

  if (!Array.isArray(value.events) || typeof value.myRsvpByEventId !== 'object') {
    return null;
  }

  return {
    events: value.events,
    myRsvpByEventId: value.myRsvpByEventId ?? {},
  };
};

export const useCommunityEvents = (parishId?: string | null) => {
  const { isAuthenticated, requestWithAuth } = useAuth();
  const [state, setState] = useState<EventsState>({
    events: [],
    myRsvpByEventId: {},
    isLoading: false,
    isRefreshing: false,
    isSubmittingRsvp: false,
    lastSubmittingEventId: null,
    error: null,
    source: null,
  });

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!parishId) {
        setState((prev) => ({
          ...prev,
          events: [],
          myRsvpByEventId: {},
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: null,
        }));
        return;
      }

      const cacheKey = cacheKeyForParish(parishId);
      const dayKey = getDayKey();

      if (forceNetwork) {
        setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      let hasAnyCache = false;

      if (!forceNetwork) {
        const daily = normalizeCache(
          await getDailyCacheValue<CachedEventsPayload | CommunityEvent[]>(
            cacheKey,
            dayKey,
          ),
        );
        if (daily) {
          hasAnyCache = true;
          setState((prev) => ({
            ...prev,
            events: daily.events,
            myRsvpByEventId: daily.myRsvpByEventId,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          }));
          return;
        }

        const stale = normalizeCache(
          (await getCacheEnvelope<CachedEventsPayload | CommunityEvent[]>(cacheKey))
            ?.value,
        );
        if (stale) {
          hasAnyCache = true;
          setState((prev) => ({
            ...prev,
            events: stale.events,
            myRsvpByEventId: stale.myRsvpByEventId,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          }));
        }
      }

      try {
        const events = await publicApi.fetchPublicEvents({
          parishId,
          take: 80,
        });

        let myRsvpByEventId: Record<string, MemberEventRsvp> = {};
        if (isAuthenticated) {
          const myRsvps = await requestWithAuth((token) =>
            authApi.memberEventRsvps(token, parishId),
          );
          myRsvpByEventId = myRsvps.reduce<Record<string, MemberEventRsvp>>(
            (acc, item) => {
              acc[item.eventId] = item;
              return acc;
            },
            {},
          );
        }

        const payload: CachedEventsPayload = {
          events,
          myRsvpByEventId,
        };
        await setCache(cacheKey, payload, { dayKey });

        setState((prev) => ({
          ...prev,
          events: payload.events,
          myRsvpByEventId: payload.myRsvpByEventId,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'network',
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: hasAnyCache
            ? null
            : getMessage(error, 'Não foi possível carregar os eventos.'),
        }));
      }
    },
    [isAuthenticated, parishId, requestWithAuth],
  );

  const submitRsvp = useCallback(
    async (
      eventId: string,
      payload: { status: EventRsvpStatus; guests?: number; notes?: string },
    ) => {
      if (!parishId || !isAuthenticated) {
        throw new HttpError(401, 'Faça login para confirmar presença.', null);
      }

      setState((prev) => ({
        ...prev,
        isSubmittingRsvp: true,
        lastSubmittingEventId: eventId,
      }));

      try {
        await requestWithAuth((token) => authApi.rsvpEvent(token, eventId, payload));
        await load(true);
      } finally {
        setState((prev) => ({
          ...prev,
          isSubmittingRsvp: false,
          lastSubmittingEventId: null,
        }));
      }
    },
    [isAuthenticated, load, parishId, requestWithAuth],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => load(true),
      submitRsvp,
    }),
    [load, state, submitRsvp],
  );
};
