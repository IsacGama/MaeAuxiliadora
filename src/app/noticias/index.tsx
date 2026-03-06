import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { usePublicPosts } from '../../mobile/hooks/use-public-posts';
import { useAppTheme } from '../../mobile/theme';
import { scaleFont, useFontScalePreference } from '../../mobile/font-scale-preference';
import { useAuth } from '../../mobile/auth-context';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  header: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 14,
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  cardSummary: {
    fontSize: 14,
    lineHeight: 21,
  },
  footerSpacing: {
    paddingBottom: 4,
  },
  loadingMore: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.85,
  },
});

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function NewsScreen() {
  const { isAuthenticated } = useAuth();
  const org = useOrgContext();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const scaled = useMemo(
    () => ({
      title: scaleFont(22, fontScale),
      subtitle: scaleFont(13, fontScale),
      subtitleLineHeight: scaleFont(19, fontScale),
      cardTitle: scaleFont(17, fontScale),
      cardTitleLineHeight: scaleFont(24, fontScale),
      cardSummary: scaleFont(14, fontScale),
      cardSummaryLineHeight: scaleFont(21, fontScale),
      date: scaleFont(12, fontScale),
      buttonText: scaleFont(13, fontScale),
      loadingText: scaleFont(14, fontScale),
    }),
    [fontScale],
  );

  const orgId = org.entity?.orgUnitId ?? null;
  const posts = usePublicPosts(orgId);

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 28 }]}>
          <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable
              style={[styles.backButton, { borderColor: theme.border }]}
              onPress={() => router.replace('/conta')}
            >
              <MaterialCommunityIcons name="account-circle-outline" size={16} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.buttonText }}>Ir para conta</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text, fontSize: scaled.title }]}>Notícias da comunidade</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              Faça login ou cadastre-se para acessar as notícias da sua paróquia/capela.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (posts.isLoading && posts.posts.length === 0) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.secondary} />
        <Text style={{ marginTop: 10, color: theme.textSoft, fontSize: scaled.loadingText }}>Carregando notícias...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={posts.posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (!posts.hasMore || posts.isLoadingMore || posts.isRefreshing || posts.isLoading) {
            return;
          }
          posts.loadMore();
        }}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={posts.isRefreshing}
            onRefresh={posts.refresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable
              style={[styles.backButton, { borderColor: theme.border }]}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.buttonText }}>Voltar</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text, fontSize: scaled.title }]}>Notícias</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              Comunicados e conteúdos publicados pela sua comunidade.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontSize: scaled.cardTitle, lineHeight: scaled.cardTitleLineHeight }]}>Nenhuma notícia publicada</Text>
            <Text style={[styles.cardSummary, { color: theme.textSoft, fontSize: scaled.cardSummary, lineHeight: scaled.cardSummaryLineHeight }]}>
              Assim que houver novidades, elas aparecerão aqui.
            </Text>
          </View>
        }
        ListFooterComponent={
          <>
            {!!posts.error && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.cardSummary, { color: '#FCA5A5', fontSize: scaled.cardSummary, lineHeight: scaled.cardSummaryLineHeight }]}>{posts.error}</Text>
              </View>
            )}
            {posts.isLoadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={theme.secondary} />
              </View>
            )}
            <View style={styles.footerSpacing} />
          </>
        }
        renderItem={({ item: post }) => {
          const summary = post.versions?.[0]?.summary?.trim() || 'Toque para abrir o conteúdo.';
          return (
            <Pressable
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() =>
                router.push({
                  pathname: '/noticias/[slug]' as never,
                  params: { slug: post.slug },
                } as never)
              }
            >
              <Text style={[styles.cardTitle, { color: theme.text, fontSize: scaled.cardTitle, lineHeight: scaled.cardTitleLineHeight }]}>{post.title}</Text>
              <Text style={[styles.date, { color: theme.textSoft, fontSize: scaled.date }]}>
                {formatDate(post.publishedAt ?? post.createdAt)}
              </Text>
              <Text style={[styles.cardSummary, { color: theme.textSoft, fontSize: scaled.cardSummary, lineHeight: scaled.cardSummaryLineHeight }]}>{summary}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
