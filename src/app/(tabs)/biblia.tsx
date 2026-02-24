import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { createTheme } from '../../mobile/theme';

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

const bibleJson = require('../../data/biblia.json') as BibleJson;
const books: Book[] = [
  ...bibleJson.antigoTestamento.map((book) => ({ ...book, testamento: 'AT' as const })),
  ...bibleJson.novoTestamento.map((book) => ({ ...book, testamento: 'NT' as const })),
];

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
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
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
});

const searchInBible = (query: string): SearchResult[] => {
  const term = query.trim().toLocaleLowerCase();
  if (term.length < 3) {
    return [];
  }

  const found: SearchResult[] = [];

  for (const book of books) {
    for (const chapter of book.capitulos) {
      for (const verse of chapter.versiculos) {
        if (!verse.texto.toLocaleLowerCase().includes(term)) {
          continue;
        }

        found.push({
          referencia: `${book.nome} ${chapter.capitulo},${verse.versiculo}`,
          texto: verse.texto,
        });

        if (found.length >= 80) {
          return found;
        }
      }
    }
  }

  return found;
};

export default function BibleScreen() {
  const org = useOrgContext();
  const theme = useMemo(() => createTheme(org.branding), [org.branding]);

  const [query, setQuery] = useState('');
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [selectedChapter, setSelectedChapter] = useState(1);

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

  const chapterData =
    availableChapters.find((chapter) => chapter.capitulo === selectedChapter) ?? availableChapters[0];

  const searchResults = useMemo(() => searchInBible(query), [query]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}> 
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.text }]}>Bíblia Sagrada</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>Busca local e leitura offline completa</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar trecho (mínimo 3 letras)"
            placeholderTextColor={theme.textSoft}
            style={[styles.searchInput, { borderColor: theme.border, color: theme.text }]}
          />
        </View>

        {query.trim().length >= 3 ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              {searchResults.length} resultado(s) para "{query.trim()}"
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
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>Livro</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {books.map((book, index) => {
                  const active = selectedBookIndex === index;
                  return (
                    <Pressable
                      key={`${book.nome}-${index}`}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? theme.secondary : theme.border,
                          backgroundColor: active ? 'rgba(218, 139, 60, 0.15)' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSelectedBookIndex(index);
                        setSelectedChapter(1);
                      }}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.secondary : theme.text }]}> 
                        {book.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>Capítulo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {availableChapters.map((chapter) => {
                  const active = chapter.capitulo === selectedChapter;
                  return (
                    <Pressable
                      key={`${selectedBook.nome}-${chapter.capitulo}`}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? theme.secondary : theme.border,
                          backgroundColor: active ? 'rgba(218, 139, 60, 0.15)' : 'transparent',
                        },
                      ]}
                      onPress={() => setSelectedChapter(chapter.capitulo)}
                    >
                      <Text style={[styles.chipText, { color: active ? theme.secondary : theme.text }]}>
                        {chapter.capitulo}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.title, { color: theme.text }]}>{selectedBook?.nome} {selectedChapter}</Text>
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
    </View>
  );
}
