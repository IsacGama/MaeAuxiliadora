import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { publicApi } from '../../mobile/api';
import { scaleFont, useFontScalePreference } from '../../mobile/font-scale-preference';
import { getMediaUrl } from '../../mobile/media';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useAppTheme, type AppTheme } from '../../mobile/theme';
import { PublicContentBlock, PublicPostDetail } from '../../mobile/types';

type Theme = AppTheme;

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
  // Lightbox
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 8,
  },
  // Gallery
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const resolveUrl = (value?: string) => {
  if (!value) return undefined;
  const t = value.trim();
  if (!t) return undefined;
  if (t.startsWith('//')) return `https:${t}`;
  if (t.startsWith('http://')) return `https://${t.slice(7)}`;
  return t;
};

const extractEmbedUrl = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined;
  const iframeSrc = value.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*><\/iframe>/i)?.[1];
  const raw = iframeSrc ?? value;
  const resolved = resolveUrl(raw);
  if (!resolved) return undefined;
  try {
    const url = new URL(resolved);
    const host = url.hostname.toLowerCase();
    // YouTube — use youtube-nocookie.com to avoid error 153 in WebView contexts
    if (host === 'youtu.be') {
      const id = url.pathname.replace('/', '').trim();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : undefined;
    }
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const embedPath = url.pathname.startsWith('/embed/')
        ? url.pathname.split('/embed/')[1]?.split('/')[0]
        : url.searchParams.get('v')?.trim();
      return embedPath ? `https://www.youtube-nocookie.com/embed/${embedPath}` : undefined;
    }
    // Vimeo
    if (host.includes('vimeo.com') && !host.startsWith('player.')) {
      const id = url.pathname.split('/').filter(Boolean).at(-1);
      return id ? `https://player.vimeo.com/video/${id}` : undefined;
    }
    if (host.startsWith('player.vimeo.com')) {
      return resolved;
    }
  } catch {
    // fall through
  }
  return resolved;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
};

const renderBlockText = (block: PublicContentBlock) => {
  const data = asRecord(block.data) ?? {};
  if (block.type === 'HEADING') return stripHtml(asString(data.text));
  if (block.type === 'RICH_TEXT') return stripHtml(asString(data.html));
  if (block.type === 'QUOTE') return stripHtml(asString(data.text));
  return '';
};

// ---------------------------------------------------------------------------
// Lightbox modal
// ---------------------------------------------------------------------------

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <Pressable style={styles.lightboxBackdrop} onPress={onClose}>
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '80%' }}
          resizeMode="contain"
        />
        <Pressable style={styles.lightboxClose} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={22} color="#fff" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Single image block
// ---------------------------------------------------------------------------

