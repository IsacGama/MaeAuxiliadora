import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDayKey } from '../date';
import { HttpError } from '../http';
import { getCacheEnvelope, getDailyCacheValue, setCache } from '../storage';
import { OrgBranding, OrgEntityType, ResolvedOrgEntity } from '../types';
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

const resolveDomainFromTree = async (orgUnitId: string) => {
  const tree = await publicApi.fetchPublicCommunitiesTree();
  for (const diocese of tree.dioceses) {
    if (diocese.orgUnitId === orgUnitId) {
      return { type: 'DIOCESE' as const, id: diocese.id, name: diocese.name, customDomain: diocese.customDomain };
    }
    for (const parish of diocese.parishes) {
      if (parish.orgUnitId === orgUnitId) {
        return { type: 'PARISH' as const, id: parish.id, name: parish.name, customDomain: parish.customDomain };
      }
      for (const chapel of parish.chapels) {
        if (chapel.orgUnitId === orgUnitId) {
          return { type: 'CHAPEL' as const, id: chapel.id, name: chapel.name, customDomain: chapel.customDomain };
        }
      }
    }
  }
  for (const parish of tree.standaloneParishes) {
    if (parish.orgUnitId === orgUnitId) {
      return { type: 'PARISH' as const, id: parish.id, name: parish.name, customDomain: parish.customDomain };
    }
    for (const chapel of parish.chapels) {
      if (chapel.orgUnitId === orgUnitId) {
        return { type: 'CHAPEL' as const, id: chapel.id, name: chapel.name, customDomain: chapel.customDomain };
      }
    }
  }
  for (const chapel of tree.standaloneChapels) {
    if (chapel.orgUnitId === orgUnitId) {
      return { type: 'CHAPEL' as const, id: chapel.id, name: chapel.name, customDomain: chapel.customDomain };
    }
  }
  return null;
};

export const useOrgContext = () => {
  const { session, isAuthenticated } = useAuth();

  const selectedLink = useMemo(() => {
    const links = session?.user?.personOrgLinks ?? [];
    return links.length ? links[0] : null;
  }, [session?.user?.personOrgLinks]);

  const targetKey = useMemo(() => {
    if (isAuthenticated && session?.user?.id && selectedLink?.orgId) {
      return `user:${session.user.id}:org:${selectedLink.orgId}`;
    }
    return null;
  }, [isAuthenticated, selectedLink?.orgId, session?.user?.id]);

  const [state, setState] = useState<OrgContextState>({
    entity: null,
    branding: null,
    isLoading: true,
    isRefreshing: false,
    error: null,
    source: null,
  });

  const resolveEntity = useCallback(async () => {
    if (isAuthenticated && selectedLink?.orgId) {
      const treeMatch = await resolveDomainFromTree(selectedLink.orgId).catch(() => null);
      const orgUnitType = selectedLink.orgUnitType;
      const fallbackEntityType: OrgEntityType =
        orgUnitType === 'CHAPEL' || orgUnitType === 'DIOCESE' || orgUnitType === 'PARISH'
          ? orgUnitType
          : 'PARISH';
      const entityType: OrgEntityType = treeMatch?.type ?? fallbackEntityType;
      return {
        type: entityType,
        id: treeMatch?.id ?? selectedLink.orgId,
        name: treeMatch?.name ?? selectedLink.orgName ?? 'Comunidade',
        customDomain: treeMatch?.customDomain ?? null,
        orgUnitId: selectedLink.orgId,
        raw: {
          id: treeMatch?.id ?? selectedLink.orgId,
          name: treeMatch?.name ?? selectedLink.orgName ?? 'Comunidade',
          customDomain: treeMatch?.customDomain ?? null,
          orgUnit: { id: selectedLink.orgId },
        },
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
  }, [isAuthenticated, selectedLink?.orgId, selectedLink?.orgName, selectedLink?.orgUnitType]);

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

  const refresh = useCallback(() => load(true), [load]);

  return useMemo(
    () => ({
      ...state,
      domain: '',
      refresh,
      displayName: state.branding?.displayName ?? state.entity?.name ?? 'Comunidade',
    }),
    [refresh, state],
  );
};
