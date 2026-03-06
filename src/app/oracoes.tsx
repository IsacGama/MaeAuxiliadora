import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOrgContext } from '../mobile/hooks/use-org-context';
import { useSpeech, speechRateLabels, type SpeechRate } from '../mobile/hooks/use-speech';
import { useAppTheme, withAlpha } from '../mobile/theme';
import { scaleFont, useFontScalePreference } from '../mobile/font-scale-preference';
import {
  devotionLanguageLabels,
  getPrayerTextByLanguage,
  prayers,
  syncDevotionsFromBackend,
  type DevotionLanguage,
  type PrayerRecord,
} from '../mobile/devotions';
import {
  clearDownloadedPrayerAudios,
  downloadPrayerAudioEntries,
  getDownloadedPrayerAudioStats,
  getPrayerAudioSource,
} from '../mobile/devotion-audio';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12,
  },
  headerCard: {
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
    lineHeight: 20,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  prayerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  compactText: {
    fontSize: 14,
    lineHeight: 22,
  },
  // TTS controls inline
  ttsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    marginTop: 4,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rateChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 22,
  },
  downloadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  downloadButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadMetaText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

const iconByPrayer = (prayer: PrayerRecord): keyof typeof MaterialCommunityIcons.glyphMap => {
  if (prayer.id.includes('pai-nosso') || prayer.id.includes('santo')) return 'hands-pray';
  if (prayer.id.includes('ave') || prayer.id.includes('rainha')) return 'heart-outline';
  if (prayer.id.includes('miguel') || prayer.id.includes('bento')) return 'shield-cross-outline';
  if (prayer.id.includes('estudo') || prayer.id.includes('trabalho')) return 'book-open-page-variant-outline';
  if (prayer.id.includes('carlo')) return 'laptop';
  return 'cross';
};

