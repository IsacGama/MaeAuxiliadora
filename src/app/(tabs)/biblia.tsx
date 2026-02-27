import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { createThemeWithMode } from '../../mobile/theme';
import { useThemePreference } from '../../mobile/theme-preference';

type Verse = { versiculo: number; texto: string };
type Chapter = { capitulo: number; versiculos: Verse[] };
type Book = { nome: string; capitulos: Chapter[]; testamento: 'AT' | 'NT' };
type BibleJson = {
  antigoTestamento: Array<{ nome: string; capitulos: Chapter[] }>;
  novoTestamento: Array<{ nome: string; capitulos: Chapter[] }>;
};

type SearchResult = {
  referencia: string;
  texto: string;
};

type SearchChunk = {
  results: SearchResult[];
  nextCursor: number;
  hasMore: boolean;
};

type IndexedVerse = SearchResult & {
  searchableText: string;
};

const bibleJson = require('../../data/biblia.json') as BibleJson;
const books: Book[] = [
  ...bibleJson.antigoTestamento.map((book) => ({ ...book, testamento: 'AT' as const })),
  ...bibleJson.novoTestamento.map((book) => ({ ...book, testamento: 'NT' as const })),
];

const SEARCH_PAGE_SIZE = 80;
const SEARCH_LOAD_AHEAD_PX = 240;

const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

const indexedVerses: IndexedVerse[] = (() => {
  const output: IndexedVerse[] = [];

  for (const book of books) {
    for (const chapter of book.capitulos) {
      for (const verse of chapter.versiculos) {
        output.push({
          referencia: `${book.nome} ${chapter.capitulo},${verse.versiculo}`,
          texto: verse.texto,
          searchableText: normalizeForSearch(verse.texto),
        });
      }
    }
  }

  return output;
})();

const loadSearchChunk = (
  normalizedQuery: string,
  startCursor: number,
  pageSize: number = SEARCH_PAGE_SIZE,
): SearchChunk => {
  if (normalizedQuery.length < 3) {
    return { results: [], nextCursor: 0, hasMore: false };
  }

  const results: SearchResult[] = [];
  let cursor = Math.max(startCursor, 0);

  for (; cursor < indexedVerses.length; cursor++) {
    const verse = indexedVerses[cursor];
    if (!verse.searchableText.includes(normalizedQuery)) {
      continue;
    }

    if (results.length < pageSize) {
      results.push({ referencia: verse.referencia, texto: verse.texto });
      continue;
    }

    return { results, nextCursor: cursor, hasMore: true };
  }

  return { results, nextCursor: indexedVerses.length, hasMore: false };
};

const getTestamentLabel = (testament: 'AT' | 'NT') =>
  testament === 'AT' ? 'Antigo Testamento' : 'Novo Testamento';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 26,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  selectTrigger: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectTriggerTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectTriggerLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectTriggerHint: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 9,
  },
  modalList: {
    maxHeight: 360,
  },
  modalOption: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 3,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOptionSubtitle: {
    fontSize: 12,
  },
  verseCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  verseRef: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  verseText: {
    fontSize: 14,
    lineHeight: 21,
  },
  loadMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  loadMoreText: {
    fontSize: 12,
  },
});

