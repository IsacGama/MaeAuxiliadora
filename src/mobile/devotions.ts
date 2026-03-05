import AsyncStorage from '@react-native-async-storage/async-storage';
import { appConfig } from './config';

export type DevotionLanguage = 'pt' | 'la';
export type RosaryMysteryKey = 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos';
export type RosaryMode = 'terco' | 'rosario';
export type RosaryWeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type PrayerRecord = {
  id: string;
  title: string;
  icon?: string;
  text: {
    pt: string;
    la: string;
  };
};

export type LocalizedPrayerText = {
  pt: string;
  la: string;
};

export type DevotionKind = 'ROSARY' | 'CHAPLET' | 'GENERIC';

export type DevotionStructureStep = {
  type: string;
  label?: string;
  decade?: number;
  repeat?: number;
  repeatLabel?: string;
};

export type DevotionDefinition = {
  id: string;
  title: string;
  kind: DevotionKind;
  mysteries?: Partial<Record<RosaryMysteryKey, string[]>>;
  mysterySchedule?: Partial<Record<RosaryWeekdayKey, RosaryMysteryKey>>;
  weekdayLabels?: Partial<Record<RosaryWeekdayKey, string>>;
  structure: DevotionStructureStep[];
};

export type DevotionCatalog = {
  version: number;
  extraPrayers: Record<string, LocalizedPrayerText>;
  devotions: DevotionDefinition[];
};

type LegacyRosaryStep = {
  type: string;
  label: string;
  decade: number;
};

type LegacyRosaryData = {
  mysteries: Record<RosaryMysteryKey, string[]>;
  mysterySchedule?: Partial<Record<RosaryWeekdayKey, RosaryMysteryKey>>;
  weekdayLabels?: Partial<Record<RosaryWeekdayKey, string>>;
  structure: LegacyRosaryStep[];
  extraPrayers: Record<string, LocalizedPrayerText>;
};

export type RosaryStep = {
  type: string;
  label: string;
  decade: number;
};

export type RosaryData = {
  mysteries: Record<RosaryMysteryKey, string[]>;
  mysterySchedule?: Partial<Record<RosaryWeekdayKey, RosaryMysteryKey>>;
  weekdayLabels?: Partial<Record<RosaryWeekdayKey, string>>;
  structure: RosaryStep[];
  extraPrayers: Record<string, LocalizedPrayerText>;
};

type ExpandedStructureStep = RosaryStep & {
  sourceIndex: number;
  repeatIndex: number;
  repeatTotal: number;
};

export type GuidedRosaryStep = RosaryStep & {
  id: string;
  segmentIndex: number;
  segmentTotal: number;
  mysteryKey: RosaryMysteryKey;
  mysteryLabel: string;
  mysteryTitle?: string | null;
};

const fallbackPrayersData: PrayerRecord[] = [];
const fallbackLegacyRosaryData: LegacyRosaryData = {
  mysteries: {
    gozosos: [],
    dolorosos: [],
    gloriosos: [],
    luminosos: [],
  },
  mysterySchedule: {
    monday: 'gozosos',
    tuesday: 'dolorosos',
    wednesday: 'gloriosos',
    thursday: 'luminosos',
    friday: 'dolorosos',
    saturday: 'gozosos',
    sunday: 'gloriosos',
  },
  weekdayLabels: {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  },
  structure: [],
  extraPrayers: {},
};
const fallbackDevotionsCatalogData: Partial<DevotionCatalog> = {
  version: 1,
  extraPrayers: {},
  devotions: [],
};

let prayerById = new Map<string, PrayerRecord>();

const normalizeLocalizedText = (
  value: Partial<LocalizedPrayerText> | undefined,
): LocalizedPrayerText => ({
  pt: value?.pt?.trim() ?? '',
  la: value?.la?.trim() ?? '',
});

