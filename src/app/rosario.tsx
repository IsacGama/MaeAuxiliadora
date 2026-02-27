import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrgContext } from '../mobile/hooks/use-org-context';
import { useSpeech, speechRateLabels, type SpeechRate } from '../mobile/hooks/use-speech';
import { createThemeWithMode } from '../mobile/theme';
import { useThemePreference } from '../mobile/theme-preference';
import {
  buildGuidedRosarySteps,
  devotionLanguageLabels,
  getRosaryMysteryByDate,
  getRosarySegmentLabel,
  getRosaryStepPrayerText,
  getRosaryWeekdayByDate,
  getRosaryWeekdayLabel,
  getRosaryWeeklySchedule,
  getRosaryMysteriesByKey,
  getRosaryMysteryOrder,
  rosaryMysteryLabels,
  type DevotionLanguage,
  type RosaryMode,
  type RosaryMysteryKey,
  type RosaryWeekdayKey,
} from '../mobile/devotions';

type RosaryProgressPayload = {
  mode?: RosaryMode;
  mysteryKey?: RosaryMysteryKey;
  language?: DevotionLanguage;
  stepIndex?: number;
};

const STORAGE_KEY = '@devotions:rosary:progress';

const modeLabels: Record<RosaryMode, string> = {
  terco: 'Terço (mistério do dia)',
  rosario: 'Rosário (todos os mistérios)',
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  mysteryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prayerText: {
    fontSize: 15,
    lineHeight: 23,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mysteryItem: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  mysteryItemText: {
    fontSize: 13,
    lineHeight: 19,
  },
  weekdayItem: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  weekdayLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekdayMystery: {
    fontSize: 13,
  },
});

