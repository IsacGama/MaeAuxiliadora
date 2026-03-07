import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';

import { publicApi } from '../mobile/api';
import { useAuth } from '../mobile/auth-context';
import { notifyAppAlert } from '../mobile/app-alert';
import { scaleFont, useFontScalePreference } from '../mobile/font-scale-preference';
import { HttpError } from '../mobile/http';
import { useOrgContext } from '../mobile/hooks/use-org-context';
import type {
  DevotionalRequest,
  DevotionalRequestPixResponse,
  DevotionalRequestSettings,
  DevotionalRequestType,
  PublicSchedule,
} from '../mobile/types';
import { useAppTheme } from '../mobile/theme';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28, gap: 14 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  title: { fontSize: 21, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  infoLabel: { fontSize: 12, fontWeight: '700' },
  infoText: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  qrImage: {
    width: 210,
    height: 210,
    alignSelf: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  pixCopyCodeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  pixCopyCodeLabel: { fontSize: 11, fontWeight: '700' },
  pixCopyCodeValue: { fontSize: 13, lineHeight: 18 },
});

const TYPE_OPTIONS: Array<{ value: DevotionalRequestType; label: string }> = [
  { value: 'MASS_INTENTION', label: 'Intenção de missa' },
  { value: 'PRAYER_REQUEST', label: 'Pedido de oração' },
];
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] as const;

