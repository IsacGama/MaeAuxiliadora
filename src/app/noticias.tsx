import { useMemo } from 'react';
import {
  ActivityIndicator,
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
import { useOrgContext } from '../mobile/hooks/use-org-context';
import { usePublicPosts } from '../mobile/hooks/use-public-posts';
import { createThemeWithMode } from '../mobile/theme';
import { useAuth } from '../mobile/auth-context';
import { useThemePreference } from '../mobile/theme-preference';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  header: {
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
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
  const { resolvedMode } = useThemePreference();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const parishId =
    org.entity?.type === 'PARISH'
      ? org.entity.id
      : org.entity?.type === 'CHAPEL'
        ? org.entity.parishId ?? null
        : null;

  const posts = usePublicPosts(parishId);

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
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Ir para conta</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text }]}>Notícias da comunidade</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
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
        <Text style={{ marginTop: 10, color: theme.textSoft }}>Carregando notícias...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={posts.isRefreshing}
            onRefresh={posts.refresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Notícias</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>
            Comunicados e conteúdos publicados pela sua comunidade.
          </Text>
        </View>

        {posts.posts.length > 0 ? (
          posts.posts.map((post) => {
            const summary = post.versions?.[0]?.summary?.trim() || 'Toque para ver no portal web.';
            return (
              <View key={post.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{post.title}</Text>
                <Text style={[styles.date, { color: theme.textSoft }]}>
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </Text>
                <Text style={[styles.cardSummary, { color: theme.textSoft }]}>{summary}</Text>
              </View>
            );
          })
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Nenhuma notícia publicada</Text>
            <Text style={[styles.cardSummary, { color: theme.textSoft }]}>
              Assim que houver novidades, elas aparecerão aqui.
            </Text>
          </View>
        )}

        {!!posts.error && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardSummary, { color: '#FCA5A5' }]}>{posts.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
