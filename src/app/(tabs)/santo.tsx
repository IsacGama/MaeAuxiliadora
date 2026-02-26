import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { DayKeyPicker } from '../../mobile/components/day-key-picker';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useSaintOfDay } from '../../mobile/hooks/use-saint-of-day';
import { createThemeWithMode } from '../../mobile/theme';
import { useThemePreference } from '../../mobile/theme-preference';

const stripHtml = (html?: string) => {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  block: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.9,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFrame: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default function SaintOfDayScreen() {
  const org = useOrgContext();
  const saint = useSaintOfDay();
  const { resolvedMode } = useThemePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const saintData = saint.saint;
  const saintName = stripHtml(saintData?.title?.rendered) || 'Santo do Dia';
  const saintExcerpt = stripHtml(saintData?.excerpt?.rendered);
  const saintContent = stripHtml(saintData?.content?.rendered);
  const saintImage = saintData?.imagem_destacada || saintData?.meta?.['imagem-sm'] || null;
  const [imageRatio, setImageRatio] = useState(1);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const festiveDay = saintData?.meta?.['dia-festivo'];
  const paragraphs = (saintContent || saintExcerpt)
    .split('\n\n')
    .map((part) => part.trim())
    .filter(Boolean);

  useEffect(() => {
    setImageLoadFailed(false);

    if (!saintImage) {
      setImageRatio(1);
      return;
    }

    let active = true;
    Image.getSize(
      saintImage,
      (width, height) => {
        if (!active || width <= 0 || height <= 0) {
          return;
        }
        const ratio = width / height;
        // Evita imagens extremamente altas ou largas quebrando o layout.
        const clampedRatio = Math.max(0.7, Math.min(1.8, ratio));
        setImageRatio(clampedRatio);
      },
      () => {
        if (active) {
          setImageRatio(1);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [saintImage]);

  if (saint.isLoading && !saint.saint) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.secondary} />
        <Text style={{ marginTop: 10, color: theme.textSoft }}>Carregando santo do dia...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={saint.isRefreshing}
            onRefresh={saint.refresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <DayKeyPicker
            value={saint.selectedDate}
            onChange={saint.setDate}
            theme={theme}
            label="Data do santo"
            title="Escolher data do santo"
          />
        </View>

        {saint.isLoading && !!saint.saint && (
          <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.secondary} />
              <Text style={[styles.text, { color: theme.textSoft }]}>Carregando a data selecionada...</Text>
            </View>
          </View>
        )}

        <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.primary }]}>
            {saintName}
          </Text>
          {!!festiveDay && (
            <Text style={[styles.subtitle, { color: theme.secondary }]}>{festiveDay}</Text>
          )}
          {!!saintExcerpt && <Text style={[styles.subtitle, { color: theme.textSoft }]}>{saintExcerpt}</Text>}
          {!!saint.error && <Text style={{ color: '#FCA5A5' }}>{saint.error}</Text>}
        </View>

        {!!saintImage && !imageLoadFailed && (
          <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <View style={[styles.imageFrame, { aspectRatio: imageRatio }]}>
              <Image
                source={{ uri: saintImage }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setImageLoadFailed(true)}
              />
            </View>
          </View>
        )}

        <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.text, { color: theme.secondary }]}>Reflexão do dia</Text>
          {paragraphs.length > 0 ? (
            paragraphs.map((paragraph, index) => (
              <Text key={`saint-p-${index}`} style={[styles.text, { color: theme.text }]}>
                {paragraph}
              </Text>
            ))
          ) : (
            <Text style={[styles.text, { color: theme.textSoft }]}>Conteúdo não disponível hoje.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
