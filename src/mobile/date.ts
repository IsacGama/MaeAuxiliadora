const pad = (value: number) => String(value).padStart(2, '0');
const DAY_KEY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export const getDayKey = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

export const parseDayKey = (dayKey: string) => {
  const match = dayKey.match(DAY_KEY_REGEX);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

export const normalizeDayKey = (value?: string | null, fallback: string = getDayKey()) => {
  if (!value) {
    return fallback;
  }

  const parsed = parseDayKey(value);
  return parsed ? getDayKey(parsed) : fallback;
};

export const shiftDayKey = (dayKey: string, days: number) => {
  const parsed = parseDayKey(dayKey);
  if (!parsed || !Number.isFinite(days) || days === 0) {
    return parsed ? getDayKey(parsed) : getDayKey();
  }

  parsed.setDate(parsed.getDate() + days);
  return getDayKey(parsed);
};

export const parseBrazilianDateToDayKey = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(BR_DATE_REGEX);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return getDayKey(parsed);
};

export const formatDateLabel = (isoDate: string) => {
  const parsed = parseDayKey(isoDate) ?? new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};