const normalizeStructureStep = (
  step: Partial<DevotionStructureStep> | undefined,
): DevotionStructureStep | null => {
  if (!step?.type || typeof step.type !== 'string') {
    return null;
  }

  const repeatRaw = Number(step.repeat ?? 1);
  const repeat = Number.isFinite(repeatRaw)
    ? Math.max(1, Math.floor(repeatRaw))
    : 1;
  const decadeRaw = Number(step.decade ?? 0);
  const decade = Number.isFinite(decadeRaw) ? Math.max(0, Math.floor(decadeRaw)) : 0;

  return {
    type: step.type.trim(),
    label: step.label?.trim() || undefined,
    decade,
    repeat,
    repeatLabel: step.repeatLabel?.trim() || undefined,
  };
};

const migrateLegacyRosaryToCatalog = (
  legacy: LegacyRosaryData,
): DevotionCatalog => ({
  version: 1,
  extraPrayers: legacy.extraPrayers ?? {},
  devotions: [
    {
      id: 'rosary',
      title: 'Santo Rosário',
      kind: 'ROSARY',
      mysteries: legacy.mysteries,
      mysterySchedule: legacy.mysterySchedule,
      weekdayLabels: legacy.weekdayLabels,
      structure: legacy.structure.map((step) => ({
        type: step.type,
        label: step.label,
        decade: step.decade,
        repeat: 1,
      })),
    },
  ],
});

const normalizeCatalog = (
  raw: Partial<DevotionCatalog> | null | undefined,
  legacy: LegacyRosaryData,
): DevotionCatalog => {
  if (!raw || !Array.isArray(raw.devotions) || raw.devotions.length === 0) {
    return migrateLegacyRosaryToCatalog(legacy);
  }

  const normalizedDevotions = raw.devotions
    .map((devotion): DevotionDefinition | null => {
      if (!devotion?.id || !devotion?.title) {
        return null;
      }

      const structure = (devotion.structure ?? [])
        .map((step) => normalizeStructureStep(step))
        .filter((step): step is DevotionStructureStep => Boolean(step));

      if (!structure.length) {
        return null;
      }

      const kind =
        devotion.kind === 'ROSARY' ||
          devotion.kind === 'CHAPLET' ||
          devotion.kind === 'GENERIC'
          ? devotion.kind
          : 'GENERIC';

      return {
        id: devotion.id.trim(),
        title: devotion.title.trim(),
        kind,
        mysteries: devotion.mysteries,
        mysterySchedule: devotion.mysterySchedule,
        weekdayLabels: devotion.weekdayLabels,
        structure,
      };
    })
    .filter((devotion): devotion is DevotionDefinition => Boolean(devotion));

  if (!normalizedDevotions.length) {
    return migrateLegacyRosaryToCatalog(legacy);
  }

  const hasRosary = normalizedDevotions.some((devotion) => devotion.id === 'rosary');
  if (!hasRosary) {
    normalizedDevotions.unshift(migrateLegacyRosaryToCatalog(legacy).devotions[0]);
  }

  const normalizedExtraPrayers = Object.entries(raw.extraPrayers ?? {}).reduce<
    Record<string, LocalizedPrayerText>
  >((acc, [key, value]) => {
    if (!key?.trim()) {
      return acc;
    }
    acc[key.trim()] = normalizeLocalizedText(value);
    return acc;
  }, {});

  return {
    version: Number(raw.version ?? 1),
    extraPrayers: {
      ...legacy.extraPrayers,
      ...normalizedExtraPrayers,
    },
    devotions: normalizedDevotions,
  };
};

const formatRepeatedLabel = (
  step: DevotionStructureStep,
  defaultLabel: string,
  index: number,
  total: number,
) => {
  if (total <= 1) {
    return defaultLabel;
  }

  const template = step.repeatLabel?.trim();
  if (template) {
    return template
      .replace(/{index}/gi, String(index))
      .replace(/{total}/gi, String(total));
  }

  return `${defaultLabel} (${index}/${total})`;
};

