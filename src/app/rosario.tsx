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
import { useAppTheme } from '../mobile/theme';
import {
  buildGuidedRosarySteps,
  devotions,
  devotionLanguageLabels,
  getDevotionById,
  getExpandedDevotionSteps,
  getRosaryMysteryByDate,
  getRosarySegmentLabel,
  getRosaryStepPrayerText,
  getRosaryWeekdayByDate,
  getRosaryWeekdayLabel,
  getRosaryWeeklySchedule,
  getRosaryMysteriesByKey,
  getRosaryMysteryOrder,
  rosaryMysteryLabels,
  syncDevotionsFromBackend,
  type DevotionLanguage,
  type RosaryMode,
  type RosaryMysteryKey,
  type RosaryWeekdayKey,
} from '../mobile/devotions';
import {
  clearDownloadedPrayerAudios,
  downloadPrayerAudioEntries,
  getDownloadedPrayerAudioStats,
  getPrayerAudioSource,
} from '../mobile/devotion-audio';

type RosaryProgressPayload = {
  devotionId?: string;
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

const mysteryOrdinalLabelsByLanguage: Record<DevotionLanguage, Record<number, string>> = {
  pt: {
    1: 'Primeiro',
    2: 'Segundo',
    3: 'Terceiro',
    4: 'Quarto',
    5: 'Quinto',
  },
  la: {
    1: 'Primum',
    2: 'Secundum',
    3: 'Tertium',
    4: 'Quartum',
    5: 'Quintum',
  },
};

const mysteryTypeLabelsByLanguage: Record<DevotionLanguage, Record<RosaryMysteryKey, string>> = {
  pt: {
    gozosos: 'gozoso',
    dolorosos: 'doloroso',
    gloriosos: 'glorioso',
    luminosos: 'luminoso',
  },
  la: {
    gozosos: 'gaudiosum',
    dolorosos: 'dolorosum',
    gloriosos: 'gloriosum',
    luminosos: 'luminosum',
  },
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
  const params = useLocalSearchParams<{ preset?: string }>();
  const forceTodayPreset = params.preset === 'today';
  const forceRosarioPreset = params.preset === 'rosario';
  const theme = useAppTheme();

  const [mode, setMode] = useState<RosaryMode>('terco');
  const [devotionId, setDevotionId] = useState('rosary');
  const [mysteryKey, setMysteryKey] = useState<RosaryMysteryKey>(() => getRosaryMysteryByDate(new Date()));
  const [language, setLanguage] = useState<DevotionLanguage>('pt');
  const [stepIndex, setStepIndex] = useState(0);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [downloadMeta, setDownloadMeta] = useState<{ count: number; bytes: number }>({
    count: 0,
    bytes: 0,
  });
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [devotionsVersion, setDevotionsVersion] = useState(0);

  const todayWeekdayKey = useMemo<RosaryWeekdayKey>(() => getRosaryWeekdayByDate(new Date()), []);
  const todayMysteryKey = useMemo<RosaryMysteryKey>(() => getRosaryMysteryByDate(new Date()), []);
  const weeklySchedule = useMemo(
    () => getRosaryWeeklySchedule(),
    [devotionsVersion],
  );
  const availableDevotions = useMemo(
    () => [...devotions],
    [devotionsVersion],
  );
  const selectedDevotion = useMemo(
    () => getDevotionById(devotionId) ?? getDevotionById('rosary'),
    [devotionId],
  );
  const isRosaryDevotion = selectedDevotion?.id === 'rosary';
  const effectiveMysteryKey = mode === 'terco' ? todayMysteryKey : mysteryKey;
  const expandedDevotionSteps = useMemo(
    () => getExpandedDevotionSteps(selectedDevotion?.id ?? 'rosary'),
    [selectedDevotion?.id],
  );

  const refreshDownloadStats = useCallback(async () => {
    const stats = await getDownloadedPrayerAudioStats();
    setDownloadMeta(stats);
  }, []);

  useEffect(() => {
    void refreshDownloadStats();
  }, [refreshDownloadStats]);

  const syncDevotionsState = useCallback(async (force = false) => {
    setSyncBusy(true);
    try {
      const synced = await syncDevotionsFromBackend({ force });
      if (!synced) {
        setSyncMessage(
          'Não foi possível sincronizar as devoções agora. Verifique sua conexão com o backend e tente novamente.',
        );
        return;
      }
      setSyncMessage(null);
      setDevotionsVersion((current) => current + 1);
    } finally {
      setSyncBusy(false);
    }
  }, []);

  useEffect(() => {
    void syncDevotionsState();
  }, [syncDevotionsState]);

  const guidedSteps = useMemo(
    () => {
      if (isRosaryDevotion) {
        return buildGuidedRosarySteps({ mode, mysteryKey: effectiveMysteryKey });
      }

      return expandedDevotionSteps.map((step, index) => ({
        ...step,
        id: `${selectedDevotion?.id ?? 'devotion'}-${index + 1}-${step.type}`,
        segmentIndex: 0,
        segmentTotal: 1,
        mysteryKey: todayMysteryKey,
        mysteryLabel: selectedDevotion?.title ?? 'Devoção',
        mysteryTitle: null,
      }));
    },
    [
      effectiveMysteryKey,
      expandedDevotionSteps,
      isRosaryDevotion,
      mode,
      selectedDevotion?.id,
      selectedDevotion?.title,
      todayMysteryKey,
    ],
  );

  const emptyStepRetryRef = useRef(false);
  useEffect(() => {
    if (guidedSteps.length > 0) {
      emptyStepRetryRef.current = false;
      return;
    }
    if (!selectedDevotion || syncBusy || emptyStepRetryRef.current) {
      return;
    }

    emptyStepRetryRef.current = true;
    void syncDevotionsState(true);
  }, [guidedSteps.length, selectedDevotion?.id, syncBusy, syncDevotionsState]);

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
        if (parsed.devotionId) {
          setDevotionId(parsed.devotionId);
        }
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
    setDevotionId('rosary');
    setMysteryKey(getRosaryMysteryByDate(new Date()));
    setStepIndex(0);
  }, [forceTodayPreset]);

  useEffect(() => {
    if (!forceRosarioPreset) {
      return;
    }

    setMode('rosario');
    setDevotionId('rosary');
    setStepIndex(0);
  }, [forceRosarioPreset]);

  useEffect(() => {
    if (isRosaryDevotion) {
      return;
    }
    setMode('terco');
  }, [isRosaryDevotion]);

  useEffect(() => {
    if (!isRosaryDevotion || mode !== 'rosario') {
      return;
    }
    if (getRosaryMysteryOrder().length > 0) {
      return;
    }
    setMode('terco');
    setStepIndex(0);
  }, [devotionsVersion, isRosaryDevotion, mode]);

  useEffect(() => {
    setStepIndex((current) => Math.max(0, Math.min(current, guidedSteps.length - 1)));
  }, [guidedSteps.length]);

  useEffect(() => {
    const safeIndex = Math.max(0, Math.min(stepIndex, guidedSteps.length - 1));
    const payload: RosaryProgressPayload = {
      devotionId: selectedDevotion?.id,
      mode,
      mysteryKey,
      language,
      stepIndex: safeIndex,
    };

    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [guidedSteps.length, language, mode, mysteryKey, selectedDevotion?.id, stepIndex]);

  const currentStep = guidedSteps[stepIndex] ?? guidedSteps[0];

  const progress = guidedSteps.length > 0 ? ((stepIndex + 1) / guidedSteps.length) * 100 : 0;
  const prayerText = currentStep
    ? getRosaryStepPrayerText(currentStep.type, language)
    : 'Sem conteúdo disponível.';

  const buildMysteryAnnouncement = useCallback((
    targetIndex: number,
    targetLanguage: DevotionLanguage,
  ) => {
    if (!isRosaryDevotion) {
      return null;
    }

    const targetStep = guidedSteps[targetIndex];
    if (!targetStep || targetStep.decade <= 0 || !targetStep.mysteryTitle) {
      return null;
    }

    const previousStep = targetIndex > 0 ? guidedSteps[targetIndex - 1] : null;
    const entersNewDecade =
      !previousStep ||
      previousStep.segmentIndex !== targetStep.segmentIndex ||
      previousStep.decade !== targetStep.decade;

    if (!entersNewDecade) {
      return null;
    }

    const ordinal =
      mysteryOrdinalLabelsByLanguage[targetLanguage]?.[targetStep.decade] ??
      `${targetStep.decade}º`;
    const mysteryType =
      mysteryTypeLabelsByLanguage[targetLanguage]?.[targetStep.mysteryKey] ??
      'do dia';
    const prefix =
      targetLanguage === 'la'
        ? `${ordinal} mysterium ${mysteryType}`
        : `${ordinal} mistério ${mysteryType}`;

    return {
      id: `rosary-mystery-${targetStep.mysteryKey}-${targetStep.decade}`,
      text: `${prefix}: ${targetStep.mysteryTitle}.`,
    };
  }, [guidedSteps, isRosaryDevotion]);

  const moveStep = (direction: 'prev' | 'next') => {
    setStepIndex((current) => {
      if (direction === 'prev') {
        return Math.max(0, current - 1);
      }
      return Math.min(guidedSteps.length - 1, current + 1);
    });
  };

  const renderModeSummary = () => {
    if (!isRosaryDevotion) {
      return `${selectedDevotion?.title ?? 'Devoção'} • ${guidedSteps.length} passos`;
    }
    if (mode === 'terco') {
      return `Hoje (${getRosaryWeekdayLabel(todayWeekdayKey)}): ${rosaryMysteryLabels[todayMysteryKey]}`;
    }
    return `Sequência completa: ${getRosaryMysteryOrder().map((key) => rosaryMysteryLabels[key]).join(' • ')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleDownloadCurrentDevotion = useCallback(async () => {
    if (downloadBusy) {
      return;
    }

    const prayerIds = Array.from(new Set(expandedDevotionSteps.map((step) => step.type)));
    if (isRosaryDevotion) {
      getRosaryMysteryOrder().forEach((segmentKey) => {
        const mysteries = getRosaryMysteriesByKey(segmentKey);
        mysteries.forEach((_title, index) => {
          prayerIds.push(`rosary-mystery-${segmentKey}-${index + 1}`);
        });
      });
    }
    if (!prayerIds.length) {
      setDownloadMessage('Sem orações para download nesta devoção.');
      return;
    }

    setDownloadBusy(true);
    setDownloadMessage('Iniciando download...');
    try {
      const result = await downloadPrayerAudioEntries({
        language,
        prayerIds,
        onProgress: (progress) => {
          setDownloadMessage(
            `Baixando ${progress.current}/${progress.total} (ok: ${progress.downloaded}, existentes: ${progress.skipped}, falhas: ${progress.failed})`,
          );
        },
      });
      await refreshDownloadStats();
      setDownloadMessage(
        `Concluído: ${result.downloaded} novos, ${result.skipped} já existentes, ${result.failed} falhas.`,
      );
    } finally {
      setDownloadBusy(false);
    }
  }, [
    downloadBusy,
    expandedDevotionSteps,
    isRosaryDevotion,
    language,
    refreshDownloadStats,
  ]);

  const handleClearDownloadedAudio = useCallback(async () => {
    if (downloadBusy) {
      return;
    }

    setDownloadBusy(true);
    try {
      await clearDownloadedPrayerAudios();
      await refreshDownloadStats();
      setDownloadMessage('Áudios offline removidos do dispositivo.');
    } finally {
      setDownloadBusy(false);
    }
  }, [downloadBusy, refreshDownloadStats]);

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
  const languageCodeRef = useRef(languageCode);
  languageCodeRef.current = languageCode;
  const guidedStepsRef = useRef(guidedSteps);
  guidedStepsRef.current = guidedSteps;
  const languageRef = useRef(language);
  languageRef.current = language;
  const autoSpeakRequestRef = useRef(0);
  const activeSpeakRequestRef = useRef(0);
  const pendingPrayerAfterAnnouncementRef = useRef<{
    text: string;
    languageCode: string;
    audioUri: string | null;
  } | null>(null);
  const speakRef = useRef(
    (_text: string, _language: string, _payload?: { audioUri?: string | null }) =>
      Promise.resolve(),
  );

  const { isSpeaking, speak, stop, rate, setRate } = useSpeech({
    onDone: () => {
      if (activeSpeakRequestRef.current !== autoSpeakRequestRef.current) {
        return;
      }
      const pendingPrayer = pendingPrayerAfterAnnouncementRef.current;
      if (pendingPrayer) {
        pendingPrayerAfterAnnouncementRef.current = null;
        activeSpeakRequestRef.current = autoSpeakRequestRef.current;
        void speakRef.current(pendingPrayer.text, pendingPrayer.languageCode, {
          audioUri: pendingPrayer.audioUri,
        });
        return;
      }
      if (!isAutoPlayingRef.current) return;
      if (stepIndexRef.current >= guidedStepsLengthRef.current - 1) {
        setIsAutoPlaying(false);
        return;
      }
      setTimeout(() => {
        if (!isAutoPlayingRef.current) {
          return;
        }
        setStepIndex((prev) => Math.min(prev + 1, guidedStepsLengthRef.current - 1));
      }, 1500);
    },
  });

  speakRef.current = speak;

  const speakAutoStep = useCallback((targetIndex: number) => {
    const requestId = autoSpeakRequestRef.current + 1;
    autoSpeakRequestRef.current = requestId;
    const currentGuidedStep = guidedStepsRef.current[targetIndex];
    if (!currentGuidedStep) {
      return;
    }
    const currentPrayerText = getRosaryStepPrayerText(
      currentGuidedStep.type,
      languageRef.current,
    );

    const mysteryAnnouncement = buildMysteryAnnouncement(
      targetIndex,
      languageRef.current,
    );

    const prayerAudioPromise = getPrayerAudioSource({
      prayerId: currentGuidedStep.type,
      language: languageRef.current,
    });

    const announcementAudioPromise = mysteryAnnouncement
      ? getPrayerAudioSource({
          prayerId: mysteryAnnouncement.id,
          language: languageRef.current,
        })
      : Promise.resolve(null);

    void Promise.all([announcementAudioPromise, prayerAudioPromise]).then(
      ([announcementAudioSource, prayerAudioSource]) => {
        if (
          !isAutoPlayingRef.current ||
          requestId !== autoSpeakRequestRef.current ||
          targetIndex !== stepIndexRef.current
        ) {
          return;
        }

        if (mysteryAnnouncement) {
          pendingPrayerAfterAnnouncementRef.current = {
            text: currentPrayerText,
            languageCode: languageCodeRef.current,
            audioUri: prayerAudioSource?.uri ?? null,
          };
          activeSpeakRequestRef.current = requestId;
          void speakRef.current(
            mysteryAnnouncement.text,
            languageCodeRef.current,
            {
              audioUri: announcementAudioSource?.uri ?? null,
            },
          );
          return;
        }

        pendingPrayerAfterAnnouncementRef.current = null;
        activeSpeakRequestRef.current = requestId;
        void speakRef.current(currentPrayerText, languageCodeRef.current, {
          audioUri: prayerAudioSource?.uri ?? null,
        });
      },
    );
  }, [buildMysteryAnnouncement]);

  const cancelCurrentSpeechFlow = useCallback(() => {
    autoSpeakRequestRef.current += 1;
    activeSpeakRequestRef.current = autoSpeakRequestRef.current;
    pendingPrayerAfterAnnouncementRef.current = null;
    stop();
  }, [stop]);

  // Speak whenever auto-play is on and step changes
  useEffect(() => {
    if (!isAutoPlaying) {
      activeSpeakRequestRef.current = autoSpeakRequestRef.current + 1;
      autoSpeakRequestRef.current = activeSpeakRequestRef.current;
      return;
    }
    speakAutoStep(stepIndexRef.current);
  }, [isAutoPlaying, speakAutoStep, stepIndex]);

  // Stop audio when mode/language changes
  useEffect(() => {
    cancelCurrentSpeechFlow();
  }, [cancelCurrentSpeechFlow, mode, language, selectedDevotion?.id]);

  const handleToggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      cancelCurrentSpeechFlow();
      setIsAutoPlaying(false);
    } else {
      setIsAutoPlaying(true);
    }
  }, [cancelCurrentSpeechFlow, isAutoPlaying]);

  const handleManualStepMove = useCallback((direction: 'prev' | 'next') => {
    cancelCurrentSpeechFlow();
    moveStep(direction);
  }, [cancelCurrentSpeechFlow, moveStep]);

  const handleRestartCurrentDevotion = useCallback(() => {
    cancelCurrentSpeechFlow();
    setStepIndex(0);
  }, [cancelCurrentSpeechFlow]);

  const handleRetryDevotionsSync = useCallback(() => {
    if (syncBusy) {
      return;
    }
    setSyncMessage(null);
    setMode('terco');
    setStepIndex(0);
    void syncDevotionsState(true);
  }, [syncBusy, syncDevotionsState]);

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
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Devoção</Text>
          <View style={styles.buttonRow}>
            {availableDevotions.map((devotion) => {
              const isSelected = devotion.id === selectedDevotion?.id;
              return (
                <Pressable
                  key={devotion.id}
                  style={[
                    styles.chip,
                    {
                      borderColor: isSelected ? theme.secondary : theme.border,
                      backgroundColor: isSelected ? 'rgba(218, 139, 60, 0.15)' : theme.surface,
                    },
                  ]}
                  onPress={() => {
                    setDevotionId(devotion.id);
                    setStepIndex(0);
                  }}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
                    {devotion.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Modo</Text>
          {isRosaryDevotion ? (
            <>
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
            </>
          ) : (
            <Text style={[styles.subtitle, { color: theme.secondary }]}>
              Sequência completa da devoção selecionada.
            </Text>
          )}

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
                  opacity: mode === 'terco' || !isRosaryDevotion ? 0.4 : 1,
                },
              ]}
              onPress={() => {
                setMode('terco');
                setStepIndex(0);
              }}
              disabled={mode === 'terco' || !isRosaryDevotion}
            >
              <Text style={[styles.chipText, { color: theme.primary }]}>Terço de hoje</Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: theme.secondary }]}>{renderModeSummary()}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[
                styles.chip,
                {
                  borderColor: theme.secondary,
                  backgroundColor: 'rgba(218, 139, 60, 0.15)',
                  opacity: downloadBusy ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                void handleDownloadCurrentDevotion();
              }}
              disabled={downloadBusy}
            >
              <Text style={[styles.chipText, { color: theme.secondary }]}>
                Baixar offline ({devotionLanguageLabels[language]})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.chip,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: downloadBusy ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                void handleClearDownloadedAudio();
              }}
              disabled={downloadBusy}
            >
              <Text style={[styles.chipText, { color: theme.textSoft }]}>Limpar offline</Text>
            </Pressable>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>
            Offline salvo: {downloadMeta.count} arquivos ({formatBytes(downloadMeta.bytes)}).
          </Text>
          {downloadMessage ? (
            <Text style={[styles.subtitle, { color: theme.secondary }]}>{downloadMessage}</Text>
          ) : null}
        </View>

        <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Etapa {stepIndex + 1} de {guidedSteps.length}</Text>
          <View style={[styles.progressTrack, { borderColor: theme.border, backgroundColor: theme.bg }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.secondary, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>{Math.round(progress)}% concluído</Text>
        </View>

        {currentStep ? (
          <View style={[styles.card, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.08)' }]}>
            <Text style={[styles.stepTitle, { color: theme.primary }]}>{currentStep.label}</Text>
            <Text style={[styles.mysteryText, { color: theme.secondary }]}>
              {isRosaryDevotion
                ? getRosarySegmentLabel(
                  mode,
                  currentStep.mysteryKey,
                  currentStep.segmentIndex,
                  currentStep.segmentTotal,
                )
                : selectedDevotion?.title ?? 'Devoção'}
            </Text>
            {!!currentStep.mysteryTitle && isRosaryDevotion && (
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
                onPress={() => handleManualStepMove('prev')}
                disabled={stepIndex === 0}
              >
                <MaterialCommunityIcons name="chevron-left" size={16} color={stepIndex === 0 ? theme.textSoft : theme.primary} />
                <Text style={[styles.actionButtonText, { color: stepIndex === 0 ? theme.textSoft : theme.primary }]}>Anterior</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.15)' }]}
                onPress={() => handleManualStepMove('next')}
                disabled={stepIndex >= guidedSteps.length - 1}
              >
                <Text style={[styles.actionButtonText, { color: stepIndex >= guidedSteps.length - 1 ? theme.textSoft : theme.secondary }]}>Próxima oração</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={stepIndex >= guidedSteps.length - 1 ? theme.textSoft : theme.secondary} />
              </Pressable>

              <Pressable
                style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface, opacity: stepIndex === 0 ? 0.4 : 1 }]}
                onPress={handleRestartCurrentDevotion}
                disabled={stepIndex === 0}
              >
                <MaterialCommunityIcons name="refresh" size={16} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.primary }]}>Recomeçar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              Estrutura da devoção ainda não carregada.
            </Text>
            {syncMessage ? (
              <Text style={[styles.subtitle, { color: theme.secondary }]}>
                {syncMessage}
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              <Pressable
                style={[
                  styles.chip,
                  {
                    borderColor: theme.secondary,
                    backgroundColor: 'rgba(218, 139, 60, 0.15)',
                    opacity: syncBusy ? 0.6 : 1,
                  },
                ]}
                onPress={handleRetryDevotionsSync}
                disabled={syncBusy}
              >
                <Text style={[styles.chipText, { color: theme.secondary }]}>
                  {syncBusy ? 'Sincronizando...' : 'Recarregar devoções'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {isRosaryDevotion && mode === 'terco' ? (
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
        ) : isRosaryDevotion ? (
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
        ) : (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.subtitle, { color: theme.primary }]}>Sequência da devoção</Text>
            {guidedSteps.map((step, index) => {
              const isCurrent = currentStep?.id === step.id;
              return (
                <View
                  key={step.id}
                  style={[
                    styles.mysteryItem,
                    {
                      borderColor: isCurrent ? theme.secondary : theme.border,
                      backgroundColor: isCurrent ? 'rgba(218, 139, 60, 0.12)' : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.mysteryItemText, { color: isCurrent ? theme.text : theme.textSoft }]}>
                    <Text style={{ fontWeight: '800' }}>{index + 1}. </Text>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {isRosaryDevotion ? (
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
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
