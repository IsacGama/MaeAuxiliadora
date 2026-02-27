export type DevotionLanguage = 'pt' | 'la';
export type RosaryMysteryKey = 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos';
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
  extraPrayers: Record<string, { pt: string; la: string }>;
};

const prayersData = require('../data/prayers.json') as PrayerRecord[];
const rosaryData = require('../data/rosary.json') as RosaryData;

const prayerById = new Map<string, PrayerRecord>(
  prayersData.map((prayer) => [prayer.id, prayer]),
);

export const prayers = prayersData;
export const rosary = rosaryData;

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

export const getRosaryWeekdayByDate = (date: Date = new Date()): RosaryWeekdayKey => {
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
    const mysteryKey = rosary.mysterySchedule?.[weekdayKey] ?? defaultMysterySchedule[weekdayKey];
    const weekdayLabel = rosary.weekdayLabels?.[weekdayKey] ?? defaultWeekdayLabels[weekdayKey];
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

export const getPrayerTextByLanguage = (
  prayer: PrayerRecord,
  language: DevotionLanguage,
) => {
  const primary = prayer.text[language]?.trim();
  if (primary) {
    return primary;
  }
  return prayer.text.pt?.trim() || prayer.text.la?.trim() || 'Sem texto disponível.';
};

export const getRosaryStepPrayerText = (
  stepType: string,
  language: DevotionLanguage,
) => {
  const extra = rosary.extraPrayers[stepType];
  if (extra) {
    return extra[language]?.trim() || extra.pt?.trim() || extra.la?.trim() || 'Sem texto disponível.';
  }

  const prayer = prayerById.get(stepType);
  if (!prayer) {
    return 'Texto de oração não encontrado para esta etapa.';
  }

  return getPrayerTextByLanguage(prayer, language);
};
