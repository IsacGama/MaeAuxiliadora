import { appConfig } from './config';
import { fetchJson, HttpError } from './http';
import {
  AuthResponse,
  ChapelPublic,
  DiocesePublic,
  LiturgyPayload,
  MemberDashboard,
  OrgBranding,
  ParishPublic,
  PublicPost,
  ResolvedOrgEntity,
  SaintOfDayPayload,
} from './types';

const api = (path: string) => `${appConfig.apiUrl}${path}`;

const resolveEntityFromDomain = async (domain: string): Promise<ResolvedOrgEntity> => {
  const normalized = encodeURIComponent(domain.trim());

  const tryChapel = async () => {
    const chapel = await fetchJson<ChapelPublic>(api(`/public/chapel/by-domain/${normalized}`));
    if (!chapel.orgUnit?.id) {
      throw new HttpError(500, 'Capela sem orgUnit vinculada', chapel);
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
  };

  const tryParish = async () => {
    const parish = await fetchJson<ParishPublic>(api(`/public/parish/by-domain/${normalized}`));
    if (!parish.orgUnit?.id) {
      throw new HttpError(500, 'Paróquia sem orgUnit vinculada', parish);
    }

    return {
      type: 'PARISH' as const,
      id: parish.id,
      name: parish.name,
      customDomain: parish.customDomain,
      orgUnitId: parish.orgUnit.id,
      raw: parish,
    };
  };

  const tryDiocese = async () => {
    const diocese = await fetchJson<DiocesePublic>(api(`/public/diocese/by-domain/${normalized}`));
    if (!diocese.orgUnit?.id) {
      throw new HttpError(500, 'Diocese sem orgUnit vinculada', diocese);
    }

    return {
      type: 'DIOCESE' as const,
      id: diocese.id,
      name: diocese.name,
      customDomain: diocese.customDomain,
      orgUnitId: diocese.orgUnit.id,
      raw: diocese,
    };
  };

  for (const resolver of [tryChapel, tryParish, tryDiocese]) {
    try {
      return await resolver();
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        continue;
      }
      throw error;
    }
  }

  throw new HttpError(404, 'Nenhuma unidade encontrada para o domínio informado', null);
};

export const publicApi = {
  resolveEntityFromDomain,
  fetchPublicParishes: (dioceseId?: string) =>
    fetchJson<ParishPublic[]>(
      api(`/public/parishes${dioceseId ? `?dioceseId=${encodeURIComponent(dioceseId)}` : ''}`),
    ),
  fetchPublicChapels: (parishId: string) =>
    fetchJson<ChapelPublic[]>(
      api(`/public/chapels?parishId=${encodeURIComponent(parishId)}`),
    ),
  fetchParishById: (parishId: string) =>
    fetchJson<ParishPublic | null>(api(`/public/parish/${encodeURIComponent(parishId)}`)),
  fetchChapelById: (chapelId: string) =>
    fetchJson<ChapelPublic | null>(api(`/public/chapel/${encodeURIComponent(chapelId)}`)),
  fetchBranding: (orgUnitId: string) =>
    fetchJson<OrgBranding | null>(api(`/public/branding/${encodeURIComponent(orgUnitId)}`)),
  fetchPublicPosts: (parishId?: string) =>
    fetchJson<PublicPost[]>(
      api(`/public/posts${parishId ? `?parishId=${encodeURIComponent(parishId)}` : ''}`),
    ),
  fetchDailyLiturgy: (date: string) =>
    fetchJson<LiturgyPayload>(`${appConfig.liturgyApiUrl}/?date=${encodeURIComponent(date)}`),
  fetchSaintOfDay: () => fetchJson<SaintOfDayPayload>(appConfig.saintApiUrl),
};

export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    parishId: string;
    chapelId?: string;
  }) =>
    fetchJson<AuthResponse>(api('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  login: (email: string, password: string) =>
    fetchJson<AuthResponse>(api('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  refresh: (refreshToken: string) =>
    fetchJson<AuthResponse>(api('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }),
  dashboard: (accessToken: string) =>
    fetchJson<MemberDashboard>(api('/member/dashboard'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  enrollTither: (accessToken: string) =>
    fetchJson(api('/member/enroll-tither'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  unenrollTither: (accessToken: string) =>
    fetchJson(api('/member/unenroll-tither'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
