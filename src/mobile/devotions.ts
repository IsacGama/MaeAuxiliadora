export type DevotionLanguage = 'pt' | 'la';
export type RosaryMysteryKey = 'gozosos' | 'dolorosos' | 'gloriosos' | 'luminosos';

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

export const getRosaryMysteryByDate = (date: Date = new Date()): RosaryMysteryKey => {
  const weekday = date.getDay();

  if (weekday === 1 || weekday === 6) {
    return 'gozosos';
  }
  if (weekday === 2 || weekday === 5) {
    return 'dolorosos';
  }
  if (weekday === 4) {
    return 'luminosos';
  }

  return 'gloriosos';
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
