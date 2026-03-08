export type OrgEntityType = 'DIOCESE' | 'PARISH' | 'CHAPEL';
export type DevicePlatform = 'ANDROID' | 'IOS';
export type GatewayDonationIntent = 'TITHE' | 'DONATION' | 'OFFERING' | 'EVENT' | 'OTHER';
export type DevotionalRequestType = 'MASS_INTENTION' | 'PRAYER_REQUEST';
export type DevotionalRequestStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED';
export type GatewayPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'REFUNDED';
export type ScheduleCategory = 'MASS' | 'CONFESSION' | 'ADORATION' | 'OFFICE_HOURS' | 'CATECHESIS' | 'OTHER';
export type TitherStatus = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';

export type PublicSchedule = {
  id: string;
  orgUnitId: string;
  category: ScheduleCategory;
  dayOfWeek: number;
  startTime: string;
  endTime?: string | null;
  label?: string | null;
  location?: string | null;
  isActive: boolean;
};

export type DonationCampaign = {
  id: string;
  orgUnitId: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
};

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
  parish?: { id: string; name: string; customDomain?: string | null } | null;
  orgUnit?: { id: string } | null;
};

export type ResolvedOrgEntity = {
  type: OrgEntityType;
  id: string;
  name: string;
  customDomain?: string | null;
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
  emailVerified: boolean;
  accountSetupRequired: boolean;
  mustChangePassword: boolean;
  roles?: string[];
  personOrgLinks?: Array<{
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

export type AuthQueuedActionResponse = {
  message: string;
  email: string;
  loginUrl?: string | null;
};

export type AuthPasswordResetPreviewResponse = {
  name: string;
  email: string;
  expiresAt: string;
  loginUrl?: string | null;
};

export type AuthAccountSetupPreviewResponse = {
  name: string;
  email: string;
  expiresAt: string;
  loginUrl?: string | null;
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
  contributionSummary: {
    totalContributed: number;
    contributionCount: number;
  };
  titherProfiles: Array<{
    id: string;
    orgId: string;
    status: TitherStatus;
    envelopeCode?: string | null;
    currentEnvelopeCode?: string | null;
    currentEnvelopeMonth?: string | null;
    startedAt?: string | Date | null;
    titheControl?: {
      expectedMonths: number;
      paidMonths: number;
      overdueMonths: number;
      lastPaidMonth?: string | null;
      overdueCompetences?: string[];
    } | null;
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
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  createdAt: string;
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
  title: string;
  body: string;
  channel: 'PUSH' | 'EMAIL';
  data?: Record<string, unknown> | null;
  createdAt: string;
  deliveredAt: string;
  isRead: boolean;
  readAt?: string | null;
};

export type MemberNotificationPreferences = {
  autoDeleteAfterDays: number | null;
  updatedAt?: string | null;
};

export type EventRsvpStatus = 'GOING' | 'MAYBE' | 'DECLINED';

export type CommunityEvent = {
  id: string;
  orgId: string;
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

export type GatewayPublicProviderStatusResponse = {
  orgUnitId: string;
  provider: 'MERCADO_PAGO';
  status: 'CONNECTED' | 'DISCONNECTED';
  available: boolean;
  updatedAt: string | null;
};

export type GatewayPixPaymentResponse = {
  id: string;
  orgUnitId: string;
  amount: number;
  status: GatewayPaymentStatus;
  externalReference: string;
  providerPaymentId: string | null;
  providerStatus: string | null;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
  pixExpiresAt: string | null;
  createdAt: string;
};

export type GatewayCardCheckoutResponse = {
  id: string;
  orgUnitId: string;
  amount: number;
  status: GatewayPaymentStatus;
  externalReference: string;
  preferenceId: string | null;
  checkoutUrl: string | null;
  sandboxCheckoutUrl: string | null;
  createdAt: string;
};

export type GatewayPaymentStatusResponse = {
  id: string;
  orgUnitId: string;
  kind: 'PIX' | 'CARD';
  intent: GatewayDonationIntent;
  amount: number;
  currency: string;
  status: GatewayPaymentStatus;
  providerPaymentId: string | null;
  providerStatus: string | null;
  pixCopyPaste: string | null;
  pixQrBase64: string | null;
  pixExpiresAt: string | null;
  paidAt: string | null;
  accountingPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DevotionalRequestSettings = {
  orgUnitId: string;
  massIntentionEnabled: boolean;
  massIntentionAmount: number;
  prayerRequestEnabled: boolean;
  prayerRequestAmount: number;
  publicInstructions?: string | null;
};

export type DevotionalRequest = {
  id: string;
  orgUnitId: string;
  personId?: string | null;
  type: DevotionalRequestType;
  status: DevotionalRequestStatus;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  intentionFor?: string | null;
  intentionText: string;
  requestedForDate?: string | null;
  scheduleId?: string | null;
  schedule?: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime?: string | null;
    label?: string | null;
    location?: string | null;
  } | null;
  amount: number;
  gatewayPaymentId?: string | null;
  gatewayPaymentStatus?: GatewayPaymentStatus | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DevotionalRequestPixResponse = {
  requestId: string;
  amount: number;
  gatewayPaymentId: string;
  status: GatewayPaymentStatus;
  pixCopyPaste?: string | null;
  pixQrBase64?: string | null;
  pixExpiresAt?: string | null;
  createdAt: string;
};

export type DevotionalRequestCardCheckoutResponse = {
  requestId: string;
  amount: number;
  gatewayPaymentId: string;
  status: GatewayPaymentStatus;
  preferenceId?: string | null;
  checkoutUrl?: string | null;
  sandboxCheckoutUrl?: string | null;
  createdAt: string;
};
