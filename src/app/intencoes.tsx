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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { publicApi } from '../mobile/api';
import { useAuth } from '../mobile/auth-context';
import { notifyAppAlert } from '../mobile/app-alert';
import { DayKeyPicker } from '../mobile/components/day-key-picker';
import { parseDayKey } from '../mobile/date';
import { scaleFont, useFontScalePreference } from '../mobile/font-scale-preference';
import { HttpError } from '../mobile/http';
import { useOrgContext } from '../mobile/hooks/use-org-context';
import { useMemberDashboard } from '../mobile/hooks/use-member-dashboard';
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
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const toMoneyInput = (raw: string) => {
  const digits = onlyDigits(raw);
  if (!digits) return '';
  const normalized = (Number(digits) / 100).toFixed(2).replace('.', ',');
  const [integer, decimal] = normalized.split(',');
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInteger},${decimal}`;
};
const moneyFromNumber = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const parseMoneyInput = (value: string) => {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export default function DevotionalRequestsScreen() {
  const org = useOrgContext();
  const { session, isAuthenticated } = useAuth();
  const memberDashboard = useMemberDashboard();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const insets = useSafeAreaInsets();

  const [providerAvailable, setProviderAvailable] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [settings, setSettings] = useState<DevotionalRequestSettings | null>(null);
  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [type, setType] = useState<DevotionalRequestType>('MASS_INTENTION');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [amountInput, setAmountInput] = useState('');
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

  const minimumAmount = useMemo(() => {
    if (!settings) return 5;
    return type === 'MASS_INTENTION' ? settings.massIntentionAmount : settings.prayerRequestAmount;
  }, [settings, type]);
  const amount = useMemo(() => {
    const parsed = parseMoneyInput(amountInput);
    if (parsed <= 0) return minimumAmount;
    return parsed;
  }, [amountInput, minimumAmount]);

  const enabled = useMemo(() => {
    if (!settings) return false;
    return type === 'MASS_INTENTION' ? settings.massIntentionEnabled : settings.prayerRequestEnabled;
  }, [settings, type]);

  const massSchedules = useMemo(
    () => schedules.filter((item) => item.category === 'MASS' && item.isActive),
    [schedules],
  );
  const requestedWeekday = useMemo(() => {
    if (!requestedForDate) return null;
    const parsed = parseDayKey(requestedForDate);
    return parsed ? parsed.getDay() : null;
  }, [requestedForDate]);
  const filteredMassSchedules = useMemo(() => {
    if (requestedWeekday === null) return [];
    return massSchedules.filter((item) => item.dayOfWeek === requestedWeekday);
  }, [massSchedules, requestedWeekday]);
  const devotionalEnabled = useMemo(
    () => Boolean(settings?.massIntentionEnabled || settings?.prayerRequestEnabled),
    [settings?.massIntentionEnabled, settings?.prayerRequestEnabled],
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
    if (!isAuthenticated) return;
    if (requesterPhone.trim()) return;
    const phone = memberDashboard.dashboard?.person?.primaryPhone?.trim();
    if (phone) {
      setRequesterPhone(phone);
    }
  }, [isAuthenticated, memberDashboard.dashboard?.person?.primaryPhone, requesterPhone]);

  useEffect(() => {
    if (!minimumAmount) return;
    setAmountInput((current) => {
      const parsed = parseMoneyInput(current);
      if (!current || parsed < minimumAmount) {
        return moneyFromNumber(minimumAmount);
      }
      return current;
    });
  }, [minimumAmount, type]);

  useEffect(() => {
    if (!scheduleId) return;
    if (!filteredMassSchedules.some((schedule) => schedule.id === scheduleId)) {
      setScheduleId('');
    }
  }, [filteredMassSchedules, scheduleId]);

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
    if (amount < minimumAmount) {
      void notifyAppAlert(
        'Valor inválido',
        `Informe um valor igual ou maior que R$ ${minimumAmount.toFixed(2)}.`,
        'danger',
      );
      return;
    }
    if (!isAnonymous && requesterName.trim().length < 3) {
      void notifyAppAlert('Nome inválido', 'Informe o nome do solicitante.', 'danger');
      return;
    }
    if (!isAnonymous && !isValidEmail(requesterEmail)) {
      void notifyAppAlert('E-mail inválido', 'Informe um e-mail válido.', 'danger');
      return;
    }
    if (intentionText.trim().length < 8) {
      void notifyAppAlert('Solicitação incompleta', 'Descreva melhor sua intenção ou pedido.', 'danger');
      return;
    }

    const payload = {
      type,
      requesterName: isAnonymous ? undefined : requesterName.trim(),
      requesterEmail: isAnonymous ? undefined : requesterEmail.trim().toLowerCase(),
      requesterPhone: requesterPhone.trim() || undefined,
      intentionFor: intentionFor.trim() || undefined,
      intentionText: intentionText.trim(),
      requestedForDate: type === 'MASS_INTENTION' ? requestedForDate.trim() || undefined : undefined,
      scheduleId: type === 'MASS_INTENTION' ? scheduleId || undefined : undefined,
      personId: session?.user?.personId ?? undefined,
      isAnonymous,
      amount: Number(amount.toFixed(2)),
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
    isAnonymous,
    minimumAmount,
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
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
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

        {!providerLoading && providerAvailable && !devotionalEnabled && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Intenções indisponíveis</Text>
            <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
              Esta organização desativou solicitações de intenção e pedidos de oração no painel administrativo.
            </Text>
          </View>
        )}

        {providerAvailable && devotionalEnabled && (
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

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Valor da oferta (R$)</Text>
          <TextInput
            value={amountInput}
            onChangeText={(text) => setAmountInput(toMoneyInput(text))}
            placeholder="5,00"
            keyboardType="numeric"
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholderTextColor={theme.textSoft}
          />
          <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
            Valor mínimo configurado: R$ {moneyFromNumber(minimumAmount)}
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

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Identificação</Text>
          <Pressable
            style={[
              styles.button,
              { borderColor: theme.border, backgroundColor: theme.bg, justifyContent: 'space-between' },
              isAnonymous ? selectedStyle : null,
            ]}
            onPress={() => setIsAnonymous((current) => !current)}
          >
            <Text style={{ color: isAnonymous ? theme.secondary : theme.textSoft, fontWeight: '700', fontSize: scaled.buttonText }}>
              Enviar de forma anônima
            </Text>
            <Text style={{ color: isAnonymous ? theme.secondary : theme.textSoft, fontSize: scaled.buttonText }}>
              {isAnonymous ? 'Ligado' : 'Desligado'}
            </Text>
          </Pressable>

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Nome do solicitante</Text>
          <TextInput
            value={requesterName}
            onChangeText={setRequesterName}
            editable={!isAnonymous}
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg, fontSize: scaled.input }]}
            placeholder="Seu nome"
            placeholderTextColor={theme.textSoft}
          />

          <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>E-mail</Text>
          <TextInput
            value={requesterEmail}
            onChangeText={(text) => setRequesterEmail(text.trim().toLowerCase())}
            editable={!isAnonymous}
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
              <DayKeyPicker
                value={requestedForDate}
                onChange={setRequestedForDate}
                theme={theme}
                label="Data desejada da missa"
                hint="Escolha a data para filtrar os horários"
                title="Selecionar data da missa"
              />

              <Text style={[styles.infoLabel, { color: theme.secondary, fontSize: scaled.infoLabel }]}>Horário da missa</Text>
              {!requestedForDate ? (
                <Text style={[styles.infoText, { color: theme.textSoft, fontSize: scaled.infoText, lineHeight: scaled.infoTextLineHeight }]}>
                  Selecione primeiro a data desejada para listar os horários disponíveis nesse dia.
                </Text>
              ) : !!filteredMassSchedules.length ? (
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
                  {filteredMassSchedules.map((schedule) => {
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
                  Não há missa cadastrada para o dia selecionado. Você ainda pode enviar a intenção e a secretaria define o horário depois.
                </Text>
              )}
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
        )}

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
