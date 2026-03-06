import { appConfig } from './config';
import { fetchJson, HttpError } from './http';
import {
  AuthResponse,
  AuthQueuedActionResponse,
  ChapelPublic,
  CommunityEvent,
  DevicePlatform,
  DiocesePublic,
  EventRsvpStatus,
  LiturgyPayload,
  MemberEventCheckInResponse,
  MemberEventRsvp,
  MemberNotificationPreferences,
  MemberNotificationItem,
  MemberDashboard,
  GatewayCardCheckoutResponse,
  GatewayDonationIntent,
  GatewayPaymentStatusResponse,
  GatewayPixPaymentResponse,
  GatewayPublicProviderStatusResponse,
  OrgBranding,
  ParishPublic,
  PublicPost,
  PublicPostPaginatedResponse,
  PublicPostDetail,
  ResolvedOrgEntity,
  SaintOfDayPayload,
} from './types';

const api = (path: string) => `${appConfig.apiUrl}${path}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&#038;/gi, '&')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const normalizeImageUrl = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;

  let url = decodeHtmlEntities(value.trim()).replace(/\\\//g, '/');
  if (!url) return undefined;

  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Android costuma bloquear cleartext por padrão em release.
  if (url.startsWith('http://')) {
    url = `https://${url.slice('http://'.length)}`;
  }

  if (!/^https?:\/\//i.test(url)) {
    return undefined;
  }

  // `Image` do React Native não renderiza SVG remoto sem biblioteca extra.
  if (/\.svg(?:\?|#|$)/i.test(url)) {
    return undefined;
  }

  return url;
};

const extractFirstImageFromHtml = (html?: string): string | undefined => {
  if (!html) return undefined;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return normalizeImageUrl(match?.[1]);
};

const resolveWordPressSaintImage = (value: Record<string, unknown>) => {
  const metaRecord = isRecord(value.meta) ? value.meta : null;
  const contentRecord = isRecord(value.content) ? value.content : null;
  const excerptRecord = isRecord(value.excerpt) ? value.excerpt : null;
  const embeddedRecord = isRecord(value._embedded) ? value._embedded : null;
  const yoastRecord = isRecord(value.yoast_head_json) ? value.yoast_head_json : null;

  const embeddedFeaturedRaw = embeddedRecord?.['wp:featuredmedia'];
  const embeddedFeatured = Array.isArray(embeddedFeaturedRaw)
    ? embeddedFeaturedRaw[0]
    : null;
  const embeddedFeaturedRecord = isRecord(embeddedFeatured) ? embeddedFeatured : null;

  const yoastImagesRaw = yoastRecord?.og_image;
  const yoastImage = Array.isArray(yoastImagesRaw) ? yoastImagesRaw[0] : null;
  const yoastImageRecord = isRecord(yoastImage) ? yoastImage : null;

  const candidates: Array<unknown> = [
    value.imagem_destacada,
    metaRecord?.['imagem-sm'],
    value.jetpack_featured_media_url,
    embeddedFeaturedRecord?.source_url,
    yoastImageRecord?.url,
    extractFirstImageFromHtml(readString(contentRecord?.rendered)),
    extractFirstImageFromHtml(readString(excerptRecord?.rendered)),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate);
    if (normalized) return normalized;
  }

  return undefined;
};

const toWordPressSaint = (value: unknown): SaintOfDayPayload | null => {
  if (!isRecord(value)) return null;

  const titleRecord = isRecord(value.title) ? value.title : null;
  const contentRecord = isRecord(value.content) ? value.content : null;
  const excerptRecord = isRecord(value.excerpt) ? value.excerpt : null;
  const metaRecord = isRecord(value.meta) ? value.meta : null;

  const title = readString(titleRecord?.rendered);
  const content = readString(contentRecord?.rendered);
  const excerpt = readString(excerptRecord?.rendered);

  if (!title && !content && !excerpt) {
    return null;
  }

  const image = resolveWordPressSaintImage(value);
  const imageSm = normalizeImageUrl(metaRecord?.['imagem-sm']);

  return {
    id: typeof value.id === 'number' ? value.id : 0,
    title: { rendered: title ?? 'Santo do Dia' },
    content: { rendered: content ?? '' },
    excerpt: { rendered: excerpt ?? '' },
    meta: {
      'dia-festivo': readString(metaRecord?.['dia-festivo']),
      'imagem-sm': imageSm,
    },
    imagem_destacada: image,
    dia: readString(value.dia),
    mes: readString(value.mes),
  };
};