function PostImageBlock({
  url,
  caption,
  theme,
}: {
  url: string;
  caption?: string;
  theme: Theme;
}) {
  const [lightbox, setLightbox] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Pressable onPress={() => setLightbox(true)}>
        <Image
          source={{ uri: url }}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: theme.bg }}
          resizeMode="contain"
        />
      </Pressable>
      {!!caption && (
        <Text style={[styles.meta, { color: theme.textSoft, textAlign: 'center' }]}>
          {caption}
        </Text>
      )}
      {lightbox && <ImageLightbox url={url} onClose={() => setLightbox(false)} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Gallery carousel with smooth animated dots
// ---------------------------------------------------------------------------

type GalleryEntry = { url: string; alt?: string; caption?: string };

function GalleryCarousel({ images, theme }: { images: GalleryEntry[]; theme: Theme }) {
  const { width: screenWidth } = useWindowDimensions();
  // Available inner width = screen - 2×content padding (16) - 2×card padding (14)
  const imageWidth = screenWidth - 60;
  const imageHeight = Math.round(imageWidth * 9 / 16);

  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const x = event.nativeEvent.contentOffset.x;
        const idx = Math.round(x / imageWidth);
        setCurrentIndex(Math.max(0, Math.min(idx, images.length - 1)));
      },
    },
  );

  const current = images[currentIndex];

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={imageWidth}
        snapToAlignment="center"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={onScroll}
        style={{ borderRadius: 12, overflow: 'hidden' }}
      >
        {images.map((img, i) => {
          const url = getMediaUrl(asString(img.url as unknown));
          if (!url) return null;
          return (
            <Pressable key={i} onPress={() => setLightboxUrl(url)}>
              <Image
                source={{ uri: url }}
                style={{ width: imageWidth, height: imageHeight, backgroundColor: theme.bg }}
                resizeMode="contain"
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {!!asString(current?.caption as unknown) && (
        <Text style={[styles.meta, { color: theme.textSoft, textAlign: 'center', marginTop: 8 }]}>
          {asString(current.caption as unknown)}
        </Text>
      )}

      {/* Animated dot indicators */}
      {images.length > 1 && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * imageWidth, i * imageWidth, (i + 1) * imageWidth],
              outputRange: [6, 18, 6],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={{
                  height: 6,
                  width: dotWidth,
                  borderRadius: 3,
                  backgroundColor: i === currentIndex ? theme.secondary : theme.border,
                }}
              />
            );
          })}
        </View>
      )}

      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PostDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const org = useOrgContext();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const { width: screenWidth } = useWindowDimensions();

  const orgId = org.entity?.orgUnitId ?? undefined;

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
        const result = await publicApi.fetchPublicPostBySlug(slug, orgId);
        if (cancelled) return;
        setPost(result);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o post.');
        setPost(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [orgId, slug]);

  const latestVersion = post?.versions?.[0];
  const blocks = (latestVersion?.blocks ?? []).slice().sort((a, b) => a.order - b.order);
  const scaled = useMemo(
    () => ({
      title: scaleFont(24, fontScale),
      titleLineHeight: scaleFont(30, fontScale),
      subtitle: scaleFont(14, fontScale),
      subtitleLineHeight: scaleFont(20, fontScale),
      meta: scaleFont(12, fontScale),
      body: scaleFont(15, fontScale),
      bodyLineHeight: scaleFont(23, fontScale),
      heading: scaleFont(22, fontScale),
      headingLineHeight: scaleFont(29, fontScale),
      quote: scaleFont(15, fontScale),
      quoteLineHeight: scaleFont(23, fontScale),
      action: scaleFont(13, fontScale),
      columnHeading: scaleFont(17, fontScale),
    }),
    [fontScale],
  );

  // Inner content width (matches imageWidth in GalleryCarousel)
  const contentWidth = screenWidth - 60;
  const videoHeight = Math.round(contentWidth * 9 / 16);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaleFont(14, fontScale) }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text, fontSize: scaled.title, lineHeight: scaled.titleLineHeight }]}>
            {post?.title ?? 'Notícia'}
          </Text>

          {!!post?.publishedAt && (
            <Text style={[styles.meta, { color: theme.textSoft, fontSize: scaled.meta }]}>
              Publicado em {formatDateTime(post.publishedAt)}
            </Text>
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center' }]}
          >
            <ActivityIndicator size="large" color={theme.secondary} />
            <Text style={{ color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }}>Carregando conteúdo...</Text>
          </View>
        )}

        {/* Error */}
        {!!error && !isLoading && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={{ color: '#FCA5A5' }}>{error}</Text>
          </View>
        )}

        {/* Summary */}
        {!!latestVersion?.summary && !isLoading && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              {stripHtml(latestVersion.summary ?? '')}
            </Text>
          </View>
        )}

        {/* Empty blocks */}
        {!isLoading && !!post && blocks.length === 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              Este post ainda não possui blocos de conteúdo no aplicativo.
            </Text>
          </View>
        )}

        {/* Blocks */}
        {!isLoading && !!post
          ? blocks.map((block, index) => {
            const data = asRecord(block.data) ?? {};
            const key = block.id || `${block.type}-${index}`;

            if (block.type === 'DIVIDER') {
              return (
                <View key={key} style={[styles.divider, { backgroundColor: theme.border }]} />
              );
            }

            if (block.type === 'IMAGE') {
              const url = getMediaUrl(asString(data.url));
              if (!url) return null;
              return (
                <PostImageBlock
                  key={key}
                  url={url}
                  caption={asString(data.caption)}
                  theme={theme}
                />
              );
            }

            if (block.type === 'GALLERY') {
              const images = Array.isArray(data.images)
                ? (data.images as Array<Record<string, unknown>>).map((img) => ({
                  url: asString(img.url) ?? '',
                  alt: asString(img.alt),
                  caption: asString(img.caption),
                })).filter((img) => img.url)
                : [];
              if (!images.length) return null;
              return (
                <View
                  key={key}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <GalleryCarousel images={images} theme={theme} />
                </View>
              );
            }

            if (block.type === 'EMBED') {
              const embedUrl = extractEmbedUrl(asString(data.html) ?? asString(data.url));
              if (!embedUrl) return null;
              // Inject the iframe via HTML with a trusted baseUrl to avoid YouTube error 153.
              // YouTube (and Vimeo) check the embed origin; setting baseUrl to the player
              // domain satisfies the origin check inside the WebView.
              const isVimeo = embedUrl.includes('vimeo.com');
              const baseUrl = isVimeo
                ? 'https://player.vimeo.com'
                : 'https://www.youtube-nocookie.com';
              const embedHtml = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=YES">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:#000;height:100%}iframe{width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="${embedUrl}?playsinline=1&rel=0&modestbranding=1"
  allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen"
  allowfullscreen></iframe>
</body></html>`;
              return (
                <View
                  key={key}
                  style={[styles.card, { backgroundColor: '#000', borderColor: theme.border, padding: 0, overflow: 'hidden' }]}
                >
                  <WebView
                    source={{ html: embedHtml, baseUrl }}
                    style={{ height: videoHeight, borderRadius: 14, backgroundColor: '#000' }}
                    javaScriptEnabled
                    allowsFullscreenVideo
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                    scrollEnabled={false}
                  />
                </View>
              );
            }

            if (block.type === 'BUTTON') {
              const url = resolveUrl(asString(data.url));
              const label = asString(data.label) ?? asString(data.text) ?? 'Abrir link';
              if (!url) return null;
              return (
                <View
                  key={key}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Pressable
                    style={[styles.actionButton, { borderColor: theme.secondary }]}
                    onPress={() => { void Linking.openURL(url).catch(() => undefined); }}
                  >
                    <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.action }]}>
                      {label}
                    </Text>
                  </Pressable>
                </View>
              );
            }

            if (block.type === 'COLUMNS') {
              const columns = Array.isArray(data.columns)
                ? (data.columns as Array<Record<string, unknown>>)
                : [];
              if (!columns.length) return null;
              return (
                <View
                  key={key}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  {columns.map((column, columnIndex) => (
                    <View key={`${key}-col-${columnIndex}`} style={{ gap: 4 }}>
                      {!!asString(column.title) && (
                        <Text style={[styles.headingBlock, { color: theme.text, fontSize: scaled.columnHeading, lineHeight: scaleFont(24, fontScale) }]}>
                          {asString(column.title)}
                        </Text>
                      )}
                      {!!asString(column.text) && (
                        <Text style={[styles.blockText, { color: theme.text, fontSize: scaled.body, lineHeight: scaled.bodyLineHeight }]}>
                          {asString(column.text)}
                        </Text>
                      )}
                      {!!asString(column.html) && (
                        <Text style={[styles.blockText, { color: theme.text, fontSize: scaled.body, lineHeight: scaled.bodyLineHeight }]}>
                          {stripHtml(asString(column.html))}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            }

            const blockText = renderBlockText(block);
            if (!blockText) return null;

            return (
              <View
                key={key}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
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
                      borderLeftColor: block.type === 'QUOTE' ? theme.secondary : undefined,
                      fontSize:
                        block.type === 'HEADING'
                          ? scaled.heading
                          : block.type === 'QUOTE'
                            ? scaled.quote
                            : scaled.body,
                      lineHeight:
                        block.type === 'HEADING'
                          ? scaled.headingLineHeight
                          : block.type === 'QUOTE'
                            ? scaled.quoteLineHeight
                            : scaled.bodyLineHeight,
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