type PaymentMethod = 'PIX' | 'CARD';

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export default function DevotionalRequestsScreen() {
  const org = useOrgContext();
  const { session, isAuthenticated } = useAuth();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const tabBarHeight = useBottomTabBarHeight();

  const [providerAvailable, setProviderAvailable] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DevotionalRequestSettings | null>(null);
  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [type, setType] = useState<DevotionalRequestType>('MASS_INTENTION');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [intentionFor, setIntentionFor] = useState('');
  const [requestedForDate, setRequestedForDate] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [intentionText, setIntentionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pixResult, setPixResult] = useState<DevotionalRequestPixResponse | null>(null);
  const [requestStatus, setRequestStatus] = useState<DevotionalRequest | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const scaled = useMemo(
    () => ({
      title: scaleFont(21, fontScale),
      subtitle: scaleFont(13, fontScale),
      subtitleLineHeight: scaleFont(20, fontScale),
      infoLabel: scaleFont(12, fontScale),
      infoText: scaleFont(14, fontScale),
      infoTextLineHeight: scaleFont(21, fontScale),
      input: scaleFont(15, fontScale),
      textArea: scaleFont(14, fontScale),
      buttonText: scaleFont(14, fontScale),
      pixCopyCodeLabel: scaleFont(11, fontScale),
      pixCopyCodeValue: scaleFont(13, fontScale),
      pixCopyCodeLineHeight: scaleFont(18, fontScale),
    }),
    [fontScale],
  );

  const amount = useMemo(() => {
    if (!settings) return 5;
    return type === 'MASS_INTENTION' ? settings.massIntentionAmount : settings.prayerRequestAmount;
  }, [settings, type]);

  const enabled = useMemo(() => {
    if (!settings) return false;
    return type === 'MASS_INTENTION' ? settings.massIntentionEnabled : settings.prayerRequestEnabled;
  }, [settings, type]);

  const massSchedules = useMemo(
    () => schedules.filter((item) => item.category === 'MASS' && item.isActive),
    [schedules],
  );

  const pixQrSrc = useMemo(() => {
    if (!pixResult?.pixQrBase64) return null;
    return pixResult.pixQrBase64.startsWith('data:')
      ? pixResult.pixQrBase64
      : `data:image/png;base64,${pixResult.pixQrBase64}`;
  }, [pixResult?.pixQrBase64]);

  const selectedStyle = {
    borderColor: theme.secondary,
    backgroundColor: 'rgba(218, 139, 60, 0.16)',
  };

  const loadData = useCallback(async () => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId) {
      setProviderAvailable(false);
      setProviderError('Organização não identificada.');
      setSettings(null);
      setSchedules([]);
      return;
    }

    setProviderLoading(true);
    try {
      const [provider, config, publicSchedules] = await Promise.all([
        publicApi.fetchGatewayProviderStatus(orgUnitId),
        publicApi.fetchDevotionalRequestSettings(orgUnitId),
        publicApi.fetchPublicSchedules(orgUnitId),
      ]);
      setProviderAvailable(provider.available === true);
      setProviderError(null);
      setSettings(config);
      setSchedules(publicSchedules);
    } catch (error) {
      setProviderAvailable(false);
      setProviderError(messageFromError(error, 'Não foi possível carregar pagamentos e configurações.'));
      setSettings(null);
      setSchedules([]);
    } finally {
      setProviderLoading(false);
    }
  }, [org.entity?.orgUnitId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void org.refresh();
      void loadData();
    }, [loadData, org.refresh]),
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!requesterName.trim() && session?.user?.name?.trim()) {
      setRequesterName(session.user.name.trim());
    }
    if (!requesterEmail.trim() && session?.user?.email?.trim()) {
      setRequesterEmail(session.user.email.trim().toLowerCase());
    }
  }, [isAuthenticated, requesterEmail, requesterName, session?.user?.email, session?.user?.name]);

  useEffect(() => {
    if (!activeRequestId || !org.entity?.orgUnitId) return;

    const poll = async () => {
      try {
        const request = await publicApi.fetchDevotionalRequest(org.entity!.orgUnitId, activeRequestId);
        setRequestStatus(request);
        if (request.status !== 'PENDING_PAYMENT') {
          setActiveRequestId(null);
          if (request.status === 'PENDING_REVIEW') {
            void notifyAppAlert(
              'Solicitação recebida',
              'Pagamento confirmado. Sua solicitação foi enviada para análise.',
              'success',
            );
          }
        }
      } catch {
        // ignora falhas transitórias
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeRequestId, org.entity?.orgUnitId]);

  const onRefresh = useCallback(async () => {
    await Promise.all([org.refresh(), loadData()]);
  }, [loadData, org.refresh]);

  const copyPixCode = useCallback(() => {
    const code = pixResult?.pixCopyPaste?.trim();
    if (!code) {
      void notifyAppAlert('PIX indisponível', 'Nenhum código PIX disponível para copiar.', 'danger');
      return;
    }
    Clipboard.setString(code);
    void notifyAppAlert('Copiado', 'Código PIX copiado para a área de transferência.', 'success');
  }, [pixResult?.pixCopyPaste]);

  const submit = useCallback(async () => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId) {
      void notifyAppAlert('Organização indisponível', 'Não foi possível identificar a organização.', 'danger');
      return;
    }
    if (!providerAvailable) {
      void notifyAppAlert('Pagamento indisponível', 'A organização ainda não conectou o Mercado Pago.', 'danger');
      return;
    }
    if (!enabled) {
      void notifyAppAlert('Solicitação indisponível', 'Este tipo está desabilitado para a organização.', 'danger');
      return;
    }
    if (requesterName.trim().length < 3) {
      void notifyAppAlert('Nome inválido', 'Informe o nome do solicitante.', 'danger');
      return;
    }
    if (!isValidEmail(requesterEmail)) {
      void notifyAppAlert('E-mail inválido', 'Informe um e-mail válido.', 'danger');
      return;
    }
    if (intentionText.trim().length < 8) {
      void notifyAppAlert('Solicitação incompleta', 'Descreva melhor sua intenção ou pedido.', 'danger');
      return;
    }

    const payload = {
      type,
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim().toLowerCase(),
      requesterPhone: requesterPhone.trim() || undefined,
      intentionFor: intentionFor.trim() || undefined,
      intentionText: intentionText.trim(),
      requestedForDate: type === 'MASS_INTENTION' ? requestedForDate.trim() || undefined : undefined,
      scheduleId: type === 'MASS_INTENTION' ? scheduleId || undefined : undefined,
      personId: session?.user?.personId ?? undefined,
    };

    setSubmitting(true);
    try {
      if (paymentMethod === 'PIX') {
        const result = await publicApi.createDevotionalRequestPix(orgUnitId, payload);
        setPixResult(result);
        setActiveRequestId(result.requestId);
        void notifyAppAlert('PIX gerado', 'Conclua o pagamento para enviar sua solicitação.', 'success');
        return;
      }

      const result = await publicApi.createDevotionalRequestCardCheckout(orgUnitId, payload);
      setActiveRequestId(result.requestId);
      const checkoutUrl = (result.checkoutUrl || result.sandboxCheckoutUrl || '').trim();
      if (!checkoutUrl) {
        void notifyAppAlert('Checkout indisponível', 'Não foi possível iniciar o checkout.', 'danger');
        return;
      }

      const supported = await Linking.canOpenURL(checkoutUrl);
      if (!supported) {
        void notifyAppAlert('Link inválido', 'Não foi possível abrir o checkout.', 'danger');
        return;
      }

      await Linking.openURL(checkoutUrl);
    } catch (error) {
      void notifyAppAlert(
        'Falha ao criar solicitação',
        messageFromError(error, 'Tente novamente em instantes.'),
        'danger',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    enabled,
    intentionFor,
    intentionText,
    org.entity?.orgUnitId,
    paymentMethod,
    providerAvailable,
    requestedForDate,
    scheduleId,
    requesterEmail,
    requesterName,
    requesterPhone,
    session?.user?.personId,
    type,
  ]);

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={org.isRefreshing || providerLoading}
            onRefresh={onRefresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Intenções e oração</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
            Solicite uma intenção de missa ou envie um pedido de oração para {org.displayName}.
          </Text>
        </View>

        {!providerLoading && !providerAvailable && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Pagamento online indisponível</Text>
            <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              {providerError || 'A organização ainda não conectou o Mercado Pago para receber solicitações online.'}
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Tipo de solicitação</Text>
          <View style={styles.chipWrap}>
            {TYPE_OPTIONS.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.chip,
                    { borderColor: theme.border, backgroundColor: theme.bg },
                    selected ? selectedStyle : null,
                  ]}
                  onPress={() => setType(option.value)}
                >
                  <Text style={{ color: selected ? theme.secondary : theme.textSoft, fontWeight: selected ? '700' : '500', fontSize: scaled.infoText }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
            Valor configurado: R$ {amount.toFixed(2)}
          </Text>
          {!!settings?.publicInstructions && (
            <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              {settings.publicInstructions}
            </Text>
          )}

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Forma de pagamento</Text>
          <View style={styles.row}>
            {(['PIX', 'CARD'] as PaymentMethod[]).map((option) => {
              const selected = paymentMethod === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.button,
                    { flex: 1, borderColor: theme.border, backgroundColor: theme.bg },
                    selected ? selectedStyle : null,
                  ]}
                  onPress={() => setPaymentMethod(option)}
                >
                  <Text style={{ color: selected ? theme.secondary : theme.textSoft, fontWeight: '700', fontSize: scaled.buttonText }}>
                    {option === 'PIX' ? 'PIX' : 'Cartão'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Nome do solicitante</Text>
          <TextInput
            value={requesterName}
            onChangeText={setRequesterName}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholder="Seu nome"
            placeholderTextColor={theme.textSoft}
          />

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>E-mail</Text>
          <TextInput
            value={requesterEmail}
            onChangeText={(text) => setRequesterEmail(text.trim().toLowerCase())}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholder="voce@email.com"
            placeholderTextColor={theme.textSoft}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Telefone</Text>
          <TextInput
            value={requesterPhone}
            onChangeText={setRequesterPhone}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholder="(88) 99999-9999"
            placeholderTextColor={theme.textSoft}
            keyboardType="phone-pad"
          />

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Intenção por</Text>
          <TextInput
            value={intentionFor}
            onChangeText={setIntentionFor}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholder="Pessoa, família ou intenção"
            placeholderTextColor={theme.textSoft}
          />

          {type === 'MASS_INTENTION' && (
            <>
              <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Horário da missa</Text>
              {!!massSchedules.length ? (
                <View style={styles.chipWrap}>
                  <Pressable
                    style={[
                      styles.chip,
                      { borderColor: theme.border, backgroundColor: theme.bg },
                      !scheduleId ? selectedStyle : null,
                    ]}
                    onPress={() => setScheduleId('')}
                  >
                    <Text style={{ color: !scheduleId ? theme.secondary : theme.textSoft, fontWeight: !scheduleId ? '700' : '500', fontSize: scaled.infoText }}>
                      Definir depois
                    </Text>
                  </Pressable>
                  {massSchedules.map((schedule) => {
                    const selected = scheduleId === schedule.id;
                    return (
                      <Pressable
                        key={schedule.id}
                        style={[
                          styles.chip,
                          { borderColor: theme.border, backgroundColor: theme.bg },
                          selected ? selectedStyle : null,
                        ]}
                        onPress={() => setScheduleId(schedule.id)}
                      >
                        <Text style={{ color: selected ? theme.secondary : theme.textSoft, fontWeight: selected ? '700' : '500', fontSize: scaled.infoText }}>
                          {schedule.label || 'Missa'} · {WEEKDAY_LABELS[schedule.dayOfWeek] || '-'} · {schedule.startTime}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
                  Nenhum horário de missa ativo cadastrado. Você ainda pode enviar a intenção e a secretaria define o horário depois.
                </Text>
              )}

              <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Data desejada</Text>
              <TextInput
                value={requestedForDate}
                onChangeText={setRequestedForDate}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={theme.textSoft}
              />
            </>
          )}

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>
            {type === 'MASS_INTENTION' ? 'Texto da intenção' : 'Pedido de oração'}
          </Text>
          <TextInput
            value={intentionText}
            onChangeText={setIntentionText}
            style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.textArea }]}
            placeholder={type === 'MASS_INTENTION' ? 'Descreva a intenção da missa' : 'Descreva o pedido de oração'}
            placeholderTextColor={theme.textSoft}
            multiline
            numberOfLines={5}
          />

          <Pressable
            style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
            onPress={() => {
              void submit();
            }}
            disabled={submitting || providerLoading || !providerAvailable}
          >
            {submitting ? <ActivityIndicator size="small" color={theme.secondary} /> : null}
            <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.buttonText }}>
              {submitting
                ? 'Processando...'
                : paymentMethod === 'PIX'
                  ? 'Gerar PIX e enviar'
                  : 'Continuar no checkout'}
            </Text>
          </Pressable>
        </View>

        {pixResult && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>PIX da solicitação</Text>
            <Text style={[styles.infoText, { color: theme.secondary, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              Valor: R$ {pixResult.amount.toFixed(2)}
            </Text>
            {!!pixResult.pixExpiresAt && (
              <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
                Expira em: {new Date(pixResult.pixExpiresAt).toLocaleString('pt-BR')}
              </Text>
            )}
            {!!pixQrSrc && <Image source={{ uri: pixQrSrc }} style={styles.qrImage} resizeMode="contain" />}
            <View style={[styles.pixCopyCodeBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
              <Text style={[styles.pixCopyCodeLabel, { color: theme.secondary, fontSize: scaled.pixCopyCodeLabel }]}>PIX copia e cola</Text>
              <Text selectable style={[styles.pixCopyCodeValue, { color: theme.text, fontSize: scaled.pixCopyCodeValue, lineHeight: scaled.pixCopyCodeLineHeight }]}>
                {pixResult.pixCopyPaste || 'Código não disponível'}
              </Text>
            </View>
            <Pressable
              style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
              onPress={copyPixCode}
              disabled={!pixResult.pixCopyPaste}
            >
              <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.buttonText }}>Copiar PIX copia e cola</Text>
            </Pressable>
          </View>
        )}

        {requestStatus && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Status da solicitação</Text>
            <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              Situação: {requestStatus.status}
            </Text>
            <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              Pagamento: {requestStatus.gatewayPaymentStatus || 'N/D'}
            </Text>
            {!!requestStatus.schedule && (
              <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
                Missa vinculada: {requestStatus.schedule.label || 'Missa'} · {WEEKDAY_LABELS[requestStatus.schedule.dayOfWeek] || '-'} · {requestStatus.schedule.startTime}
                {requestStatus.schedule.location ? ` · ${requestStatus.schedule.location}` : ''}
              </Text>
            )}
            {!!requestStatus.reviewNotes && (
              <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
                Observação: {requestStatus.reviewNotes}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
