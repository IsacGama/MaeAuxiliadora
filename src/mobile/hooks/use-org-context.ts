import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { OrgBranding, ResolvedOrgEntity } from '../types';
import { publicApi } from '../api';
import { useAuth } from '../auth-context';

type CachedOrgContext = {
  entity: ResolvedOrgEntity;
  branding: OrgBranding | null;
};

type OrgContextState = {
  entity: ResolvedOrgEntity | null;
  branding: OrgBranding | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
};

const cacheKeyForTarget = (target: string) => `spd-mobile:org-context:${target.toLowerCase()}`;

const getMessage = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    if (error.status === 0 || error.status === 408) {
      return 'Sem conexão no momento. Tentaremos novamente automaticamente.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export const useOrgContext = () => {
  const { session, isAuthenticated } = useAuth();

  const selectedLink = useMemo(() => {
    const links = session?.user?.personParishLinks ?? [];
    if (!links.length) return null;
    return links.find((link) => Boolean(link.chapelId)) ?? links[0];
  }, [session?.user?.personParishLinks]);

  const targetKey = useMemo(() => {
    if (isAuthenticated && session?.user?.id && selectedLink?.parishId) {
      return `user:${session.user.id}:parish:${selectedLink.parishId}:chapel:${selectedLink.chapelId ?? 'none'}`;
    }
    return null;
  }, [isAuthenticated, selectedLink?.chapelId, selectedLink?.parishId, session?.user?.id]);

  const [state, setState] = useState<OrgContextState>({
    entity: null,
    branding: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
  });

  const resolveEntity = useCallback(async () => {
    if (isAuthenticated && selectedLink?.parishId) {
      if (selectedLink.chapelId) {
        const chapel = await publicApi.fetchChapelById(selectedLink.chapelId);
        if (!chapel?.orgUnit?.id) {
          throw new HttpError(404, 'Capela vinculada não encontrada.', null);
        }
        return {
          type: 'CHAPEL' as const,
          id: chapel.id,
          name: chapel.name,
          customDomain: chapel.customDomain,
          parishId: chapel.parishId,
          orgUnitId: chapel.orgUnit.id,
          raw: chapel,
        };
      }

      const parish = await publicApi.fetchParishById(selectedLink.parishId);
      if (!parish?.orgUnit?.id) {
        throw new HttpError(404, 'Paróquia vinculada não encontrada.', null);
      }
      return {
        type: 'PARISH' as const,
        id: parish.id,
        name: parish.name,
        customDomain: parish.customDomain,
        orgUnitId: parish.orgUnit.id,
        raw: parish,
      };
    }

    if (isAuthenticated) {
      throw new HttpError(
        400,
        'Sua conta ainda não está vinculada a uma paróquia/capela. Procure a secretaria da comunidade.',
        null,
      );
    }

    return null;
  }, [isAuthenticated, selectedLink?.chapelId, selectedLink?.parishId]);

  const load = useCallback(
    async (forceNetwork = false) => {
      if (!targetKey) {
        setState({
          entity: null,
          branding: null,
          isLoading: false,
          isRefreshing: false,
          error: null,
          source: null,
        });
        return;
      }

      const cacheKey = cacheKeyForTarget(targetKey);
      const todayKey = getDayKey();

      if (forceNetwork) {
        setState((prev) => ({ ...prev, isRefreshing: true, error: null }));
      } else {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      let hadCache = false;

      if (!forceNetwork) {
        const dailyCache = await getDailyCacheValue<CachedOrgContext>(cacheKey, todayKey);
        if (dailyCache) {
          hadCache = true;
          setState({
            entity: dailyCache.entity,
            branding: dailyCache.branding,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
          return;
        }

        const envelope = await getCacheEnvelope<CachedOrgContext>(cacheKey);
        if (envelope?.value) {
          hadCache = true;
          setState({
            entity: envelope.value.entity,
            branding: envelope.value.branding,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: 'cache',
          });
        }
      }

      try {
        const entity = await resolveEntity();
        if (!entity) {
          setState({
            entity: null,
            branding: null,
            isLoading: false,
            isRefreshing: false,
            error: null,
            source: null,
          });
          return;
        }
        const branding = await publicApi.fetchBranding(entity.orgUnitId);
        const payload: CachedOrgContext = { entity, branding };

        await setCache(cacheKey, payload, { dayKey: todayKey });

        setState({
          entity,
          branding,
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
          error: hadCache ? null : getMessage(error, 'Não foi possível carregar os dados da comunidade.'),
        }));
      }
    },
    [resolveEntity, targetKey],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({
      ...state,
      domain: '',
      refresh: () => load(true),
      displayName: state.branding?.displayName ?? state.entity?.name ?? 'Comunidade',
    }),
    [load, state],
  );
};
