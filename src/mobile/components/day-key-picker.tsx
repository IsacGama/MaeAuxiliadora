import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateLabel, getDayKey, parseDayKey } from '../date';
import { AppTheme, getTextColorForBackground } from '../theme';

type DayCell = {
  key: string;
  day: number;
  dayKey: string;
  inCurrentMonth: boolean;
};

type DayKeyPickerProps = {
  value: string;
  onChange: (dayKey: string) => void;
  theme: AppTheme;
  label: string;
  hint?: string;
  title: string;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABEL = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

const styles = StyleSheet.create({
  trigger: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerText: {
    flex: 1,
    gap: 2,
  },
  triggerPrimary: {
    fontSize: 15,
    fontWeight: '700',
  },
  triggerSecondary: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 16, 0.84)',
    justifyContent: 'center',
    padding: 16,
  },
  modalPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelWrap: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdaysRow: {
    flexDirection: 'row',
    gap: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayCell: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

const isDarkHexColor = (hex: string) => {
  const normalized = hex.trim();
  const match = normalized.match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) {
    return true;
  }

  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
};

const withAlpha = (hex: string, alpha: number, fallback: string) => {
  const normalized = hex.trim();
  const match = normalized.match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) {
    return fallback;
  }

  const value = match[1];
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildCalendarCells = (monthDate: Date): DayCell[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const startWeekDay = monthStart.getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells: DayCell[] = [];

  for (let i = startWeekDay - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, daysInPreviousMonth - i);
    cells.push({
      key: `p-${date.toISOString()}`,
      day: date.getDate(),
      dayKey: getDayKey(date),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInCurrentMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      key: `c-${date.toISOString()}`,
      day,
      dayKey: getDayKey(date),
      inCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day += 1) {
    const date = new Date(year, month + 1, day);
    cells.push({
      key: `n-${date.toISOString()}`,
      day: date.getDate(),
      dayKey: getDayKey(date),
      inCurrentMonth: false,
    });
  }

  return cells;
};

const chunkByWeek = (cells: DayCell[]) => {
  const chunks: DayCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    chunks.push(cells.slice(index, index + 7));
  }
  return chunks;
};

export const DayKeyPicker = ({ value, onChange, theme, label, hint, title }: DayKeyPickerProps) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDayKey(value) ?? new Date());

  useEffect(() => {
    if (!open) return;
    setViewDate(parseDayKey(value) ?? new Date());
  }, [open, value]);

  const selectedDate = parseDayKey(value) ?? new Date();
  const selectedDayKey = getDayKey(selectedDate);
  const todayDayKey = getDayKey();
  const isToday = selectedDayKey === getDayKey();
  const monthLabel = MONTH_LABEL.format(viewDate);
  const cells = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const weekRows = useMemo(() => chunkByWeek(cells), [cells]);
  const isDarkTheme = isDarkHexColor(theme.bg);
  const panelColor = isDarkTheme ? '#0F1B2D' : '#FFFFFF';
  const inputColor = isDarkTheme ? '#12253E' : '#F4F8FF';
  const mutedTextColor = isDarkTheme ? '#9EB3D3' : '#647A9C';
  const currentMonthTextColor = isDarkTheme ? '#EAF2FF' : '#1A3154';

  return (
    <>
      <Text style={[styles.triggerSecondary, { color: theme.textSoft }]}>{label}</Text>
      <Pressable
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: inputColor }]}
        onPress={() => setOpen(true)}
      >
        <MaterialCommunityIcons name="calendar-month" size={18} color={theme.secondary} />
        <View style={styles.triggerText}>
          <Text style={[styles.triggerPrimary, { color: theme.text }]}>{formatDateLabel(value)}</Text>
          <Text style={[styles.triggerSecondary, { color: theme.textSoft }]}>
            {hint ?? (isToday ? 'Hoje' : 'Data selecionada')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.modalPanel, { backgroundColor: panelColor, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
              <Pressable
                style={[styles.monthButton, { borderColor: theme.border }]}
                onPress={() => setOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
              </Pressable>
            </View>

            <View style={styles.monthRow}>
              <Pressable
                style={[styles.monthButton, { borderColor: theme.border }]}
                onPress={() =>
                  setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-left" size={18} color={theme.secondary} />
              </Pressable>

              <View style={[styles.monthLabelWrap, { borderColor: theme.border }]}>
                <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
              </View>

              <Pressable
                style={[styles.monthButton, { borderColor: theme.border }]}
                onPress={() =>
                  setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
              >
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.secondary} />
              </Pressable>
            </View>

            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((weekday) => (
                <View key={weekday} style={styles.weekdayCell}>
                  <Text style={[styles.weekdayText, { color: mutedTextColor }]}>{weekday}</Text>
                </View>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {weekRows.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                  {week.map((cell) => {
                    const isSelected = cell.dayKey === selectedDayKey;
                    const isTodayCell = cell.dayKey === todayDayKey;
                    const textColor = isSelected
                      ? getTextColorForBackground(theme.secondary)
                      : cell.inCurrentMonth
                        ? currentMonthTextColor
                        : mutedTextColor;

                    return (
                      <Pressable
                        key={cell.key}
                        style={[
                          styles.dayCell,
                          {
                            borderColor: isSelected
                              ? theme.secondary
                              : isTodayCell
                                ? theme.accent
                                : theme.border,
                            backgroundColor: isSelected
                              ? theme.secondary
                              : isTodayCell
                                ? withAlpha(theme.accent, 0.2, isDarkTheme ? '#1D304A' : '#FCEDEB')
                                : cell.inCurrentMonth
                                  ? inputColor
                                  : withAlpha(theme.border, 0.18, isDarkTheme ? '#162B47' : '#EEF4FF'),
                          },
                        ]}
                        onPress={() => {
                          onChange(cell.dayKey);
                          setOpen(false);
                        }}
                      >
                        <Text style={[styles.dayText, { color: textColor }]}>{cell.day}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.secondary }]}
                onPress={() => {
                  const today = getDayKey();
                  onChange(today);
                  setOpen(false);
                }}
              >
                <Text style={[styles.actionButtonText, { color: theme.secondary }]}>Hoje</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
