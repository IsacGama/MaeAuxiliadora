import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { PublicPost } from '../types';

type PostsState = {
  posts: PublicPost[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
};

const cacheKeyForParish = (parishId: string) => `spd-mobile:public-posts:${parishId}`;

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

export const usePublicPosts = (parishId?: string | null) => {
  const [state, setState] = useState<PostsState>({
    posts: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
  });

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!parishId) {
        setState({
          posts: [],
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: null,
        });
        return;
      }

      const dayKey = getDayKey();
      const cacheKey = cacheKeyForParish(parishId);

      if (forceNetwork) {
        setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      let hasAnyCache = false;

      if (!forceNetwork) {
        const daily = await getDailyCacheValue<PublicPost[]>(cacheKey, dayKey);
        if (daily) {
          hasAnyCache = true;
          setState({
            posts: daily,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
          return;
        }

        const stale = await getCacheEnvelope<PublicPost[]>(cacheKey);
        if (stale?.value) {
          hasAnyCache = true;
          setState({
            posts: stale.value,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
        }
      }

      try {
        const posts = await publicApi.fetchPublicPosts(parishId);
        await setCache(cacheKey, posts, { dayKey });
        setState({
          posts,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: 'network',
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar as notícias.'),
        }));
      }
    },
    [parishId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => load(true),
    }),
    [load, state],
  );
};

