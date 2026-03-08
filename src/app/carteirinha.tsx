import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { useAuth } from '../mobile/auth-context';
import { useMemberDashboard } from '../mobile/hooks/use-member-dashboard';
import { useOrgContext } from '../mobile/hooks/use-org-context';
import { getMediaUrl } from '../mobile/media';
import { useAppTheme, withAlpha } from '../mobile/theme';
import { scaleFont, useFontScalePreference } from '../mobile/font-scale-preference';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardPatternCircleLarge: {
    position: 'absolute',
    right: -36,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
    borderWidth: 4,
  },
  cardPatternCircleSmall: {
    position: 'absolute',
    left: -56,
    bottom: -72,
    width: 220,
    height: 220,
    borderRadius: 999,
    borderWidth: 4,
  },
  cardInner: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    position: 'relative',
    zIndex: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  orgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orgAvatarImage: {
    width: '100%',
    height: '100%',
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  initialsAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    flexGrow: 1,
    minWidth: '48%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  overdueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overdueBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});

const formatCompetenceMonth = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return 'não informado';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'não informado';
  return parsed.toLocaleDateString('pt-BR');
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export default function MemberCardScreen() {
  const theme = useAppTheme();
  const org = useOrgContext();
  const dashboard = useMemberDashboard();
  const { session } = useAuth();
  const { fontScale } = useFontScalePreference();
  const cardCaptureRef = useRef<ViewShot | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const scaled = useMemo(
    () => ({
      title: scaleFont(22, fontScale),
      subtitle: scaleFont(13, fontScale),
      sectionTitle: scaleFont(15, fontScale),
      label: scaleFont(11, fontScale),
      value: scaleFont(14, fontScale),
      button: scaleFont(13, fontScale),
    }),
    [fontScale],
  );

  const person = dashboard.dashboard?.person;
  const activeTither = dashboard.dashboard?.titherProfiles?.find((profile) => profile.status === 'ACTIVE');
  const approvedPastorals = (dashboard.dashboard?.pastoralMemberships ?? []).filter(
    (membership) => membership.status === 'APPROVED',
  );
  const customDomain = org.entity?.raw?.customDomain?.trim();
  const domainLabel = customDomain || org.displayName || 'EclesialHub';
  const logoUrl = getMediaUrl(org.branding?.logoAsset?.url ?? org.branding?.coatOfArmsAsset?.url);

  const onShare = async () => {
    if (!person || isSharing) return;
    setIsSharing(true);
    const shareMessage = `${person.fullName} — Membro Ativo${activeTither ? ' · Dizimista' : ''}${org.displayName ? ` · ${org.displayName}` : ''}`;
    try {
      const imageUri = await cardCaptureRef.current?.capture?.();
      const canShareImage = Boolean(imageUri) && (await Sharing.isAvailableAsync());
      if (canShareImage && imageUri) {
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartilhar carteirinha',
        });
        return;
      }
      await Share.share({
        title: 'Carteirinha EclesialHub',
        message: shareMessage,
      });
    } finally {
      setIsSharing(false);
    }
  };

  if (dashboard.isLoading && !dashboard.dashboard) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.secondary} />
      </SafeAreaView>
    );
  }

  if (!person) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={theme.text} />
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaled.button }}>Voltar</Text>
          </Pressable>
          <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.textSoft, fontSize: scaled.subtitle }}>
              Não foi possível carregar os dados da carteirinha.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={18} color={theme.text} />
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaled.button }}>Voltar</Text>
        </Pressable>

        <ViewShot
          ref={cardCaptureRef}
          options={{
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            fileName: `carteirinha-${person.id.slice(-6).toLowerCase()}`,
          }}
        >
          <View style={[styles.card, { borderColor: withAlpha('#FFFFFF', 0.25), backgroundColor: '#B8860B' }]}>
            <View
              style={[
                styles.cardPatternCircleLarge,
                { borderColor: withAlpha('#FFFFFF', 0.24) },
              ]}
            />
            <View
              style={[
                styles.cardPatternCircleSmall,
                { borderColor: withAlpha('#FFFFFF', 0.2) },
              ]}
            />
            <View style={styles.cardInner}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={[styles.orgAvatar, { borderColor: withAlpha('#FFFFFF', 0.35), backgroundColor: withAlpha('#FFFFFF', 0.16) }]}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.orgAvatarImage} resizeMode="cover" />
                    ) : (
                      <MaterialCommunityIcons name="church" size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: withAlpha('#FFFFFF', 0.75), fontSize: scaleFont(10, fontScale), fontWeight: '800', textTransform: 'uppercase' }}>
                      {org.displayName || 'EclesialHub'}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: scaleFont(13, fontScale), fontWeight: '600' }}>
                      Carteirinha digital
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { borderColor: withAlpha('#FFFFFF', 0.5), backgroundColor: withAlpha('#FFFFFF', 0.15) }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: scaleFont(11, fontScale) }}>
                    Membro ativo
                  </Text>
                </View>
              </View>

              <View style={styles.nameRow}>
                <View style={[styles.initialsAvatar, { borderColor: withAlpha('#FFFFFF', 0.4), backgroundColor: withAlpha('#FFFFFF', 0.12) }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: scaleFont(20, fontScale) }}>
                    {getInitials(person.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: scaleFont(21, fontScale) }}>
                    {person.fullName}
                  </Text>
                  <Text style={{ color: withAlpha('#FFFFFF', 0.85), fontSize: scaleFont(13, fontScale) }}>
                    {session?.user.email ?? person.primaryEmail ?? ''}
                  </Text>
                </View>
              </View>

              <View style={styles.chipRow}>
                {activeTither ? (
                  <View style={[styles.chip, { borderColor: withAlpha('#FFFFFF', 0.45), backgroundColor: withAlpha('#FFFFFF', 0.12) }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: scaleFont(12, fontScale) }}>Dizimista</Text>
                  </View>
                ) : null}
                {approvedPastorals.slice(0, 2).map((membership) => (
                  <View key={membership.id} style={[styles.chip, { borderColor: withAlpha('#FFFFFF', 0.45), backgroundColor: withAlpha('#FFFFFF', 0.12) }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: scaleFont(12, fontScale) }}>
                      {membership.pastoral.name}
                    </Text>
                  </View>
                ))}
                {approvedPastorals.length > 2 ? (
                  <View style={[styles.chip, { borderColor: withAlpha('#FFFFFF', 0.45), backgroundColor: withAlpha('#FFFFFF', 0.12) }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: scaleFont(12, fontScale) }}>
                      +{approvedPastorals.length - 2}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={[styles.rowBetween, { marginTop: 2 }]}>
                <Text style={{ color: withAlpha('#FFFFFF', 0.7), fontSize: scaleFont(11, fontScale) }}>
                  ID: {person.id.slice(-8).toUpperCase()}
                </Text>
                <Text style={{ color: withAlpha('#FFFFFF', 0.7), fontSize: scaleFont(11, fontScale) }}>
                  {domainLabel}
                </Text>
              </View>
            </View>
          </View>
        </ViewShot>

        {activeTither?.titheControl ? (
          <View style={[styles.sectionCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
            <Text style={{ color: theme.primary, fontSize: scaled.sectionTitle, fontWeight: '800' }}>
              Regularidade do dízimo
            </Text>

            <View style={styles.grid}>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Pagos</Text>
                <Text style={{ color: theme.text, fontSize: scaled.value, fontWeight: '800' }}>
                  {activeTither.titheControl.paidMonths ?? 0}
                </Text>
              </View>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Esperados</Text>
                <Text style={{ color: theme.text, fontSize: scaled.value, fontWeight: '800' }}>
                  {activeTither.titheControl.expectedMonths ?? 0}
                </Text>
              </View>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Em atraso</Text>
                <Text
                  style={{
                    color:
                      (activeTither.titheControl.overdueMonths ?? 0) > 0
                        ? theme.destructive
                        : '#22C55E',
                    fontSize: scaled.value,
                    fontWeight: '800',
                  }}
                >
                  {activeTither.titheControl.overdueMonths ?? 0}
                </Text>
              </View>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Último mês pago</Text>
                <Text style={{ color: theme.text, fontSize: scaled.value, fontWeight: '800' }}>
                  {formatCompetenceMonth(activeTither.titheControl.lastPaidMonth)}
                </Text>
              </View>
            </View>

            <View style={styles.grid}>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Envelope do mês</Text>
                <Text style={{ color: theme.text, fontSize: scaled.value, fontWeight: '800' }}>
                  {activeTither.currentEnvelopeCode ?? activeTither.envelopeCode
                    ? `E${activeTither.currentEnvelopeCode ?? activeTither.envelopeCode}`
                    : '—'}
                </Text>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label }}>
                  {formatCompetenceMonth(activeTither.currentEnvelopeMonth)}
                </Text>
              </View>
              <View style={[styles.gridItem, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>Início</Text>
                <Text style={{ color: theme.text, fontSize: scaled.value, fontWeight: '800' }}>
                  {formatDateOnly(activeTither.startedAt)}
                </Text>
              </View>
            </View>

            {(activeTither.titheControl.overdueCompetences?.length ?? 0) > 0 ? (
              <>
                <Text style={{ color: theme.textSoft, fontSize: scaled.label, fontWeight: '700' }}>
                  Competências em aberto
                </Text>
                <View style={styles.overdueRow}>
                  {(activeTither.titheControl.overdueCompetences ?? []).map((competence) => (
                    <View
                      key={competence}
                      style={[
                        styles.overdueBadge,
                        {
                          borderColor: withAlpha(theme.destructive, 0.35),
                          backgroundColor: withAlpha(theme.destructive, 0.12),
                        },
                      ]}
                    >
                      <Text style={{ color: theme.destructive, fontWeight: '700', fontSize: scaleFont(11, fontScale) }}>
                        {competence}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: scaled.subtitle }}>
                Dízimo em dia.
              </Text>
            )}
          </View>
        ) : null}

        <Pressable
          style={[styles.button, { borderColor: theme.secondary, backgroundColor: withAlpha(theme.secondary, 0.16), opacity: isSharing ? 0.75 : 1 }]}
          onPress={() => {
            void onShare();
          }}
          disabled={isSharing}
        >
          {isSharing ? <ActivityIndicator size="small" color={theme.secondary} /> : null}
          <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.button }}>
            {isSharing ? 'Preparando imagem...' : 'Exportar carteirinha (imagem)'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