const expandStructure = (structure: DevotionStructureStep[]): ExpandedStructureStep[] => {
  const expanded: ExpandedStructureStep[] = [];

  structure.forEach((step, sourceIndex) => {
    const repeat = Math.max(1, Math.floor(step.repeat ?? 1));
    const decade = step.decade ?? 0;
    const prayerTitleFallback = prayerById.get(step.type)?.title ?? step.type;
    const labelBase = step.label?.trim() || prayerTitleFallback;

    for (let repeatIndex = 1; repeatIndex <= repeat; repeatIndex += 1) {
      expanded.push({
        type: step.type,
        decade,
        label: formatRepeatedLabel(step, labelBase, repeatIndex, repeat),
        sourceIndex,
        repeatIndex,
        repeatTotal: repeat,
      });
    }
  });

  return expanded;
};

export let prayers: PrayerRecord[] = [];
export let devotionsCatalog: DevotionCatalog;
export let devotions: DevotionDefinition[] = [];
export let rosary: RosaryData;
let expandedRosaryStructure: ExpandedStructureStep[] = [];

const devotionSyncCacheKey = '@devotions:catalog-sync:v1';
let hasSyncedFromBackend = false;
let inFlightSync: Promise<boolean> | null = null;

const isPrayerRecordArray = (value: unknown): value is PrayerRecord[] =>
  Array.isArray(value) &&
  value.every((item) =>
    Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as any).id === 'string' &&
      typeof (item as any).title === 'string' &&
      (item as any).text &&
      typeof (item as any).text.pt === 'string' &&
      typeof (item as any).text.la === 'string',
    ),
  );

const isCatalogShape = (value: unknown): value is Partial<DevotionCatalog> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as any).devotions),
  );

const applyDevotionState = (
  inputPrayers: PrayerRecord[],
  inputCatalog: Partial<DevotionCatalog> | null | undefined,
  legacyData: LegacyRosaryData,
) => {
  const nextCatalog = normalizeCatalog(inputCatalog, legacyData);
  const rosaryDevotion =
    nextCatalog.devotions.find((devotion) => devotion.id === 'rosary') ??
    migrateLegacyRosaryToCatalog(legacyData).devotions[0];

  prayers = inputPrayers;
  prayerById = new Map<string, PrayerRecord>(
    prayers.map((prayer) => [prayer.id, prayer]),
  );
  devotionsCatalog = nextCatalog;
  devotions = nextCatalog.devotions;
  expandedRosaryStructure = expandStructure(rosaryDevotion.structure);

  rosary = {
    mysteries:
      (rosaryDevotion.mysteries as Record<RosaryMysteryKey, string[]>) ??
      legacyData.mysteries,
    mysterySchedule: rosaryDevotion.mysterySchedule ?? legacyData.mysterySchedule,
    weekdayLabels: rosaryDevotion.weekdayLabels ?? legacyData.weekdayLabels,
    structure: expandedRosaryStructure.map((step) => ({
      type: step.type,
      label: step.label,
      decade: step.decade,
    })),
    extraPrayers: nextCatalog.extraPrayers,
  };
};

applyDevotionState(
  fallbackPrayersData,
  fallbackDevotionsCatalogData,
  fallbackLegacyRosaryData,
);

export const rosaryMysteryLabels: Record<RosaryMysteryKey, string> = {
  gozosos: 'Mistérios Gozosos',
  dolorosos: 'Mistérios Dolorosos',
  gloriosos: 'Mistérios Gloriosos',
  luminosos: 'Mistérios Luminosos',
};

export const devotionLanguageLabels: Record<DevotionLanguage, string> = {
  pt: 'Português',
  la: 'Latim',
};

const weekdayOrder: RosaryWeekdayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const defaultWeekdayLabels: Record<RosaryWeekdayKey, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const defaultMysterySchedule: Record<RosaryWeekdayKey, RosaryMysteryKey> = {
  monday: 'gozosos',
  tuesday: 'dolorosos',
  wednesday: 'gloriosos',
  thursday: 'luminosos',
  friday: 'dolorosos',
  saturday: 'gozosos',
  sunday: 'gloriosos',
};

