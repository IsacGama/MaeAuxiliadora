import { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { createTheme, getTextColorForBackground } from '../../mobile/theme';
import { getMediaUrl } from '../../mobile/media';
import { useDailyLiturgy } from '../../mobile/hooks/use-daily-liturgy';
import { useAuth } from '../../mobile/auth-context';
import { buildPixPayload, buildPixQrImageUrl } from '../../mobile/pix';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroOverlay: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    height: 56,
    width: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '48%',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionDescription: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.8,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  socialButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  socialText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 21,
  },
  pixKeyText: {
    fontSize: 15,
    fontWeight: '700',
  },
  qrImage: {
    width: 190,
    height: 190,
    alignSelf: 'center',
    borderRadius: 10,
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  ctaButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
});

export default function HomeScreen() {
  const org = useOrgContext();
  const liturgy = useDailyLiturgy();
  const { isAuthenticated } = useAuth();

  const isRefreshing = org.isRefreshing || liturgy.isRefreshing;
  const theme = useMemo(() => createTheme(org.branding), [org.branding]);

  const logoUrl = getMediaUrl(org.branding?.logoAsset?.url ?? org.branding?.coatOfArmsAsset?.url);
  const coverUrl = getMediaUrl(org.branding?.coverAsset?.url);
  const heroTitleColor = getTextColorForBackground(theme.primary);

  const normalizeExternalUrl = (url?: string | null) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const socialRaw = org.branding?.socialLinks ?? {};
  const socialLinks = [
    { key: 'facebook', label: 'Facebook', href: normalizeExternalUrl(socialRaw.facebook) },
    { key: 'instagram', label: 'Instagram', href: normalizeExternalUrl(socialRaw.instagram) },
    { key: 'youtube', label: 'YouTube', href: normalizeExternalUrl(socialRaw.youtube) },
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item.href));

  const liturgyExcerpt = liturgy.liturgy?.leituras?.salmo?.[0]?.refrao ??
    liturgy.liturgy?.leituras?.evangelho?.[0]?.titulo ??
    'A leitura do dia será exibida aqui automaticamente.';

  const rawEntity = org.entity?.raw as { city?: string; address?: { city?: string } } | undefined;
  const pixKey = (org.branding?.pixKey ?? '').trim();
  const pixPayload = pixKey
    ? buildPixPayload({
        key: pixKey,
        merchantName: org.displayName,
        merchantCity: rawEntity?.address?.city ?? rawEntity?.city ?? 'BRASILIA',
        description: `Doacao ${org.displayName}`,
      })
    : null;
  const pixQrFromExtra =
    typeof org.branding?.extra?.pixQrCodeUrl === 'string' && org.branding.extra.pixQrCodeUrl.trim().length > 0
      ? org.branding.extra.pixQrCodeUrl.trim()
      : null;
  const pixQrUrl = pixQrFromExtra ?? (pixPayload ? buildPixQrImageUrl(pixPayload, 360) : null);

  const onRefresh = async () => {
    await Promise.all([org.refresh(), liturgy.refresh()]);
  };

  if (org.isLoading && !org.entity) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.secondary} />
        <Text style={{ marginTop: 12, color: theme.textSoft }}>Carregando comunidade...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        {isAuthenticated && (
          <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            {coverUrl ? (
              <ImageBackground source={{ uri: coverUrl }} style={{ minHeight: 210 }}>
                <View style={[styles.heroOverlay, { backgroundColor: 'rgba(6, 11, 18, 0.58)' }]}>
                  <View style={styles.heroHeader}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.logo} />
                    ) : (
                      <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.title, { color: heroTitleColor }]}>{org.displayName}</Text>
                    </View>
                  </View>

                  <Text style={[styles.subtitle, { color: heroTitleColor }]}>
                    {org.branding?.slogan || 'Evangelização, comunidade e gestão pastoral em um só app.'}
                  </Text>
                </View>
              </ImageBackground>
            ) : (
              <View style={[styles.heroOverlay, { minHeight: 210, backgroundColor: theme.primary }]}>
                <View style={styles.heroHeader}>
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: heroTitleColor }]}>{org.displayName}</Text>
                  </View>
                </View>

                <Text style={[styles.subtitle, { color: heroTitleColor }]}>
                  {org.branding?.slogan || 'Evangelização, comunidade e gestão pastoral em um só app.'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsGrid}>
          <Pressable
            style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => router.push('/liturgia')}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>Liturgia do Dia</Text>
            <Text style={[styles.actionDescription, { color: theme.textSoft }]}>Leitura com cache diário</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => router.push('/biblia')}
          >
            <Text style={[styles.actionTitle, { color: theme.text }]}>Bíblia Offline</Text>
            <Text style={[styles.actionDescription, { color: theme.textSoft }]}>Conteúdo local completo</Text>
          </Pressable>

          {isAuthenticated && (
            <Pressable
              style={[styles.actionButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={() => router.push('/noticias')}
            >
              <Text style={[styles.actionTitle, { color: theme.text }]}>Notícias</Text>
              <Text style={[styles.actionDescription, { color: theme.textSoft }]}>Veja os avisos e comunicados</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Liturgia em destaque</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}> {liturgyExcerpt}</Text>
          {!!liturgy.error && <Text style={{ color: '#FCA5A5' }}>{liturgy.error}</Text>}
        </View>

        {!isAuthenticated && (
          <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Acesso da sua comunidade</Text>
            <Text style={[styles.paragraph, { color: theme.textSoft }]}>
              Faça login ou cadastre-se para ver notícias, informações da sua paróquia/capela e seu painel de dízimo.
            </Text>
            <Pressable
              style={[styles.ctaButton, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
              onPress={() => router.push('/conta')}
            >
              <Text style={[styles.actionTitle, { color: theme.secondary }]}>Ir para login/cadastro</Text>
            </Pressable>
            <Text style={[styles.paragraph, { color: theme.textSoft }]}>
              Não encontrou sua paróquia ou capela? Fale com o pároco ou com a secretaria da sua comunidade para ativar o aplicativo.
            </Text>
          </View>
        )}

        {!!pixKey && isAuthenticated && (
          <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Doações via PIX</Text>
            <Text style={[styles.pixKeyText, { color: theme.secondary }]}>{pixKey}</Text>
            {!!pixQrUrl && <Image source={{ uri: pixQrUrl }} style={styles.qrImage} resizeMode="contain" />}
            <Text style={[styles.paragraph, { color: theme.textSoft }]}>
              Escaneie o QR Code no seu banco ou use a chave PIX acima.
            </Text>
          </View>
        )}

        {socialLinks.length > 0 && isAuthenticated && (
          <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Redes sociais</Text>
            <View style={styles.socialRow}>
              {socialLinks.map((social) => (
                <Pressable
                  key={social.key}
                  style={[styles.socialButton, { borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                  onPress={() => {
                    void Linking.openURL(social.href);
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      social.key === 'facebook'
                        ? 'facebook'
                        : social.key === 'instagram'
                          ? 'instagram'
                          : 'youtube'
                    }
                    size={14}
                    color={theme.secondary}
                  />
                  <Text style={[styles.socialText, { color: theme.secondary }]}>{social.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
