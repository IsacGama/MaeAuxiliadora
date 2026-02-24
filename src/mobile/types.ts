export type OrgEntityType = 'DIOCESE' | 'PARISH' | 'CHAPEL';

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
    parishId: string;
    chapelId?: string | null;
    parishName?: string | null;
    chapelName?: string | null;
    parishOrgUnitId?: string | null;
    chapelOrgUnitId?: string | null;
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
  parishId: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: string | null;
  createdAt: string;
  versions?: PostVersion[];
};
