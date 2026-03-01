export type OrgEntityType = 'DIOCESE' | 'PARISH' | 'CHAPEL';
export type DevicePlatform = 'ANDROID' | 'IOS';

export type MediaAsset = {
  id: string;
  url: string;
  filename?: string;
};

export type OrgBranding = {
  id: string;
  orgUnitId: string;
  displayName?: string | null;
  slogan?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  pixKey?: string | null;
  pixKeyType?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankHolder?: string | null;
  socialLinks?: Record<string, string | null | undefined> | null;
  extra?: Record<string, unknown> | null;
  logoAsset?: MediaAsset | null;
  coatOfArmsAsset?: MediaAsset | null;
  coverAsset?: MediaAsset | null;
  logoAssetId?: string | null;
  coatOfArmsAssetId?: string | null;
  coverAssetId?: string | null;
};

export type DiocesePublic = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  customDomain?: string | null;
  orgUnit?: { id: string } | null;
};

export type ParishPublic = {
  id: string;
  name: string;
  customDomain?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: {
    city?: string | null;
    state?: string | null;
    neighborhood?: string | null;
    street?: string | null;
    number?: string | null;
  } | null;
  orgUnit?: { id: string } | null;
  diocese?: DiocesePublic | null;
};

export type ChapelPublic = {
  id: string;
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  customDomain?: string | null;
  parishId: string;
  parish?: { id: string; name: string; customDomain?: string | null } | null;
  orgUnit?: { id: string } | null;
};

export type ResolvedOrgEntity = {
  type: OrgEntityType;
  id: string;
  name: string;
  customDomain?: string | null;
  parishId?: string | null;
  orgUnitId: string;
  raw: DiocesePublic | ParishPublic | ChapelPublic;
};

export type LiturgyReadingItem = {
  titulo: string;
  referencia: string;
  texto: string;
  refrao?: string;
};

export type LiturgyPayload = {
  data: string;
  liturgia: string;
  cor: string;
  oracoes?: {
    coleta?: string;
    oferendas?: string;
    comunhao?: string;
    extras?: Array<{ titulo: string; texto: string }>;
  };
  leituras?: {
    primeiraLeitura?: LiturgyReadingItem[];
    salmo?: LiturgyReadingItem[];
    segundaLeitura?: LiturgyReadingItem[];
    evangelho?: LiturgyReadingItem[];
    extras?: LiturgyReadingItem[];
  };
};

export type SaintOfDayPayload = {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  meta?: {
    'dia-festivo'?: string;
    'imagem-sm'?: string;
  };
  imagem_destacada?: string;
  dia?: string;
  mes?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  personId?: string | null;
  roles?: string[];
  personParishLinks?: Array<{
    orgId: string;
    orgUnitType?: OrgEntityType | string | null;
    orgName?: string | null;
  }>;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type MemberDashboard = {
  person: {
    id: string;
    fullName: string;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
  };
  titheSummary: {
    totalTithed: number;
    titheCount: number;
    currentStreakMonths: number;
  };
  titherProfiles: Array<{
    id: string;
    status: 'ACTIVE' | 'INACTIVE';
    envelopeCode?: string | null;
    startedAt?: string | Date | null;
  }>;
  payments: Array<{
    id: string;
    total: number;
    paidAt: string | Date;
  }>;
};

export type PostVersion = {
  id: string;
  title?: string | null;
  summary?: string | null;
  version: number;
  createdAt: string;
};

export type PublicPost = {
  id: string;
  orgId: string;
  parishId?: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  createdAt: string;
  versions?: PostVersion[];
};

export type PublicPostPaginatedResponse = {
  items: PublicPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PublicContentBlock = {
  id: string;
  type:
    | 'HEADING'
    | 'RICH_TEXT'
    | 'IMAGE'
    | 'QUOTE'
    | 'DIVIDER'
    | 'BUTTON'
    | 'GALLERY'
    | 'EMBED'
    | 'COLUMNS'
    | string;
  order: number;
  data: Record<string, unknown>;
  style?: Record<string, unknown> | null;
};

export type PublicPostDetail = {
  id: string;
  orgId: string;
  parishId?: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  createdAt: string;
  parish?: { id: string; name: string } | null;
  versions?: Array<{
    id: string;
    version: number;
    title?: string | null;
    summary?: string | null;
    createdAt: string;
    blocks?: PublicContentBlock[];
  }>;
};

export type MemberNotificationItem = {
  id: string;
  orgId: string;
  parishId?: string;
  title: string;
  body: string;
  channel: 'PUSH' | 'EMAIL';
  data?: Record<string, unknown> | null;
  createdAt: string;
  deliveredAt: string;
  isRead: boolean;
  readAt?: string | null;
  parish?: {
    id: string;
    name: string;
  } | null;
};

export type MemberNotificationPreferences = {
  autoDeleteAfterDays: number | null;
  updatedAt?: string | null;
};

export type EventRsvpStatus = 'GOING' | 'MAYBE' | 'DECLINED';

export type CommunityEvent = {
  id: string;
  orgId: string;
  parishId?: string;
  chapelId?: string | null;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  coverImageUrl?: string | null;
  maxAttendees?: number | null;
  reminderHoursBefore?: number | null;
  reminderPushEnabled: boolean;
  reminderEmailEnabled: boolean;
  reminderPushSentAt?: string | null;
  reminderEmailSentAt?: string | null;
  isPublic: boolean;
  isActive: boolean;
  checkInToken: string;
  metrics?: {
    goingCount: number;
    maybeCount: number;
    declinedCount: number;
    checkedInCount: number;
    noShowCount: number;
    attendanceRate: number;
  };
  chapel?: {
    id: string;
    name: string;
  } | null;
};

export type MemberEventRsvp = {
  id: string;
  eventId: string;
  personId: string;
  status: EventRsvpStatus;
  guests: number;
  notes?: string | null;
  respondedAt: string;
  checkedInAt?: string | null;
  event?: CommunityEvent;
};

export type MemberEventCheckInResponse = {
  alreadyCheckedIn: boolean;
  checkedInAt?: string;
  eventId?: string;
  eventTitle?: string;
};
