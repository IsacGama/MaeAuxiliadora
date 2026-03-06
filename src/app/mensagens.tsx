import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../mobile/auth-context';
import { authApi } from '../mobile/api';
import { useMemberNotifications } from '../mobile/hooks/use-member-notifications';
import { useOrgContext } from '../mobile/hooks/use-org-context';
import { useAppTheme } from '../mobile/theme';
import { scaleFont, useFontScalePreference } from '../mobile/font-scale-preference';
import { MemberNotificationItem, MemberNotificationPreferences } from '../mobile/types';
import { notifyAppAlert } from '../mobile/app-alert';

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
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  itemBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
});

type NotificationDestination =
  | { type: 'POST'; slug: string }
  | { type: 'EXTERNAL_URL'; url: string }
  | { type: 'EVENT'; checkInToken?: string }
  | { type: 'MESSAGE' }
  | null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length ? value.trim() : undefined;

const extractDestination = (
  notification: MemberNotificationItem,
): NotificationDestination => {
  const data = asRecord(notification.data);
  if (!data) return null;

  const destinationType =
    asString(data.destinationType)?.toUpperCase() ??
    asString(data.destination)?.toUpperCase();
  if (destinationType === 'POST') {
    const slug = asString(data.postSlug) ?? asString(data.slug);
    if (slug) {
      return { type: 'POST', slug };
    }
  }

  if (destinationType === 'EXTERNAL_URL') {
    const url = asString(data.url) ?? asString(data.href);
    if (url) {
      return { type: 'EXTERNAL_URL', url };
    }
  }

  if (destinationType === 'EVENT' || destinationType === 'CHECKIN') {
    const checkInToken = asString(data.checkInToken) ?? asString(data.token);
    return { type: 'EVENT', checkInToken };
  }

  if (destinationType === 'MESSAGE') {
    return { type: 'MESSAGE' };
  }

  return null;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

const channelLabel = (channel: MemberNotificationItem['channel']) =>
  channel === 'EMAIL' ? 'E-mail' : 'Push';

const RETENTION_OPTIONS: Array<{
  value: number | null;
  label: string;
}> = [
    { value: null, label: 'Sem limpeza automática' },
    { value: 7, label: '7 dias' },
    { value: 30, label: '30 dias' },
    { value: 60, label: '60 dias' },
    { value: 90, label: '90 dias' },
  ];

export default function MessagesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isAuthenticated, requestWithAuth } = useAuth();
  const org = useOrgContext();
  const notificationsState = useMemberNotifications();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const scaled = useMemo(
    () => ({
      title: scaleFont(22, fontScale),
      subtitle: scaleFont(13, fontScale),
      subtitleLineHeight: scaleFont(19, fontScale),
      sectionTitle: scaleFont(15, fontScale),
      badgeText: scaleFont(11, fontScale),
      itemTitle: scaleFont(16, fontScale),
      itemTitleLineHeight: scaleFont(22, fontScale),
      itemBody: scaleFont(14, fontScale),
      itemBodyLineHeight: scaleFont(21, fontScale),
      metaText: scaleFont(12, fontScale),
      actionButtonText: scaleFont(13, fontScale),
      chipText: scaleFont(12, fontScale),
      buttonText: scaleFont(13, fontScale),
      loadingText: scaleFont(14, fontScale),
    }),
    [fontScale],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFromFetch, setSelectedFromFetch] =
    useState<MemberNotificationItem | null>(null);
  const [preferences, setPreferences] =
    useState<MemberNotificationPreferences | null>(null);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [hidingNotification, setHidingNotification] = useState(false);
  const [clearingReadHistory, setClearingReadHistory] = useState(false);

  useEffect(() => {
    if (typeof id !== 'string' || !id.trim()) {
      return;
    }
    setSelectedId(id);
  }, [id]);

  useEffect(() => {
    if (!selectedId || notificationsState.isLoading || !isAuthenticated) {
      return;
    }

    if (notificationsState.notifications.some((item) => item.id === selectedId)) {
      setSelectedFromFetch(null);
      return;
    }

    void requestWithAuth((token) => authApi.memberNotification(token, selectedId))
      .then((item) => {
        setSelectedFromFetch(item);
      })
      .catch(() => {
        setSelectedFromFetch(null);
      });
  }, [
    isAuthenticated,
    notificationsState.isLoading,
    notificationsState.notifications,
    requestWithAuth,
    selectedId,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPreferences(null);
      return;
    }

    let cancelled = false;
    void requestWithAuth((token) =>
      authApi.memberNotificationPreferences(token),
    )
      .then((result) => {
        if (!cancelled) {
          setPreferences(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreferences({ autoDeleteAfterDays: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, requestWithAuth]);

  const selectedNotification = useMemo(() => {
    if (!selectedId) return null;
    const fromList = notificationsState.notifications.find(
      (item) => item.id === selectedId,
    );
    return fromList ?? selectedFromFetch;
  }, [notificationsState.notifications, selectedFromFetch, selectedId]);

  const orderedNotifications = useMemo(() => {
    return notificationsState.notifications;
  }, [notificationsState.notifications]);

  const selectedRetention = preferences?.autoDeleteAfterDays ?? null;

  const updateRetentionPreference = async (days: number | null) => {
    if (!isAuthenticated) {
      return;
    }

    setSavingPreferences(true);
    try {
      const updated = await requestWithAuth((token) =>
        authApi.updateMemberNotificationPreferences(token, {
          autoDeleteAfterDays: days,
        }),
      );
      setPreferences(updated);
    } catch {
      void notifyAppAlert(
        'Falha',
        'Não foi possível salvar a preferência.',
        'danger',
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const markSelectedAsRead = async () => {
    if (!selectedNotification?.id) {
      return;
    }
    setMarkingRead(true);
    try {
      await requestWithAuth((token) =>
        authApi.markMemberNotificationRead(token, selectedNotification.id),
      );
      await notificationsState.refresh();
      setSelectedFromFetch(null);
    } catch {
      void notifyAppAlert(
        'Falha',
        'Não foi possível marcar a mensagem como lida.',
        'danger',
      );
    } finally {
      setMarkingRead(false);
    }
  };

  const hideSelectedNotification = async () => {
    if (!selectedNotification?.id) {
      return;
    }
    setHidingNotification(true);
    try {
      await requestWithAuth((token) =>
        authApi.hideMemberNotification(token, selectedNotification.id),
      );
      setSelectedId(null);
      setSelectedFromFetch(null);
      await notificationsState.refresh();
    } catch {
      void notifyAppAlert(
        'Falha',
        'Não foi possível remover a mensagem.',
        'danger',
      );
    } finally {
      setHidingNotification(false);
    }
  };

  const clearReadHistory = async () => {
    const olderThanDays = selectedRetention ?? 30;
    setClearingReadHistory(true);
    try {
      const result = await requestWithAuth((token) =>
        authApi.clearMemberNotifications(token, {
          olderThanDays,
          onlyRead: true,
        }),
      );
      await notificationsState.refresh();
      void notifyAppAlert(
        'Concluído',
        `${result.hidden} mensagem(ns) removida(s) da sua lista.`,
        'success',
      );
    } catch {
      void notifyAppAlert(
        'Falha',
        'Não foi possível limpar o histórico.',
        'danger',
      );
    } finally {
      setClearingReadHistory(false);
    }
  };

  // Renders the action buttons for a selected notification (destination + mark-read + remove)
  const renderNotificationActions = (notification: MemberNotificationItem) => {
    const destination = extractDestination(notification);
    return (
      <>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {destination?.type === 'POST' ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.secondary }]}
            onPress={() =>
              router.push({
                pathname: '/noticias/[slug]' as never,
                params: { slug: destination.slug },
              } as never)
            }
          >
            <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
              Abrir post relacionado
            </Text>
          </Pressable>
        ) : null}

        {destination?.type === 'EXTERNAL_URL' ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.secondary }]}
            onPress={() => {
              void Linking.openURL(destination.url).catch(() => undefined);
            }}
          >
            <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
              Abrir link externo
            </Text>
          </Pressable>
        ) : null}

        {destination?.type === 'EVENT' ? (
          <Pressable
            style={[styles.actionButton, { borderColor: theme.secondary }]}
            onPress={() => {
              if (destination.checkInToken) {
                router.push({
                  pathname: '/eventos/checkin/[token]' as never,
                  params: { token: destination.checkInToken },
                } as never);
                return;
              }
              router.push('/eventos' as never);
            }}
          >
            <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
              Abrir evento relacionado
            </Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {!notification.isRead ? (
            <Pressable
              style={[styles.actionButton, { borderColor: theme.secondary, flex: 1 }]}
              disabled={markingRead}
              onPress={() => {
                void markSelectedAsRead();
              }}
            >
              <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
                {markingRead ? 'Marcando...' : 'Marcar como lida'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.actionButton, { borderColor: theme.secondary, flex: 1 }]}
            disabled={hidingNotification}
            onPress={() => {
              void hideSelectedNotification();
            }}
          >
            <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
              {hidingNotification ? 'Removendo...' : 'Remover da minha lista'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 28 }]}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.title, { color: theme.text, fontSize: scaled.title }]}>Mensagens</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
              Faça login para visualizar os comunicados enviados para sua conta.
            </Text>
            <Pressable
              style={[styles.actionButton, { borderColor: theme.secondary }]}
              onPress={() => router.replace('/conta')}
            >
              <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
                Ir para conta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 28 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={notificationsState.isRefreshing}
            onRefresh={notificationsState.refresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
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
            <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.buttonText }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text, fontSize: scaled.title }]}>Mensagens</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
            Avisos e comunicados enviados para você pela comunidade.
          </Text>
        </View>

        {notificationsState.isLoading && !orderedNotifications.length ? (
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
            <Text style={{ color: theme.textSoft, fontSize: scaled.loadingText }}>Carregando mensagens...</Text>
          </View>
        ) : null}

        {/* Notification fetched via deep-link that's not in the visible list */}
        {selectedFromFetch ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.secondary },
            ]}
          >
            <View style={styles.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.badge,
                    { borderColor: theme.border, backgroundColor: 'transparent' },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: theme.secondary, fontSize: scaled.badgeText }]}>
                    {channelLabel(selectedFromFetch.channel)}
                  </Text>
                </View>
                {!selectedFromFetch.isRead ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: `${theme.secondary}22`,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: theme.secondary, fontSize: scaled.badgeText }]}>
                      Nova
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.metaText, { color: theme.textSoft, fontSize: scaled.metaText }]}>
                {formatDateTime(selectedFromFetch.deliveredAt)}
              </Text>
            </View>
            <Text style={[styles.itemTitle, { color: theme.text, fontSize: scaled.itemTitle, lineHeight: scaled.itemTitleLineHeight }]}>
              {selectedFromFetch.title}
            </Text>
            <Text style={[styles.itemBody, { color: theme.textSoft, fontSize: scaled.itemBody, lineHeight: scaled.itemBodyLineHeight }]}>
              {selectedFromFetch.body}
            </Text>
            {renderNotificationActions(selectedFromFetch)}
          </View>
        ) : null}

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: scaled.sectionTitle }]}>
            Configuração de notificações
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
            A limpeza é aplicada só na sua conta.
          </Text>
          <View style={styles.chipRow}>
            {RETENTION_OPTIONS.map((option) => {
              const active = option.value === selectedRetention;
              return (
                <Pressable
                  key={option.label}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? theme.secondary : theme.border,
                      backgroundColor: active
                        ? `${theme.secondary}22`
                        : 'transparent',
                      opacity: savingPreferences ? 0.65 : 1,
                    },
                  ]}
                  disabled={savingPreferences}
                  onPress={() => {
                    void updateRetentionPreference(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? theme.secondary : theme.textSoft, fontSize: scaled.chipText },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            style={[styles.actionButton, { borderColor: theme.secondary }]}
            disabled={clearingReadHistory}
            onPress={() => {
              void clearReadHistory();
            }}
          >
            <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.actionButtonText }]}>
              {clearingReadHistory ? 'Limpando...' : 'Limpar lidas antigas'}
            </Text>
          </Pressable>
        </View>

        {!orderedNotifications.length && !notificationsState.isLoading ? (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.itemTitle, { color: theme.text, fontSize: scaled.itemTitle, lineHeight: scaled.itemTitleLineHeight }]}>
              Nenhuma mensagem por enquanto
            </Text>
            <Text style={[styles.itemBody, { color: theme.textSoft, fontSize: scaled.itemBody, lineHeight: scaled.itemBodyLineHeight }]}>
              Assim que a comunidade enviar um comunicado para sua conta, ele aparecerá aqui.
            </Text>
          </View>
        ) : (
          orderedNotifications.map((notification) => {
            const isSelected = selectedId === notification.id;
            return (
              <Pressable
                key={notification.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isSelected ? theme.secondary : theme.border,
                  },
                ]}
                onPress={() => setSelectedId(isSelected ? null : notification.id)}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[
                        styles.badge,
                        { borderColor: theme.border, backgroundColor: 'transparent' },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: theme.secondary, fontSize: scaled.badgeText }]}>
                        {channelLabel(notification.channel)}
                      </Text>
                    </View>
                    {!notification.isRead ? (
                      <View
                        style={[
                          styles.badge,
                          {
                            borderColor: theme.secondary,
                            backgroundColor: `${theme.secondary}22`,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: theme.secondary, fontSize: scaled.badgeText }]}>
                          Nova
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.metaText, { color: theme.textSoft, fontSize: scaled.metaText }]}>
                    {formatDateTime(notification.deliveredAt)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.itemTitle,
                    { color: theme.text, fontWeight: notification.isRead ? '700' : '800', fontSize: scaled.itemTitle, lineHeight: scaled.itemTitleLineHeight },
                  ]}
                >
                  {notification.title}
                </Text>
                <Text
                  style={[styles.itemBody, { color: theme.textSoft, fontSize: scaled.itemBody, lineHeight: scaled.itemBodyLineHeight }]}
                  numberOfLines={isSelected ? undefined : 2}
                >
                  {notification.body}
                </Text>

                {isSelected ? renderNotificationActions(notification) : null}
              </Pressable>
            );
          })
        )}

        {!!notificationsState.error && (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={{ color: '#FCA5A5' }}>{notificationsState.error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
