import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../mobile/auth-context';
import { useCommunityEvents } from '../../mobile/hooks/use-community-events';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useAppTheme } from '../../mobile/theme';
import { CommunityEvent, EventRsvpStatus } from '../../mobile/types';

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rsvpRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  rsvpButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 9,
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerSpacing: {
    paddingBottom: 4,
  },
});

const formatDateTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const rsvpLabel = (status?: EventRsvpStatus) => {
  if (status === 'GOING') return 'Presença confirmada';
  if (status === 'MAYBE') return 'Talvez';
  if (status === 'DECLINED') return 'Não vou';
  return null;
};

const rsvpChoices: Array<{ status: EventRsvpStatus; label: string }> = [
  { status: 'GOING', label: 'Vou' },
  { status: 'MAYBE', label: 'Talvez' },
  { status: 'DECLINED', label: 'Não vou' },
];

export default function EventsScreen() {
  const { isAuthenticated } = useAuth();
  const org = useOrgContext();
  const theme = useAppTheme();

  const parishId =
    org.entity?.type === 'PARISH'
      ? org.entity.id
      : org.entity?.type === 'CHAPEL'
        ? org.entity.parishId ?? null
        : null;

  const eventsState = useCommunityEvents(parishId);

  const handleRsvp = async (event: CommunityEvent, status: EventRsvpStatus) => {
    try {
      await eventsState.submitRsvp(event.id, { status });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar sua confirmação.';
      Alert.alert('RSVP', message);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <FlatList
          data={[]}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Pressable
                style={[styles.backButton, { borderColor: theme.border }]}
                onPress={() => router.replace('/(tabs)/conta')}
              >
                <MaterialCommunityIcons name="account-circle-outline" size={16} color={theme.secondary} />
                <Text style={{ color: theme.secondary, fontWeight: '700' }}>Ir para conta</Text>
              </Pressable>
              <Text style={[styles.title, { color: theme.text }]}>Eventos da comunidade</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                Faça login ou cadastre-se para confirmar presença nos próximos encontros.
              </Text>
            </View>
          }
          renderItem={null}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={eventsState.events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={eventsState.isRefreshing}
            onRefresh={eventsState.refresh}
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
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Voltar</Text>
            </Pressable>
            <Text style={[styles.title, { color: theme.text }]}>Eventos</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              Acompanhe os próximos eventos e confirme sua presença.
            </Text>
          </View>
        }
        ListEmptyComponent={
          eventsState.isLoading ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.secondary} />
              <Text style={{ color: theme.textSoft }}>Carregando eventos...</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Nenhum evento ativo</Text>
              <Text style={[styles.cardSummary, { color: theme.textSoft }]}>
                Quando houver novas programações, elas aparecerão aqui.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          <>
            {!!eventsState.error && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: '#FCA5A5' }}>{eventsState.error}</Text>
              </View>
            )}
            <View style={styles.footerSpacing} />
          </>
        }
        renderItem={({ item: event }) => {
          const myRsvp = eventsState.myRsvpByEventId[event.id];
          const label = rsvpLabel(myRsvp?.status);
          const attendeeLabel = `${event.metrics?.goingCount ?? 0}${event.maxAttendees ? ` / ${event.maxAttendees}` : ''
            } confirmado(s)`;

          return (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{event.title}</Text>
              {!!event.description && (
                <Text style={[styles.cardSummary, { color: theme.textSoft }]} numberOfLines={3}>
                  {event.description}
                </Text>
              )}

              {!!label && (
                <View style={[styles.statusBadge, { borderColor: theme.secondary }]}>
                  <Text style={[styles.statusText, { color: theme.secondary }]}>{label}</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.textSoft }]}>
                  Início: {formatDateTime(event.startsAt)}
                </Text>
                {!!event.endsAt && (
                  <Text style={[styles.metaText, { color: theme.textSoft }]}>
                    Fim: {formatDateTime(event.endsAt)}
                  </Text>
                )}
              </View>

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: theme.textSoft }]}>
                  Local: {event.location || 'Não informado'}
                </Text>
                <Text style={[styles.metaText, { color: theme.textSoft }]}>
                  {attendeeLabel}
                </Text>
              </View>

              <View style={styles.rsvpRow}>
                {rsvpChoices.map((choice) => {
                  const isSelected = myRsvp?.status === choice.status;
                  const isSubmitting =
                    eventsState.isSubmittingRsvp &&
                    eventsState.lastSubmittingEventId === event.id;

                  return (
                    <Pressable
                      key={choice.status}
                      style={[
                        styles.rsvpButton,
                        {
                          borderColor: isSelected ? theme.secondary : theme.border,
                          backgroundColor: isSelected ? `${theme.secondary}22` : 'transparent',
                          opacity: isSubmitting ? 0.65 : 1,
                        },
                      ]}
                      disabled={isSubmitting}
                      onPress={() => {
                        void handleRsvp(event, choice.status);
                      }}
                    >
                      <Text
                        style={[
                          styles.rsvpButtonText,
                          { color: isSelected ? theme.secondary : theme.textSoft },
                        ]}
                      >
                        {choice.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