export default function RosaryScreen() {
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const params = useLocalSearchParams<{ preset?: string }>();
  const forceTodayPreset = params.preset === 'today';
  const forceRosarioPreset = params.preset === 'rosario';
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const [mode, setMode] = useState<RosaryMode>('terco');
  const [mysteryKey, setMysteryKey] = useState<RosaryMysteryKey>(() => getRosaryMysteryByDate(new Date()));
  const [language, setLanguage] = useState<DevotionLanguage>('pt');
  const [stepIndex, setStepIndex] = useState(0);

  const todayWeekdayKey = useMemo<RosaryWeekdayKey>(() => getRosaryWeekdayByDate(new Date()), []);
  const todayMysteryKey = useMemo<RosaryMysteryKey>(() => getRosaryMysteryByDate(new Date()), []);
  const weeklySchedule = useMemo(() => getRosaryWeeklySchedule(), []);
  const effectiveMysteryKey = mode === 'terco' ? todayMysteryKey : mysteryKey;

  const guidedSteps = useMemo(
    () => buildGuidedRosarySteps({ mode, mysteryKey: effectiveMysteryKey }),
    [effectiveMysteryKey, mode],
  );

  useEffect(() => {
    let active = true;

    const loadState = async () => {
      if (forceTodayPreset || forceRosarioPreset) {
        return;
      }

      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active || !raw) {
          return;
        }

        const parsed = JSON.parse(raw) as RosaryProgressPayload;
        if (parsed.mode) {
          setMode(parsed.mode);
        }
        if (parsed.mysteryKey) {
          setMysteryKey(parsed.mysteryKey);
        }
        if (parsed.language) {
          setLanguage(parsed.language);
        }
        if (typeof parsed.stepIndex === 'number' && parsed.stepIndex >= 0) {
          setStepIndex(parsed.stepIndex);
        }
      } catch {
        // Ignora payload inválido.
      }
    };

    void loadState();

    return () => {
      active = false;
    };
  }, [forceTodayPreset, forceRosarioPreset]);

  useEffect(() => {
    if (!forceTodayPreset) {
      return;
    }

    setMode('terco');
    setMysteryKey(getRosaryMysteryByDate(new Date()));
    setStepIndex(0);
  }, [forceTodayPreset]);

  useEffect(() => {
    if (!forceRosarioPreset) {
      return;
    }

    setMode('rosario');
    setStepIndex(0);
  }, [forceRosarioPreset]);

  useEffect(() => {
    setStepIndex((current) => Math.max(0, Math.min(current, guidedSteps.length - 1)));
  }, [guidedSteps.length]);

  useEffect(() => {
    const safeIndex = Math.max(0, Math.min(stepIndex, guidedSteps.length - 1));
    const payload: RosaryProgressPayload = {
      mode,
      mysteryKey,
      language,
      stepIndex: safeIndex,
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [guidedSteps.length, language, mode, mysteryKey, stepIndex]);

  const currentStep = guidedSteps[stepIndex] ?? guidedSteps[0];

  const progress = guidedSteps.length > 0 ? ((stepIndex + 1) / guidedSteps.length) * 100 : 0;
  const prayerText = currentStep
    ? getRosaryStepPrayerText(currentStep.type, language)
    : 'Sem conteúdo disponível.';

  const moveStep = (direction: 'prev' | 'next') => {
    setStepIndex((current) => {
      if (direction === 'prev') {
        return Math.max(0, current - 1);
      }
      return Math.min(guidedSteps.length - 1, current + 1);
    });
  };

  const renderModeSummary = () => {
    if (mode === 'terco') {
      return `Hoje (${getRosaryWeekdayLabel(todayWeekdayKey)}): ${rosaryMysteryLabels[todayMysteryKey]}`;
    }
    return `Sequência completa: ${getRosaryMysteryOrder().map((key) => rosaryMysteryLabels[key]).join(' • ')}`;
  };

  // --- Leitura em voz alta ---
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  // Latin ('la') is not supported by TTS engines; Italian is the closest
  // phonetically and matches the standard ecclesiastical Latin pronunciation.
  const languageCode = language === 'pt' ? 'pt-BR' : 'it-IT';

  // Refs for latest values in async callbacks
  const isAutoPlayingRef = useRef(false);
  isAutoPlayingRef.current = isAutoPlaying;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const guidedStepsLengthRef = useRef(guidedSteps.length);
  guidedStepsLengthRef.current = guidedSteps.length;
  const prayerTextRef = useRef(prayerText);
  prayerTextRef.current = prayerText;
  const languageCodeRef = useRef(languageCode);
  languageCodeRef.current = languageCode;

  const { isSpeaking, speak, stop, rate, setRate } = useSpeech({
    onDone: () => {
      if (!isAutoPlayingRef.current) return;
      if (stepIndexRef.current >= guidedStepsLengthRef.current - 1) {
        setIsAutoPlaying(false);
        return;
      }
      setTimeout(() => {
        setStepIndex((prev) => Math.min(prev + 1, guidedStepsLengthRef.current - 1));
      }, 1500);
    },
  });

  const speakRef = useRef(speak);
  speakRef.current = speak;

  // Speak whenever auto-play is on and step changes
  useEffect(() => {
    if (!isAutoPlaying) return;
    speakRef.current(prayerTextRef.current, languageCodeRef.current);
  }, [stepIndex, isAutoPlaying]);

  // Stop audio when mode/language changes
  useEffect(() => { stop(); }, [mode, language, stop]);

  const handleToggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      stop();
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
    }
  }, [isAutoPlaying, stop]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Pressable style={[styles.backButton, { borderColor: theme.border }]} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.primary }]}>Terço e Rosário Guiado</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Escolha o modo de oração: terço de hoje ou rosário completo.</Text>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Modo</Text>
          <View style={styles.buttonRow}>
            {(['terco', 'rosario'] as RosaryMode[]).map((nextMode) => {
              const isSelected = nextMode === mode;
              return (
                <Pressable
                  key={nextMode}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? theme.secondary : theme.border,
                      backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                    },
                  ]}
                  onPress={() => {
                    setMode(nextMode);
                    setStepIndex(0);
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
                    {modeLabels[nextMode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {mode === 'terco' ? (
            <Text style={[styles.subtitle, { color: theme.secondary }]}>
              No modo Terço, o app usa automaticamente o mistério do dia: {rosaryMysteryLabels[todayMysteryKey]}
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            {(Object.keys(devotionLanguageLabels) as DevotionLanguage[]).map((nextLanguage) => {
              const isSelected = nextLanguage === language;
              return (
                <Pressable
                  key={nextLanguage}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? theme.secondary : theme.border,
                      backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                    },
                  ]}
                  onPress={() => setLanguage(nextLanguage)}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}> 
                    {devotionLanguageLabels[nextLanguage]}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={[
                styles.chip,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: mode === 'terco' ? 0.4 : 1,
                },
              ]}
              onPress={() => {
                setMode('terco');
                setStepIndex(0);
              }}
              disabled={mode === 'terco'}
            >
              <Text style={[styles.chipText, { color: theme.primary }]}>Terço de hoje</Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>{renderModeSummary()}</Text>
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Etapa {stepIndex + 1} de {guidedSteps.length}</Text>
          <View style={[styles.progressTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
            <View style={[styles.progressFill, { backgroundColor: theme.secondary, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>{Math.round(progress)}% concluído</Text>
        </View>

        {currentStep && (
          <View style={[styles.card, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.08)' }]}> 
            <Text style={[styles.stepTitle, { color: theme.primary }]}>{currentStep.label}</Text>
            <Text style={[styles.mysteryText, { color: theme.secondary }]}> 
              {getRosarySegmentLabel(
                mode,
                currentStep.mysteryKey,
                currentStep.segmentIndex,
                currentStep.segmentTotal,
              )}
            </Text>
            {!!currentStep.mysteryTitle && (
              <Text style={[styles.mysteryText, { color: theme.secondary }]}> 
                {currentStep.decade}º mistério: {currentStep.mysteryTitle}
              </Text>
            )}

            <Text style={[styles.prayerText, { color: theme.text }]}>{prayerText}</Text>

            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.chip,
                  {
                    borderColor: isAutoPlaying ? theme.secondary : theme.border,
                    backgroundColor: isAutoPlaying ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                  },
                ]}
                onPress={handleToggleAutoPlay}
              >
                <MaterialCommunityIcons
                  name={isAutoPlaying ? 'stop-circle' : 'play-circle'}
                  size={15}
                  color={isAutoPlaying ? theme.secondary : theme.primary}
                />
                <Text style={[styles.chipText, { color: isAutoPlaying ? theme.secondary : theme.primary }]}>
                  {isAutoPlaying ? 'Parar leitura' : isSpeaking ? 'Lendo...' : 'Rezar em voz alta'}
                </Text>
              </Pressable>

              {(Object.keys(speechRateLabels) as string[]).map((key) => {
                const r = Number(key) as SpeechRate;
                const isSelected = r === rate;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? theme.secondary : theme.border,
                        backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                      },
                    ]}
                    onPress={() => setRate(r)}
                  >
                    <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
                      {speechRateLabels[r]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
                onPress={() => moveStep('prev')}
                disabled={stepIndex === 0}
              >
                <MaterialCommunityIcons name="chevron-left" size={16} color={stepIndex === 0 ? theme.textSoft : theme.primary} />
                <Text style={[styles.actionButtonText, { color: stepIndex === 0 ? theme.textSoft : theme.primary }]}>Anterior</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.15)' }]}
                onPress={() => moveStep('next')}
                disabled={stepIndex >= guidedSteps.length - 1}
              >
                <Text style={[styles.actionButtonText, { color: stepIndex >= guidedSteps.length - 1 ? theme.textSoft : theme.secondary }]}>Próxima oração</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={stepIndex >= guidedSteps.length - 1 ? theme.textSoft : theme.secondary} />
              </Pressable>

              <Pressable
                style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface, opacity: stepIndex === 0 ? 0.4 : 1 }]}
                onPress={() => setStepIndex(0)}
                disabled={stepIndex === 0}
              >
                <MaterialCommunityIcons name="refresh" size={16} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Recomeçar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {mode === 'terco' ? (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
            <Text style={[styles.subtitle, { color: theme.primary }]}>Mistérios selecionados</Text>
            {getRosaryMysteriesByKey(effectiveMysteryKey).map((mystery, index) => {
              const decade = index + 1;
              const isCurrent =
                currentStep?.mysteryKey === effectiveMysteryKey &&
                currentStep?.decade === decade;

              return (
                <View
                  key={`${effectiveMysteryKey}-${decade}`}
                  style={[
                    styles.mysteryItem,
                    {
                      borderColor: isCurrent ? theme.secondary : theme.border,
                      backgroundColor: isCurrent ? 'rgba(218, 139, 60, 0.12)' : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.mysteryItemText, { color: isCurrent ? theme.text : theme.textSoft }]}> 
                    <Text style={{ fontWeight: '800' }}>{decade}. </Text>
                    {mystery}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
            <Text style={[styles.subtitle, { color: theme.primary }]}>Ordem dos mistérios no Rosário completo</Text>
            {getRosaryMysteryOrder().map((segmentKey, segmentIndex) => {
              const isActiveSegment = currentStep?.mysteryKey === segmentKey;
              return (
                <View
                  key={`segment-${segmentKey}`}
                  style={[
                    styles.mysteryItem,
                    {
                      borderColor: isActiveSegment ? theme.secondary : theme.border,
                      backgroundColor: isActiveSegment ? 'rgba(218, 139, 60, 0.10)' : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.weekdayLabel, { color: isActiveSegment ? theme.secondary : theme.textSoft }]}> 
                    {segmentIndex + 1}. {rosaryMysteryLabels[segmentKey]}
                  </Text>
                  {getRosaryMysteriesByKey(segmentKey).map((title, idx) => (
                    <Text key={`${segmentKey}-${idx + 1}`} style={[styles.mysteryItemText, { color: theme.textSoft }]}> 
                      <Text style={{ fontWeight: '800' }}>{idx + 1}. </Text>
                      {title}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.subtitle, { color: theme.primary }]}>Mistérios por dia da semana</Text>
          {weeklySchedule.map((entry) => {
            const isToday = entry.weekdayKey === todayWeekdayKey;

            return (
              <View
                key={entry.weekdayKey}
                style={[
                  styles.weekdayItem,
                  {
                    borderColor: isToday ? theme.secondary : theme.border,
                    backgroundColor: isToday ? 'rgba(218, 139, 60, 0.12)' : theme.surface,
                  },
                ]}
              >
                <Text style={[styles.weekdayLabel, { color: isToday ? theme.secondary : theme.textSoft }]}> 
                  {entry.weekdayLabel}
                </Text>
                <Text style={[styles.weekdayMystery, { color: theme.text }]}>{entry.mysteryLabel}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