const toLegacySaint = (value: unknown): SaintOfDayPayload | null => {
  if (!isRecord(value)) return null;
  const today = isRecord(value.today) ? value.today : null;
  if (!today) return null;

  const title = readString(today.title);
  const fullText = readString(today.full_text);
  const image = readString(today.image);
  const day = readString(today.day);
  const month = readString(today.month);
  const year = readString(today.year);

  if (!title && !fullText) {
    return null;
  }

  const festiveDay = [day, month, year].filter(Boolean).join(' ').trim();

  return {
    id: 0,
    title: { rendered: title ?? 'Santo do Dia' },
    content: { rendered: fullText ?? '' },
    excerpt: { rendered: fullText ?? '' },
    meta: {
      'dia-festivo': festiveDay || undefined,
      'imagem-sm': normalizeImageUrl(image),
    },
    imagem_destacada: normalizeImageUrl(image),
    dia: day,
    mes: month,
  };
};

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
  fetchPublicChapels: (orgId: string) =>
    fetchJson<ChapelPublic[]>(
      api(`/public/chapels?orgId=${encodeURIComponent(orgId)}`),
    ),
  fetchBranding: (orgUnitId: string) =>
    fetchJson<OrgBranding | null>(api(`/public/branding/${encodeURIComponent(orgUnitId)}`)),
  fetchGatewayProviderStatus: (orgUnitId: string) =>
    fetchJson<GatewayPublicProviderStatusResponse>(
      api(`/public/org-units/${encodeURIComponent(orgUnitId)}/gateway-payments/provider-status`),
    ),
  createGatewayPixDonation: (
    orgUnitId: string,
    payload: {
      amount: number;
      intent?: GatewayDonationIntent;
      description?: string;
      anonymous?: boolean;
      donorName?: string;
      donorEmail?: string;
      personId?: string;
      idempotencyKey?: string;
      expiresInMinutes?: number;
    },
  ) =>
    fetchJson<GatewayPixPaymentResponse>(
      api(`/public/org-units/${encodeURIComponent(orgUnitId)}/gateway-payments/pix`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ),
  createGatewayCardCheckout: (
    orgUnitId: string,
    payload: {
      amount: number;
      intent?: GatewayDonationIntent;
      description?: string;
      anonymous?: boolean;
      donorName?: string;
      donorEmail?: string;
      personId?: string;
      idempotencyKey?: string;
    },
  ) =>
    fetchJson<GatewayCardCheckoutResponse>(
      api(`/public/org-units/${encodeURIComponent(orgUnitId)}/gateway-payments/card-checkout`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ),
  fetchGatewayPaymentStatus: (orgUnitId: string, gatewayPaymentId: string) =>
    fetchJson<GatewayPaymentStatusResponse>(
      api(
        `/public/org-units/${encodeURIComponent(orgUnitId)}/gateway-payments/${encodeURIComponent(gatewayPaymentId)}`,
      ),
    ),
  fetchPublicPosts: (orgId?: string) =>
    fetchJson<PublicPost[]>(
      api(`/public/posts${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`),
    ),
  fetchPublicPostsPaginated: (options: {
    orgId?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const query = new URLSearchParams();
    if (options.orgId) query.set('orgId', options.orgId);
    if (options.page) query.set('page', String(options.page));
    if (options.pageSize) query.set('pageSize', String(options.pageSize));

    const suffix = query.toString();
    return fetchJson<PublicPostPaginatedResponse>(
      api(`/public/posts/paginated${suffix ? `?${suffix}` : ''}`),
    );
  },
  fetchPublicEvents: (options: {
    orgId: string;
    from?: string;
    to?: string;
    take?: number;
  }) => {
    const query = new URLSearchParams();
    query.set('orgId', options.orgId);
    if (options.from) query.set('from', options.from);
    if (options.to) query.set('to', options.to);
    if (typeof options.take === 'number') query.set('take', String(options.take));

    const suffix = query.toString();
    return fetchJson<CommunityEvent[]>(api(`/public/events?${suffix}`));
  },
  fetchPublicPostBySlug: (slug: string, orgId?: string) =>
    fetchJson<PublicPostDetail>(
      api(
        `/public/posts/${encodeURIComponent(slug)}${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`,
      ),
    ),
  fetchDailyLiturgy: (date: string) =>
    fetchJson<LiturgyPayload>(`${appConfig.liturgyApiUrl}/?date=${encodeURIComponent(date)}`),
  fetchSaintOfDay: async (day: number, month: number) => {
    const response = await fetchJson<unknown>(
      `${appConfig.saintApiUrl}?dia=${encodeURIComponent(String(day))}&mes=${encodeURIComponent(String(month))}&_embed=wp:featuredmedia`,
    );

    if (Array.isArray(response)) {
      const first = response.find((item) => isRecord(item));
      const parsed = first ? toWordPressSaint(first) : null;
      if (parsed) {
        return parsed;
      }
      throw new HttpError(404, 'Nenhum santo encontrado para a data informada.', response);
    }

    const wpParsed = toWordPressSaint(response);
    if (wpParsed) {
      return wpParsed;
    }

    const legacyParsed = toLegacySaint(response);
    if (legacyParsed) {
      return legacyParsed;
    }

    throw new HttpError(502, 'Formato inesperado da API de santo do dia.', response);
  },
};

export const authApi = {
  register: (payload: {
    name: string;
    email: string;
    orgId: string;
    primaryPhone: string;
    cpf: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNDECLARED';
  }) =>
    fetchJson<AuthQueuedActionResponse>(api('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  requestAccountSetupEmail: (email: string) =>
    fetchJson<AuthQueuedActionResponse>(api('/auth/account-setup/resend'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
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
  logout: (accessToken: string) =>
    fetchJson(api('/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  changePassword: (
    accessToken: string,
    payload: { currentPassword: string; newPassword: string },
  ) =>
    fetchJson<{ message: string; user: AuthResponse['user'] }>(api('/auth/password/change'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }),
  dashboard: (accessToken: string) =>
    fetchJson<MemberDashboard>(api('/member/dashboard'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  memberNotifications: (accessToken: string) =>
    fetchJson<MemberNotificationItem[]>(api('/member/notifications'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  memberNotificationPreferences: (accessToken: string) =>
    fetchJson<MemberNotificationPreferences>(
      api('/member/notifications/preferences'),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  updateMemberNotificationPreferences: (
    accessToken: string,
    payload: { autoDeleteAfterDays: number | null },
  ) =>
    fetchJson<MemberNotificationPreferences>(
      api('/member/notifications/preferences'),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    ),
  memberNotification: (accessToken: string, notificationId: string) =>
    fetchJson<MemberNotificationItem>(
      api(`/member/notifications/${encodeURIComponent(notificationId)}`),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  markMemberNotificationRead: (accessToken: string, notificationId: string) =>
    fetchJson<MemberNotificationItem>(
      api(`/member/notifications/${encodeURIComponent(notificationId)}/read`),
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  hideMemberNotification: (accessToken: string, notificationId: string) =>
    fetchJson(api(`/member/notifications/${encodeURIComponent(notificationId)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  clearMemberNotifications: (
    accessToken: string,
    payload: {
      channel?: 'PUSH' | 'EMAIL';
      before?: string;
      olderThanDays?: number;
      onlyRead?: boolean;
    },
  ) =>
    fetchJson<{ hidden: number }>(api('/member/notifications/clear'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
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
  memberEventRsvps: (accessToken: string, orgId?: string) =>
    fetchJson<MemberEventRsvp[]>(
      api(
        `/member/events/rsvps${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`,
      ),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  rsvpEvent: (
    accessToken: string,
    eventId: string,
    payload: { status: EventRsvpStatus; guests?: number; notes?: string },
  ) =>
    fetchJson<MemberEventRsvp>(
      api(`/member/events/${encodeURIComponent(eventId)}/rsvp`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    ),
  checkInEventByToken: (accessToken: string, token: string) =>
    fetchJson<MemberEventCheckInResponse>(
      api(`/member/events/checkin/${encodeURIComponent(token)}`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    ),
  registerDevice: (
    accessToken: string,
    payload: { token: string; platform: DevicePlatform },
  ) =>
    fetchJson(api('/notifications/devices'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }),
  unregisterDevice: (accessToken: string, token: string) =>
    fetchJson(api(`/notifications/devices/${encodeURIComponent(token)}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
};
