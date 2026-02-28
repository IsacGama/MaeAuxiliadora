import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  guidedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  guidedButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 22,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    borderRadius: 99,
    borderWidth: 1,
    padding: 6,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: 18,
    gap: 16,
  },
  modalPrayerText: {
    fontSize: 15,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  ttsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  ttsButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rateChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rateChipText: {
    fontSize: 12,
    fontWeight: '700',
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
  const [guidedPrayer, setGuidedPrayer] = useState<PrayerRecord | null>(null);

  const languageCode = language === 'pt' ? 'pt-BR' : 'it-IT';
  const { isSpeaking, speak, stop, rate, setRate } = useSpeech();

  const filteredPrayers = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return prayers;
    }

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
  };

  const openGuided = useCallback((prayer: PrayerRecord) => {
    stop();
    setGuidedPrayer(prayer);
  }, [stop]);

  const closeGuided = useCallback(() => {
    stop();
    setGuidedPrayer(null);
  }, [stop]);

  const handleToggleSpeech = useCallback(() => {
    if (!guidedPrayer) return;
    const text = getPrayerTextByLanguage(guidedPrayer, language);
    if (isSpeaking) {
      stop();
    } else {
      speak(text, languageCode);
    }
  }, [guidedPrayer, isSpeaking, language, languageCode, speak, stop]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filteredPrayers}
        extraData={expandedById}
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
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>Busque, leia e reze no idioma de sua preferência.</Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar oração"
              placeholderTextColor={theme.textSoft}
              style={[styles.searchInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
            />

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
                    onPress={() => setLanguage(nextLanguage)}
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
          const compactText =
            prayerText.replace(/\s+/g, ' ').slice(0, 120) +
            (prayerText.length > 120 ? '...' : '');

          return (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <Pressable style={[styles.cardTitleRow, { justifyContent: 'space-between' }]} onPress={() => togglePrayer(item.id)}>
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
              {isExpanded && (
                <>
                  <Text style={[styles.prayerText, { color: theme.text }]}>{prayerText}</Text>
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={[
                        styles.guidedButton,
                        {
                          borderColor: theme.secondary,
                          backgroundColor: withAlpha(theme.secondary, 0.14),
                        },
                      ]}
                      onPress={() => openGuided(item)}
                    >
                      <MaterialCommunityIcons name="play-circle-outline" size={16} color={theme.secondary} />
                      <Text style={[styles.guidedButtonText, { color: theme.secondary }]}>Rezar comigo</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {!isExpanded && (
                <Text style={[styles.prayerText, { color: theme.text }]}>{compactText}</Text>
              )}
            </View>
          );
        }}
      />

      {/* Guided Prayer Bottom Sheet Modal */}
      <Modal
        visible={!!guidedPrayer}
        transparent
        animationType="slide"
        onRequestClose={closeGuided}
      >
        <Pressable style={styles.modalOverlay} onPress={closeGuided}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalLabel, { color: theme.secondary }]}>Rezando comigo</Text>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>{guidedPrayer?.title}</Text>
              </View>
              <Pressable
                style={[styles.closeButton, { borderColor: theme.border }]}
                onPress={closeGuided}
              >
                <MaterialCommunityIcons name="close" size={20} color={theme.textSoft} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Prayer text */}
              <Text style={[styles.modalPrayerText, { color: theme.text }]}>
                {guidedPrayer ? getPrayerTextByLanguage(guidedPrayer, language) : ''}
              </Text>

              {/* Divider */}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* TTS controls */}
              <View style={styles.ttsRow}>
                <Pressable
                  style={[
                    styles.ttsButton,
                    {
                      borderColor: isSpeaking ? theme.secondary : theme.border,
                      backgroundColor: isSpeaking ? withAlpha(theme.secondary, 0.15) : withAlpha(theme.secondary, 0.06),
                    },
                  ]}
                  onPress={handleToggleSpeech}
                >
                  <MaterialCommunityIcons
                    name={isSpeaking ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={18}
                    color={theme.secondary}
                  />
                  <Text style={[styles.ttsButtonText, { color: theme.secondary }]}>
                    {isSpeaking ? 'Parar leitura' : 'Rezar em voz alta'}
                  </Text>
                </Pressable>

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
                          backgroundColor: isSelected ? withAlpha(theme.secondary, 0.15) : theme.surface,
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