export default function PrayersScreen() {
  const org = useOrgContext();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();

  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<DevotionLanguage>('pt');
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadMeta, setDownloadMeta] = useState<{ count: number; bytes: number }>({
    count: 0,
    bytes: 0,
  });
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [devotionsVersion, setDevotionsVersion] = useState(0);

  // Active prayer being read aloud (only one at a time)
  const [speakingPrayerId, setSpeakingPrayerId] = useState<string | null>(null);
  const scaled = useMemo(
    () => ({
      title: scaleFont(22, fontScale),
      subtitle: scaleFont(13, fontScale),
      subtitleLineHeight: scaleFont(20, fontScale),
      input: scaleFont(14, fontScale),
      languageButtonText: scaleFont(12, fontScale),
      cardTitle: scaleFont(17, fontScale),
      prayerText: scaleFont(14, fontScale),
      prayerLineHeight: scaleFont(22, fontScale),
      playButtonText: scaleFont(13, fontScale),
      rateChipText: scaleFont(12, fontScale),
      emptyText: scaleFont(14, fontScale),
      downloadButtonText: scaleFont(12, fontScale),
      downloadMetaText: scaleFont(12, fontScale),
      downloadMetaLineHeight: scaleFont(18, fontScale),
    }),
    [fontScale],
  );

  // Latin TTS: use Italian (closest phonetically to ecclesiastical Latin)
  const languageCode = language === 'pt' ? 'pt-BR' : 'it-IT';

  const { isSpeaking, speak, stop, rate, setRate } = useSpeech();

  const refreshDownloadStats = useCallback(async () => {
    const stats = await getDownloadedPrayerAudioStats();
    setDownloadMeta(stats);
  }, []);

  useEffect(() => {
    void refreshDownloadStats();
  }, [refreshDownloadStats]);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      await syncDevotionsFromBackend();
      if (active) {
        setDevotionsVersion((current) => current + 1);
      }
    };
    void sync();
    return () => {
      active = false;
    };
  }, []);

  const filteredPrayers = useMemo(() => {
    const normalizedQuery = normalize(query);
    return prayers.filter((prayer) => {
      if (language === 'la' && !prayer.text.la?.trim()) return false;
      if (!normalizedQuery) return true;
      const text = `${prayer.title} ${prayer.text.pt} ${prayer.text.la}`;
      return normalize(text).includes(normalizedQuery);
    });
  }, [query, language, devotionsVersion]);

  const togglePrayer = (prayerId: string) => {
    setExpandedById((current) => ({
      ...current,
      [prayerId]: !current[prayerId],
    }));
    // Stop TTS if collapsing the currently speaking prayer
    if (speakingPrayerId === prayerId && expandedById[prayerId]) {
      stop();
      setSpeakingPrayerId(null);
    }
  };

  const handleToggleSpeech = useCallback(async (prayer: PrayerRecord) => {
    // If already speaking this prayer → stop
    if (speakingPrayerId === prayer.id) {
      stop();
      setSpeakingPrayerId(null);
      return;
    }
    // Otherwise start (or switch to) this prayer
    stop();
    const text = getPrayerTextByLanguage(prayer, language);
    setSpeakingPrayerId(prayer.id);
    const source = await getPrayerAudioSource({
      prayerId: prayer.id,
      language,
    });
    await speak(text, languageCode, { audioUri: source?.uri ?? null });
  }, [speakingPrayerId, stop, language, languageCode, speak]);

  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const handleDownloadAudio = useCallback(async () => {
    if (downloadBusy) return;

    setDownloadBusy(true);
    setDownloadMessage('Iniciando download...');
    try {
      const result = await downloadPrayerAudioEntries({
        language,
        prayerIds: prayers.map((prayer) => prayer.id),
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
  }, [downloadBusy, language, refreshDownloadStats]);

  const handleClearAudio = useCallback(async () => {
    if (downloadBusy) return;

    setDownloadBusy(true);
    try {
      await clearDownloadedPrayerAudios();
      await refreshDownloadStats();
      setDownloadMessage('Áudios offline removidos do dispositivo.');
    } finally {
      setDownloadBusy(false);
    }
  }, [downloadBusy, refreshDownloadStats]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filteredPrayers}
        extraData={{ expandedById, speakingPrayerId, rate }}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => undefined}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
        ListHeaderComponent={
          <View style={[styles.headerCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Pressable style={[styles.backButton, { borderColor: theme.border }]} onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.playButtonText }}>Voltar</Text>
            </Pressable>

            <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Orações</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              Busque e reze no idioma de sua preferência. Toque no título para expandir.
            </Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar oração"
              placeholderTextColor={theme.textSoft}
              style={[styles.searchInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            />

            {/* Language selector — controls both display and TTS language */}
            <View style={styles.languageRow}>
              {(Object.keys(devotionLanguageLabels) as DevotionLanguage[]).map((nextLanguage) => {
                const isSelected = nextLanguage === language;
                return (
                  <Pressable
                    key={nextLanguage}
                    style={[
                      styles.languageButton,
                      {
                        borderColor: isSelected ? theme.secondary : theme.border,
                        backgroundColor: isSelected ? withAlpha(theme.secondary, 0.15) : theme.surface,
                      },
                    ]}
                    onPress={() => {
                      stop();
                      setSpeakingPrayerId(null);
                      setLanguage(nextLanguage);
                    }}
                  >
                    <Text
                      style={[
                        styles.languageButtonText,
                        { color: isSelected ? theme.secondary : theme.textSoft, fontSize: scaled.languageButtonText },
                      ]}
                    >
                      {devotionLanguageLabels[nextLanguage]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.downloadRow}>
              <Pressable
                style={[
                  styles.downloadButton,
                  {
                    borderColor: theme.secondary,
                    backgroundColor: withAlpha(theme.secondary, 0.12),
                    opacity: downloadBusy ? 0.6 : 1,
                  },
                ]}
                onPress={() => {
                  void handleDownloadAudio();
                }}
                disabled={downloadBusy}
              >
                <MaterialCommunityIcons name="download-outline" size={16} color={theme.secondary} />
                <Text style={[styles.downloadButtonText, { color: theme.secondary, fontSize: scaled.downloadButtonText }]}>
                  Baixar offline ({devotionLanguageLabels[language]})
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.downloadButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    opacity: downloadBusy ? 0.6 : 1,
                  },
                ]}
                onPress={() => {
                  void handleClearAudio();
                }}
                disabled={downloadBusy}
              >
                <MaterialCommunityIcons name="delete-outline" size={16} color={theme.textSoft} />
                <Text style={[styles.downloadButtonText, { color: theme.textSoft, fontSize: scaled.downloadButtonText }]}>
                  Limpar offline
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.downloadMetaText, { color: theme.textSoft, fontSize: scaled.downloadMetaText, lineHeight: scaled.downloadMetaLineHeight }]}>
              Offline salvo: {downloadMeta.count} arquivos ({formatBytes(downloadMeta.bytes)}).
            </Text>
            {downloadMessage ? (
              <Text style={[styles.downloadMetaText, { color: theme.secondary, fontSize: scaled.downloadMetaText, lineHeight: scaled.downloadMetaLineHeight }]}>
                {downloadMessage}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textSoft, fontSize: scaled.emptyText }]}>Nenhuma oração encontrada para a busca.</Text>
        }
        renderItem={({ item }) => {
          const prayerText = getPrayerTextByLanguage(item, language);
          const isExpanded = !!expandedById[item.id];
          const isThisSpeaking = speakingPrayerId === item.id && isSpeaking;
          const compactText =
            prayerText.replace(/\s+/g, ' ').slice(0, 120) +
            (prayerText.length > 120 ? '...' : '');

          return (
            <View
              style={[
                styles.card,
                {
                  borderColor: isThisSpeaking ? withAlpha(theme.secondary, 0.5) : theme.border,
                  backgroundColor: isThisSpeaking ? withAlpha(theme.secondary, 0.07) : theme.surface,
                },
              ]}
            >
              {/* Header row — tap to expand/collapse */}
              <Pressable style={styles.cardTitleRow} onPress={() => togglePrayer(item.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <MaterialCommunityIcons name={iconByPrayer(item)} size={18} color={theme.secondary} />
                  <Text style={[styles.cardTitle, { color: theme.primary, fontSize: scaled.cardTitle }]}>{item.title}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.textSoft}
                />
              </Pressable>

              {/* Prayer text */}
              <Text
                style={[
                  isExpanded ? styles.prayerText : styles.compactText,
                  { color: theme.text, fontSize: scaled.prayerText, lineHeight: scaled.prayerLineHeight },
                ]}
              >
                {isExpanded ? prayerText : compactText}
              </Text>

              {/* Inline TTS controls — only visible when expanded */}
              {isExpanded && (
                <View style={[styles.ttsRow, { borderTopColor: theme.border }]}>
                  {/* Main play/stop button */}
                  <Pressable
                    style={[
                      styles.playButton,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: isThisSpeaking
                          ? withAlpha(theme.secondary, 0.15)
                          : withAlpha(theme.secondary, 0.08),
                      },
                    ]}
                    onPress={() => {
                      void handleToggleSpeech(item);
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isThisSpeaking ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={17}
                      color={theme.secondary}
                    />
                    <Text style={[styles.playButtonText, { color: theme.secondary, fontSize: scaled.playButtonText }]}>
                      {isThisSpeaking ? 'Parar' : 'Rezar comigo'}
                    </Text>
                  </Pressable>

                  {/* Speed chips */}
                  {(Object.keys(speechRateLabels) as string[]).map((key) => {
                    const r = Number(key) as SpeechRate;
                    const isSelected = rate === r;
                    return (
                      <Pressable
                        key={key}
                        style={[
                          styles.rateChip,
                          {
                            borderColor: isSelected ? theme.secondary : theme.border,
                            backgroundColor: isSelected
                              ? withAlpha(theme.secondary, 0.15)
                              : theme.surface,
                          },
                        ]}
                        onPress={() => setRate(r)}
                      >
                        <Text style={[styles.rateChipText, { color: isSelected ? theme.secondary : theme.textSoft, fontSize: scaled.rateChipText }]}>
                          {speechRateLabels[r]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
