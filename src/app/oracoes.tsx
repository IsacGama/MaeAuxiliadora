import { useCallback, useMemo, useState } from 'react';
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
import {
  devotionLanguageLabels,
  getPrayerTextByLanguage,
  prayers,
  type DevotionLanguage,
  type PrayerRecord,
} from '../mobile/devotions';

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

  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState<DevotionLanguage>('pt');
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});

  // Active prayer being read aloud (only one at a time)
  const [speakingPrayerId, setSpeakingPrayerId] = useState<string | null>(null);

  // Latin TTS: use Italian (closest phonetically to ecclesiastical Latin)
  const languageCode = language === 'pt' ? 'pt-BR' : 'it-IT';

  const { isSpeaking, speak, stop, rate, setRate } = useSpeech();

  const filteredPrayers = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return prayers;
    return prayers.filter((prayer) => {
      const text = `${prayer.title} ${prayer.text.pt} ${prayer.text.la}`;
      return normalize(text).includes(normalizedQuery);
    });
  }, [query]);

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

  const handleToggleSpeech = useCallback((prayer: PrayerRecord) => {
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
    speak(text, languageCode);
  }, [speakingPrayerId, stop, language, languageCode, speak]);

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
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
            </Pressable>

            <Text style={[styles.title, { color: theme.primary }]}>Orações</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              Busque e reze no idioma de sua preferência. Toque no título para expandir.
            </Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar oração"
              placeholderTextColor={theme.textSoft}
              style={[styles.searchInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
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
                        { color: isSelected ? theme.secondary : theme.textSoft },
                      ]}
                    >
                      {devotionLanguageLabels[nextLanguage]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.textSoft }]}>Nenhuma oração encontrada para a busca.</Text>
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
                  <Text style={[styles.cardTitle, { color: theme.primary }]}>{item.title}</Text>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.textSoft}
                />
              </Pressable>

              {/* Prayer text */}
              <Text style={[isExpanded ? styles.prayerText : styles.compactText, { color: theme.text }]}>
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
                    onPress={() => handleToggleSpeech(item)}
                  >
                    <MaterialCommunityIcons
                      name={isThisSpeaking ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={17}
                      color={theme.secondary}
                    />
                    <Text style={[styles.playButtonText, { color: theme.secondary }]}>
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
                        <Text style={[styles.rateChipText, { color: isSelected ? theme.secondary : theme.textSoft }]}>
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
