import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { publicApi } from '../../mobile/api';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { createThemeWithMode } from '../../mobile/theme';
import { useThemePreference } from '../../mobile/theme-preference';
import { PublicContentBlock, PublicPostDetail } from '../../mobile/types';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
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
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
  },
  blockText: {
    fontSize: 15,
    lineHeight: 23,
  },
  headingBlock: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 29,
  },
  quoteBlock: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 23,
  },
  blockImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    opacity: 0.35,
    marginVertical: 4,
  },
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const stripHtml = (html?: string) => {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('http://')) return `https://${trimmed.slice(7)}`;
  return trimmed;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const renderBlockText = (block: PublicContentBlock) => {
  const data = asRecord(block.data) ?? {};

  if (block.type === 'HEADING') {
    return stripHtml(asString(data.text));
  }
  if (block.type === 'RICH_TEXT') {
    return stripHtml(asString(data.html));
  }
  if (block.type === 'QUOTE') {
    return stripHtml(asString(data.text));
  }

  return '';
};

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const parishId =
    org.entity?.type === 'PARISH'
      ? org.entity.id
      : org.entity?.type === 'CHAPEL'
        ? org.entity.parishId ?? undefined
        : undefined;

  const [post, setPost] = useState<PublicPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof slug !== 'string' || !slug.trim()) {
      setError('Post inválido.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await publicApi.fetchPublicPostBySlug(slug, parishId);
        if (cancelled) return;
        setPost(result);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Não foi possível carregar o post.';
        setError(message);
        setPost(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [parishId, slug]);

  const latestVersion = post?.versions?.[0];
  const blocks = (latestVersion?.blocks ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={16}
              color={theme.secondary}
            />
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text }]}>
            {post?.title ?? 'Notícia'}
          </Text>

          {!!post?.publishedAt && (
            <Text style={[styles.meta, { color: theme.textSoft }]}>
              Publicado em {formatDateTime(post.publishedAt)}
            </Text>
          )}
        </View>

        {isLoading ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                alignItems: 'center',
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={{ color: theme.textSoft }}>Carregando conteúdo...</Text>
          </View>
        ) : null}

        {!!error && !isLoading ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: '#FCA5A5' }}>{error}</Text>
          </View>
        ) : null}

        {!!latestVersion?.summary && !isLoading ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              {stripHtml(latestVersion.summary ?? '')}
            </Text>
          </View>
        ) : null}

        {!isLoading && !!post && blocks.length === 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              Este post ainda não possui blocos de conteúdo no aplicativo.
            </Text>
          </View>
        ) : null}

        {!isLoading && !!post
          ? blocks.map((block, index) => {
              const data = asRecord(block.data) ?? {};
              const imageUrl = normalizeUrl(asString(data.url));
              const blockText = renderBlockText(block);

              if (block.type === 'DIVIDER') {
                return (
                  <View
                    key={block.id || `${block.type}-${index}`}
                    style={[
                      styles.divider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                );
              }

              if (block.type === 'IMAGE' && imageUrl) {
                return (
                  <View
                    key={block.id || `${block.type}-${index}`}
                    style={[
                      styles.card,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={[
                        styles.blockImage,
                        { borderColor: theme.border, backgroundColor: theme.bg },
                      ]}
                      resizeMode="cover"
                    />
                    {!!asString(data.caption) && (
                      <Text style={[styles.meta, { color: theme.textSoft }]}>
                        {asString(data.caption)}
                      </Text>
                    )}
                  </View>
                );
              }

              if (block.type === 'BUTTON') {
                const url = normalizeUrl(asString(data.url));
                const label = asString(data.label) ?? 'Abrir link';
                if (!url) {
                  return null;
                }

                return (
                  <View
                    key={block.id || `${block.type}-${index}`}
                    style={[
                      styles.card,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                  >
                    <Pressable
                      style={[styles.actionButton, { borderColor: theme.secondary }]}
                      onPress={() => {
                        void Linking.openURL(url).catch(() => undefined);
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: theme.secondary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              if (!blockText) {
                return null;
              }

              return (
                <View
                  key={block.id || `${block.type}-${index}`}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      block.type === 'HEADING'
                        ? styles.headingBlock
                        : block.type === 'QUOTE'
                          ? styles.quoteBlock
                          : styles.blockText,
                      {
                        color: theme.text,
                        borderLeftColor:
                          block.type === 'QUOTE' ? theme.secondary : undefined,
                      },
                    ]}
                  >
                    {blockText}
                  </Text>
                </View>
              );
            })
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}