const defaultMysteryOrder: RosaryMysteryKey[] = [
  'gozosos',
  'dolorosos',
  'gloriosos',
  'luminosos',
];

type RemoteDevotionsPayload = {
  prayers: PrayerRecord[];
  catalog: Partial<DevotionCatalog>;
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const fetchJsonWithTimeout = async <T>(
  url: string,
  timeoutMs = appConfig.requestTimeoutMs,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} em ${url}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

const saveDevotionsCache = async (payload: RemoteDevotionsPayload) => {
  try {
    await AsyncStorage.setItem(devotionSyncCacheKey, JSON.stringify(payload));
  } catch {
    // Cache opcional.
  }
};

const readDevotionsCache = async (): Promise<RemoteDevotionsPayload | null> => {
  try {
    const raw = await AsyncStorage.getItem(devotionSyncCacheKey);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as RemoteDevotionsPayload;
    if (!isPrayerRecordArray(parsed?.prayers) || !isCatalogShape(parsed?.catalog)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const syncDevotionsFromBackend = async (options?: { force?: boolean }) => {
  const force = Boolean(options?.force);
  if (inFlightSync) {
    return inFlightSync;
  }
  if (hasSyncedFromBackend && !force) {
    return false;
  }

  inFlightSync = (async () => {
    const baseUrl = trimTrailingSlash(appConfig.apiUrl);
    try {
      const [remotePrayers, remoteCatalog] = await Promise.all([
        fetchJsonWithTimeout<PrayerRecord[]>(`${baseUrl}/public/devotions/prayers`),
        fetchJsonWithTimeout<Partial<DevotionCatalog>>(`${baseUrl}/public/devotions/catalog`),
      ]);

      if (!isPrayerRecordArray(remotePrayers) || !isCatalogShape(remoteCatalog)) {
        throw new Error('Payload inválido para devoções.');
      }

      applyDevotionState(remotePrayers, remoteCatalog, fallbackLegacyRosaryData);
      await saveDevotionsCache({ prayers: remotePrayers, catalog: remoteCatalog });
      hasSyncedFromBackend = true;
      return true;
    } catch {
      const cached = await readDevotionsCache();
      if (cached) {
        applyDevotionState(cached.prayers, cached.catalog, fallbackLegacyRosaryData);
        hasSyncedFromBackend = true;
        return true;
      }
      hasSyncedFromBackend = false;
      return false;
    }
  })().finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
};

export const getDevotionById = (devotionId: string) =>
  devotionsCatalog.devotions.find((devotion) => devotion.id === devotionId) ?? null;

export const getExpandedDevotionSteps = (devotionId: string) => {
  const devotion = getDevotionById(devotionId);
  if (!devotion) {
    return [];
  }

  return expandStructure(devotion.structure).map((step) => ({
    type: step.type,
    label: step.label,
    decade: step.decade,
  }));
};

export const getRosaryWeekdayByDate = (
  date: Date = new Date(),
): RosaryWeekdayKey => {
  const weekday = date.getDay();

  if (weekday === 0) return 'sunday';
  if (weekday === 1) return 'monday';
  if (weekday === 2) return 'tuesday';
  if (weekday === 3) return 'wednesday';
  if (weekday === 4) return 'thursday';
  if (weekday === 5) return 'friday';
  return 'saturday';
};

export const getRosaryMysteryByDate = (date: Date = new Date()): RosaryMysteryKey => {
  const weekdayKey = getRosaryWeekdayByDate(date);
  return rosary.mysterySchedule?.[weekdayKey] ?? defaultMysterySchedule[weekdayKey];
};

export const getRosaryWeeklySchedule = () =>
  weekdayOrder.map((weekdayKey) => {
    const mysteryKey =
      rosary.mysterySchedule?.[weekdayKey] ?? defaultMysterySchedule[weekdayKey];
    const weekdayLabel =
      rosary.weekdayLabels?.[weekdayKey] ?? defaultWeekdayLabels[weekdayKey];
    return {
      weekdayKey,
      weekdayLabel,
      mysteryKey,
      mysteryLabel: rosaryMysteryLabels[mysteryKey],
    };
  });

export const getRosaryWeekdayLabel = (weekdayKey: RosaryWeekdayKey) =>
  rosary.weekdayLabels?.[weekdayKey] ?? defaultWeekdayLabels[weekdayKey];

export const getRosaryWeekdayOrder = () => weekdayOrder;

export const getRosaryMysteryLabel = (mysteryKey: RosaryMysteryKey) =>
  rosaryMysteryLabels[mysteryKey];

export const getRosaryMysteriesByKey = (mysteryKey: RosaryMysteryKey) => {
  return rosary.mysteries[mysteryKey] ?? [];
};

export const getRosaryMysteryOrder = () => {
  const available = new Set(Object.keys(rosary.mysteries) as RosaryMysteryKey[]);
  return defaultMysteryOrder.filter((key) => available.has(key));
};

export const getRosarySegmentLabel = (
  mode: RosaryMode,
  mysteryKey: RosaryMysteryKey,
  segmentIndex: number,
  segmentTotal: number,
) => {
  if (mode === 'terco') {
    return `Mistérios do Terço: ${getRosaryMysteryLabel(mysteryKey)}`;
  }
  return `Rosário ${segmentIndex + 1}/${segmentTotal}: ${getRosaryMysteryLabel(
    mysteryKey,
  )}`;
};

export const buildGuidedRosarySteps = (options: {
  mode: RosaryMode;
  mysteryKey: RosaryMysteryKey;
}): GuidedRosaryStep[] => {
  const segmentKeys =
    options.mode === 'terco' ? [options.mysteryKey] : getRosaryMysteryOrder();
  const segmentTotal = segmentKeys.length;
  const steps: GuidedRosaryStep[] = [];

  segmentKeys.forEach((segmentMysteryKey, segmentIndex) => {
    expandedRosaryStructure.forEach((baseStep, expandedIndex) => {
      const mysteries = getRosaryMysteriesByKey(segmentMysteryKey);
      const mysteryTitle =
        baseStep.decade > 0 ? (mysteries[baseStep.decade - 1] ?? null) : null;

      steps.push({
        type: baseStep.type,
        label: baseStep.label,
        decade: baseStep.decade,
        id: `${options.mode}-${segmentIndex + 1}-${expandedIndex + 1}-${baseStep.sourceIndex + 1}-${baseStep.repeatIndex}-${baseStep.type}`,
        segmentIndex,
        segmentTotal,
        mysteryKey: segmentMysteryKey,
        mysteryLabel: getRosaryMysteryLabel(segmentMysteryKey),
        mysteryTitle,
      });
    });
  });

  return steps;
};

export const getPrayerTextByLanguage = (
  prayer: PrayerRecord,
  language: DevotionLanguage,
) => {
  const primary = prayer.text[language]?.trim();
  if (primary) {
    return primary;
  }
  return (
    prayer.text.pt?.trim() || prayer.text.la?.trim() || 'Sem texto disponível.'
  );
};

export const getRosaryStepPrayerText = (
  stepType: string,
  language: DevotionLanguage,
) => {
  const extra = rosary.extraPrayers[stepType];
  if (extra) {
    return (
      extra[language]?.trim() ||
      extra.pt?.trim() ||
      extra.la?.trim() ||
      'Sem texto disponível.'
    );
  }

  const prayer = prayerById.get(stepType);
  if (!prayer) {
    return 'Texto de oração não encontrado para esta etapa.';
  }

  return getPrayerTextByLanguage(prayer, language);
};
