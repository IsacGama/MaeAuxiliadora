import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { publicApi } from '../api';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { PublicPost } from '../types';

const PUBLIC_POSTS_PAGE_SIZE = 12;

type PostsState = {
  posts: PublicPost[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  totalPages: number;
  error: string | null;
  source: 'network' | 'cache' | null;
};

type CachedPostsPayload = {
  posts: PublicPost[];
  hasMore: boolean;
  page: number;
  totalPages: number;
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

const normalizeCachedPayload = (
  value: CachedPostsPayload | PublicPost[] | null | undefined,
): CachedPostsPayload | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    return {
      posts: value,
      hasMore: false,
      page: 1,
      totalPages: 1,
    };
  }

  if (!Array.isArray(value.posts)) {
    return null;
  }

  const page = Number.isFinite(value.page) && value.page > 0 ? value.page : 1;
  const totalPages =
    Number.isFinite(value.totalPages) && value.totalPages > 0
      ? value.totalPages
      : 1;

  return {
    posts: value.posts,
    hasMore: Boolean(value.hasMore) && page < totalPages,
    page,
    totalPages,
  };
};

export const usePublicPosts = (parishId?: string | null) => {
  const [state, setState] = useState<PostsState>({
    posts: [],
    isLoading: true,
    isRefreshing: false,
    isLoadingMore: false,
    hasMore: false,
    page: 1,
    totalPages: 1,
    error: null,
    source: null,
  });
  const stateRef = useRef(state);

  const persistCache = useCallback(
    async (value: CachedPostsPayload) => {
      if (!parishId) return;
      await setCache(cacheKeyForParish(parishId), value, { dayKey: getDayKey() });
    },
    [parishId],
  );

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!parishId) {
        setState({
          posts: [],
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          hasMore: false,
          page: 1,
          totalPages: 1,
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
        setState((prev) => ({ ...prev, isLoading: true, isLoadingMore: false, error: null }));
      }

      let hasAnyCache = false;

      if (!forceNetwork) {
        const daily = normalizeCachedPayload(
          await getDailyCacheValue<CachedPostsPayload | PublicPost[]>(cacheKey, dayKey),
        );
        if (daily) {
          hasAnyCache = true;
          setState({
            posts: daily.posts,
            isLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            hasMore: daily.hasMore,
            page: daily.page,
            totalPages: daily.totalPages,
            error: null,
            source: 'cache',
          });
          return;
        }

        const stale = normalizeCachedPayload(
          (await getCacheEnvelope<CachedPostsPayload | PublicPost[]>(cacheKey))?.value,
        );
        if (stale) {
          hasAnyCache = true;
          setState({
            posts: stale.posts,
            isLoading: false,
            isRefreshing: false,
            isLoadingMore: false,
            hasMore: stale.hasMore,
            page: stale.page,
            totalPages: stale.totalPages,
            error: null,
            source: 'cache',
          });
        }
      }

      try {
        const response = await publicApi.fetchPublicPostsPaginated({
          parishId,
          page: 1,
          pageSize: PUBLIC_POSTS_PAGE_SIZE,
        });
        const payload: CachedPostsPayload = {
          posts: response.items,
          hasMore: response.page < response.totalPages,
          page: response.page,
          totalPages: response.totalPages,
        };
        await persistCache(payload);
        setState({
          posts: payload.posts,
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          hasMore: payload.hasMore,
          page: payload.page,
          totalPages: payload.totalPages,
          error: null,
          source: 'network',
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          isLoadingMore: false,
          error: hasAnyCache ? null : getMessage(error, 'Não foi possível carregar as notícias.'),
        }));
      }
    },
    [parishId, persistCache],
  );

  const loadMore = useCallback(async () => {
    if (!parishId) return;

    const snapshot = stateRef.current;
    if (
      snapshot.isLoading ||
      snapshot.isRefreshing ||
      snapshot.isLoadingMore ||
      !snapshot.hasMore
    ) {
      return;
    }

    setState((prev) => ({ ...prev, isLoadingMore: true, error: null }));

    try {
      const nextPage = snapshot.page + 1;
      const response = await publicApi.fetchPublicPostsPaginated({
        parishId,
        page: nextPage,
        pageSize: PUBLIC_POSTS_PAGE_SIZE,
      });
      const currentPosts = stateRef.current.posts;
      const knownIds = new Set(currentPosts.map((post) => post.id));
      const appended = response.items.filter((item) => !knownIds.has(item.id));
      const mergedPosts = [...currentPosts, ...appended];
      const payload: CachedPostsPayload = {
        posts: mergedPosts,
        hasMore: response.page < response.totalPages,
        page: response.page,
        totalPages: response.totalPages,
      };
      await persistCache(payload);

      setState((prev) => ({
        ...prev,
        posts: mergedPosts,
        hasMore: payload.hasMore,
        page: payload.page,
        totalPages: payload.totalPages,
        isLoadingMore: false,
        error: null,
        source: 'network',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoadingMore: false,
        error: getMessage(error, 'Não foi possível carregar mais notícias.'),
      }));
    }
  }, [parishId, persistCache]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  return useMemo(
    () => ({
      ...state,
      refresh: () => load(true),
      loadMore,
    }),
    [load, loadMore, state],
  );
};