export default function BibleScreen() {
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const [query, setQuery] = useState('');
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [bookQuery, setBookQuery] = useState('');
  const [chapterQuery, setChapterQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchCursor, setSearchCursor] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const searchLoadingRef = useRef(false);

  const normalizedQuery = useMemo(() => normalizeForSearch(query), [query]);
  const isSearchMode = normalizedQuery.length >= 3;

  const selectedBook = books[selectedBookIndex] ?? books[0];
  const availableChapters = selectedBook?.capitulos ?? [];

  useEffect(() => {
    if (!availableChapters.length) {
      setSelectedChapter(1);
      return;
    }

    if (!availableChapters.find((chapter) => chapter.capitulo === selectedChapter)) {
      setSelectedChapter(availableChapters[0].capitulo);
    }
  }, [availableChapters, selectedChapter]);

  useEffect(() => {
    setChapterPickerOpen(false);
    setChapterQuery('');
  }, [selectedBookIndex]);

  const chapterData =
    availableChapters.find((chapter) => chapter.capitulo === selectedChapter) ?? availableChapters[0];

  const filteredBooks = useMemo(() => {
    const term = normalizeForSearch(bookQuery);
    const withIndex = books.map((book, index) => ({ book, index }));

    if (!term) {
      return withIndex;
    }

    return withIndex.filter(({ book }) => {
      const name = normalizeForSearch(book.nome);
      const testament = normalizeForSearch(getTestamentLabel(book.testamento));
      return name.includes(term) || testament.includes(term);
    });
  }, [bookQuery]);

  const filteredChapters = useMemo(() => {
    const term = chapterQuery.trim();
    if (!term) {
      return availableChapters;
    }

    return availableChapters.filter((chapter) => String(chapter.capitulo).includes(term));
  }, [availableChapters, chapterQuery]);

  useEffect(() => {
    searchLoadingRef.current = false;
    setSearchLoadingMore(false);

    if (!isSearchMode) {
      setSearchResults([]);
      setSearchCursor(0);
      setSearchHasMore(false);
      return;
    }

    const firstChunk = loadSearchChunk(normalizedQuery, 0);
    setSearchResults(firstChunk.results);
    setSearchCursor(firstChunk.nextCursor);
    setSearchHasMore(firstChunk.hasMore);
  }, [isSearchMode, normalizedQuery]);

  const loadMoreSearchResults = useCallback(() => {
    if (!isSearchMode || !searchHasMore || searchLoadingRef.current) {
      return;
    }

    searchLoadingRef.current = true;
    setSearchLoadingMore(true);

    const nextChunk = loadSearchChunk(normalizedQuery, searchCursor);
    setSearchResults((prev) => [...prev, ...nextChunk.results]);
    setSearchCursor(nextChunk.nextCursor);
    setSearchHasMore(nextChunk.hasMore);
    setSearchLoadingMore(false);
    searchLoadingRef.current = false;
  }, [isSearchMode, normalizedQuery, searchCursor, searchHasMore]);

  const onScrollContent = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isSearchMode || !searchHasMore) {
        return;
      }

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (distanceFromBottom <= SEARCH_LOAD_AHEAD_PX) {
        loadMoreSearchResults();
      }
    },
    [isSearchMode, loadMoreSearchResults, searchHasMore],
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 26 + tabBarHeight }]}
        onScroll={onScrollContent}
        scrollEventThrottle={16}
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.primary }]}>Bíblia Sagrada</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Busca local e leitura offline completa</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar trecho (mínimo 3 letras)"
            placeholderTextColor={theme.textSoft}
            style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
          />
        </View>

        {isSearchMode ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              {searchResults.length}
              {searchHasMore ? '+' : ''} resultado(s) para "{query.trim()}"
            </Text>
            {searchResults.map((result, index) => (
              <View key={`${result.referencia}-${index}`} style={[styles.verseCard, { borderColor: theme.border }]}> 
                <Text style={[styles.verseRef, { color: theme.secondary }]}>{result.referencia}</Text>
                <Text style={[styles.verseText, { color: theme.text }]}>{result.texto}</Text>
              </View>
            ))}
            {searchResults.length === 0 && (
              <Text style={{ color: theme.textSoft }}>Nenhum resultado encontrado.</Text>
            )}
            {searchHasMore && (
              <View style={styles.loadMoreRow}>
                {searchLoadingMore ? (
                  <ActivityIndicator size="small" color={theme.secondary} />
                ) : (
                  <MaterialCommunityIcons name="arrow-down" size={16} color={theme.textSoft} />
                )}
                <Text style={[styles.loadMoreText, { color: theme.textSoft }]}>
                  {searchLoadingMore ? 'Carregando mais resultados...' : 'Role até o fim para carregar mais resultados'}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.subtitle, { color: theme.secondary }]}>Livro</Text>
              <Pressable
                style={[styles.selectTrigger, { borderColor: theme.border }]}
                onPress={() => {
                  setBookQuery('');
                  setBookPickerOpen(true);
                }}
              >
                <View style={styles.selectTriggerTextWrap}>
                  <Text style={[styles.selectTriggerLabel, { color: theme.primary }]} numberOfLines={1}>
                    {selectedBook?.nome}
                  </Text>
                  <Text style={[styles.selectTriggerHint, { color: theme.textSoft }]} numberOfLines={1}>
                    {getTestamentLabel(selectedBook?.testamento ?? 'AT')}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.subtitle, { color: theme.secondary }]}>Capítulo</Text>
              <Pressable
                style={[styles.selectTrigger, { borderColor: theme.border }]}
                onPress={() => {
                  setChapterQuery('');
                  setChapterPickerOpen(true);
                }}
              >
                <View style={styles.selectTriggerTextWrap}>
                  <Text style={[styles.selectTriggerLabel, { color: theme.primary }]} numberOfLines={1}>
                    Capítulo {selectedChapter}
                  </Text>
                  <Text style={[styles.selectTriggerHint, { color: theme.textSoft }]} numberOfLines={1}>
                    {availableChapters.length} capítulo(s) disponível(is)
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.title, { color: theme.primary }]}>{selectedBook?.nome} {selectedChapter}</Text>
              {chapterData?.versiculos.map((verse) => (
                <View key={`${selectedBook?.nome}-${selectedChapter}-${verse.versiculo}`} style={[styles.verseCard, { borderColor: theme.border }]}> 
                  <Text style={[styles.verseRef, { color: theme.secondary }]}>v.{verse.versiculo}</Text>
                  <Text style={[styles.verseText, { color: theme.text }]}>{verse.texto}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={bookPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBookPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBookPickerOpen(false)} />
          <View style={[styles.modalPanel, { backgroundColor: theme.surfaceOpaque, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Escolher livro</Text>
              <Pressable
                style={[styles.modalCloseButton, { borderColor: theme.border }]}
                onPress={() => setBookPickerOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
              </Pressable>
            </View>

            <View style={[styles.modalSearchRow, { borderColor: theme.border }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={theme.textSoft} />
              <TextInput
                value={bookQuery}
                onChangeText={setBookQuery}
                placeholder="Buscar livro ou testamento"
                placeholderTextColor={theme.textSoft}
                style={[styles.modalSearchInput, { color: theme.text }]}
              />
            </View>

            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredBooks.length ? (
                filteredBooks.map(({ book, index }) => (
                  <Pressable
                    key={`${book.nome}-${index}`}
                    style={[
                      styles.modalOption,
                      {
                        borderColor: theme.border,
                        backgroundColor: selectedBookIndex === index ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSelectedBookIndex(index);
                      setSelectedChapter(book.capitulos[0]?.capitulo ?? 1);
                      setBookPickerOpen(false);
                      setBookQuery('');
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionTitle,
                        { color: theme.text, fontWeight: selectedBookIndex === index ? '800' : '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {book.nome}
                    </Text>
                    <Text style={[styles.modalOptionSubtitle, { color: theme.textSoft }]}>
                      {getTestamentLabel(book.testamento)}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                  Nenhum livro encontrado para "{bookQuery.trim()}".
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={chapterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setChapterPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setChapterPickerOpen(false)} />
          <View style={[styles.modalPanel, { backgroundColor: theme.surfaceOpaque, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Escolher capítulo</Text>
              <Pressable
                style={[styles.modalCloseButton, { borderColor: theme.border }]}
                onPress={() => setChapterPickerOpen(false)}
              >
                <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
              </Pressable>
            </View>

            <View style={[styles.modalSearchRow, { borderColor: theme.border }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={theme.textSoft} />
              <TextInput
                value={chapterQuery}
                onChangeText={setChapterQuery}
                keyboardType="number-pad"
                placeholder="Buscar número do capítulo"
                placeholderTextColor={theme.textSoft}
                style={[styles.modalSearchInput, { color: theme.text }]}
              />
            </View>

            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredChapters.length ? (
                filteredChapters.map((chapter) => (
                  <Pressable
                    key={`${selectedBook?.nome}-${chapter.capitulo}`}
                    style={[
                      styles.modalOption,
                      {
                        borderColor: theme.border,
                        backgroundColor:
                          selectedChapter === chapter.capitulo ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setSelectedChapter(chapter.capitulo);
                      setChapterPickerOpen(false);
                      setChapterQuery('');
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionTitle,
                        { color: theme.text, fontWeight: selectedChapter === chapter.capitulo ? '800' : '700' },
                      ]}
                    >
                      Capítulo {chapter.capitulo}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                  Nenhum capítulo encontrado para "{chapterQuery.trim()}".
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
