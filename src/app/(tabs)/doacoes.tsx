import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useAuth } from '../../mobile/auth-context';
import { useMemberDashboard } from '../../mobile/hooks/use-member-dashboard';
import { publicApi } from '../../mobile/api';
import { HttpError } from '../../mobile/http';
import { GatewayDonationIntent, GatewayPixPaymentResponse } from '../../mobile/types';
import { useAppTheme } from '../../mobile/theme';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  chipWrap: {
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  pixCopyCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  pixCopyCodeValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

type AddressInput = {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

type DonationMethod = 'PIX' | 'CARD';

const INTENT_OPTIONS: Array<{ value: GatewayDonationIntent; label: string }> = [
  { value: 'TITHE', label: 'Dízimo' },
  { value: 'OFFERING', label: 'Oferta' },
  { value: 'DONATION', label: 'Doação' },
  { value: 'EVENT', label: 'Evento' },
  { value: 'OTHER', label: 'Outra' },
];

const hasAddressData = (address?: AddressInput | null) =>
  Boolean(address && Object.values(address).some((item) => Boolean(item)));

const buildMapsUrl = (address?: AddressInput | null) => {
  if (!hasAddressData(address)) return null;
  const parts = [
    address?.street,
    address?.number,
    address?.neighborhood,
    address?.city,
    address?.state,
    address?.zipCode,
  ].filter(Boolean);
  if (!parts.length) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
};

const formatAddress = (address?: AddressInput | null) => {
  if (!hasAddressData(address)) return null;
  const line1 = [address?.street, address?.number, address?.neighborhood].filter(Boolean).join(', ');
  const line2 = [address?.city, address?.state, address?.zipCode].filter(Boolean).join(' - ');
  return [line1, line2].filter(Boolean).join('\n');
};

const normalizeExternalUrl = (url?: string | null) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const normalizeWhatsappUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  const internationalDigits =
    digits.startsWith('55')
      ? digits
      : digits.length === 10 || digits.length === 11
        ? `55${digits}`
        : digits;
  return `https://wa.me/${internationalDigits}`;
};

const toMoneyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const integer = digits.slice(0, -2) || '0';
  const decimal = digits.slice(-2).padStart(2, '0');
  const normalizedInteger = String(Number(integer));
  return `${normalizedInteger},${decimal}`;
};

const parseMoneyInput = (value: string) => {
  if (!value.trim()) return 0;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(2));
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof HttpError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};

export default function DonationsScreen() {
  const { session, isAuthenticated } = useAuth();
  const memberDashboard = useMemberDashboard();
  const org = useOrgContext();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useAppTheme();

  const [providerAvailable, setProviderAvailable] = useState(false);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);

  const [method, setMethod] = useState<DonationMethod>('PIX');
  const [intent, setIntent] = useState<GatewayDonationIntent>('DONATION');
  const [amountInput, setAmountInput] = useState('20,00');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixResult, setPixResult] = useState<GatewayPixPaymentResponse | null>(null);
  const [gatewayPaymentId, setGatewayPaymentId] = useState<string | null>(null);
  const isTitheIntent = intent === 'TITHE';

  const socialRaw = org.branding?.socialLinks ?? {};
  const socialLinks = [
    { key: 'whatsapp', label: 'WhatsApp', href: normalizeWhatsappUrl(socialRaw.whatsapp) },
    { key: 'facebook', label: 'Facebook', href: normalizeExternalUrl(socialRaw.facebook) },
    { key: 'instagram', label: 'Instagram', href: normalizeExternalUrl(socialRaw.instagram) },
    { key: 'youtube', label: 'YouTube', href: normalizeExternalUrl(socialRaw.youtube) },
  ].filter((item): item is { key: string; label: string; href: string } => Boolean(item.href));

  const rawEntity = org.entity?.raw as {
    city?: string;
    state?: string;
    address?: AddressInput | null;
  } | undefined;

  const about = (org.branding?.extra?.about as { address?: AddressInput | null } | undefined) ?? {};
  const address = hasAddressData(about.address)
    ? about.address
    : (rawEntity?.address ?? {
      city: rawEntity?.city,
      state: rawEntity?.state,
    });
  const mapsUrl = buildMapsUrl(address);
  const addressText = formatAddress(address);

  const amount = useMemo(() => parseMoneyInput(amountInput), [amountInput]);
  const isActiveTitherInOrg = useMemo(() => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId) return false;
    return (
      memberDashboard.dashboard?.titherProfiles?.some(
        (profile) => profile.orgId === orgUnitId && profile.status === 'ACTIVE',
      ) ?? false
    );
  }, [memberDashboard.dashboard?.titherProfiles, org.entity?.orgUnitId]);
  const pixQrSrc = useMemo(() => {
    if (!pixResult?.pixQrBase64) return null;
    return pixResult.pixQrBase64.startsWith('data:')
      ? pixResult.pixQrBase64
      : `data:image/png;base64,${pixResult.pixQrBase64}`;
  }, [pixResult?.pixQrBase64]);

  const loadProviderStatus = useCallback(async () => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId) {
      setProviderAvailable(false);
      setProviderError('Organização não identificada para doação.');
      return;
    }

    setProviderLoading(true);
    try {
      const status = await publicApi.fetchGatewayProviderStatus(orgUnitId);
      setProviderAvailable(status.available === true);
      setProviderError(null);
    } catch (error) {
      setProviderAvailable(false);
      setProviderError(messageFromError(error, 'Não foi possível verificar pagamentos online.'));
    } finally {
      setProviderLoading(false);
    }
  }, [org.entity?.orgUnitId]);

  const pollGatewayStatus = useCallback(async () => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId || !gatewayPaymentId) return;

    try {
      const status = await publicApi.fetchGatewayPaymentStatus(orgUnitId, gatewayPaymentId);
      if (status.status !== 'PENDING') {
        if (status.status === 'PAID') {
          Alert.alert('Pagamento confirmado', 'Recebemos sua contribuição com sucesso.');
        } else if (status.status === 'FAILED' || status.status === 'CANCELED') {
          Alert.alert('Pagamento não concluído', 'Confira os dados e tente novamente.');
        }
        setGatewayPaymentId(null);
      }
    } catch {
      // não bloqueia fluxo principal
    }
  }, [gatewayPaymentId, org.entity?.orgUnitId]);

  useEffect(() => {
    void loadProviderStatus();
  }, [loadProviderStatus]);

  useFocusEffect(
    useCallback(() => {
      void org.refresh();
      void loadProviderStatus();
    }, [loadProviderStatus, org.refresh]),
  );

  useEffect(() => {
    if (!gatewayPaymentId) return;

    const timer = setInterval(() => {
      void pollGatewayStatus();
    }, 5000);

    return () => {
      clearInterval(timer);
    };
  }, [gatewayPaymentId, pollGatewayStatus]);

  useEffect(() => {
    if ((method === 'CARD' || isTitheIntent) && anonymous) {
      setAnonymous(false);
    }
  }, [anonymous, isTitheIntent, method]);

  useEffect(() => {
    if (!isAuthenticated || anonymous) return;

    if (!donorName.trim() && session?.user?.name?.trim()) {
      setDonorName(session.user.name.trim());
    }
    if (!donorEmail.trim() && session?.user?.email?.trim()) {
      setDonorEmail(session.user.email.trim().toLowerCase());
    }
  }, [anonymous, donorEmail, donorName, isAuthenticated, session?.user?.email, session?.user?.name]);

  const onRefresh = useCallback(async () => {
    await Promise.all([org.refresh(), loadProviderStatus()]);
  }, [loadProviderStatus, org.refresh]);

  const copyPixCode = useCallback(() => {
    const code = pixResult?.pixCopyPaste?.trim();
    if (!code) {
      Alert.alert('PIX indisponível', 'Nenhum código PIX disponível para copiar.');
      return;
    }
    Clipboard.setString(code);
    Alert.alert('Copiado', 'Código PIX copiado para a área de transferência.');
  }, [pixResult?.pixCopyPaste]);

  const validateForm = () => {
    if (amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return false;
    }

    const effectiveAnonymous = isTitheIntent ? false : anonymous;

    if (isTitheIntent) {
      if (!isAuthenticated || !session?.user?.personId) {
        Alert.alert(
          'Login obrigatório',
          'Para doar dízimo, entre com sua conta de fiel.',
        );
        return false;
      }
      if (!isActiveTitherInOrg) {
        Alert.alert(
          'Dizimista obrigatório',
          'Para doar dízimo, você precisa estar cadastrado como dizimista ativo nesta organização.',
        );
        return false;
      }
    }

    if (!effectiveAnonymous) {
      if (donorName.trim().length < 3) {
        Alert.alert('Nome inválido', 'Informe o nome completo do doador.');
        return false;
      }
      if (!isValidEmail(donorEmail)) {
        Alert.alert('E-mail inválido', 'Informe um e-mail válido para o doador.');
        return false;
      }
    }

    return true;
  };

  const submitDonation = useCallback(async () => {
    const orgUnitId = org.entity?.orgUnitId;
    if (!orgUnitId) {
      Alert.alert('Organização indisponível', 'Não foi possível identificar a organização da doação.');
      return;
    }

    if (!providerAvailable) {
      Alert.alert(
        'Pagamento indisponível',
        'A organização ainda não conectou o Mercado Pago.',
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payloadBase = {
      amount,
      intent,
      description: description.trim() || undefined,
      anonymous: isTitheIntent ? false : anonymous,
      donorName: isTitheIntent || !anonymous ? donorName.trim() : undefined,
      donorEmail:
        isTitheIntent || !anonymous
          ? donorEmail.trim().toLowerCase()
          : undefined,
      personId:
        isTitheIntent || !anonymous ? (session?.user?.personId ?? undefined) : undefined,
    };

    setIsSubmitting(true);
    try {
      if (method === 'PIX') {
        const result = await publicApi.createGatewayPixDonation(orgUnitId, {
          ...payloadBase,
          expiresInMinutes: 30,
        });
        setPixResult(result);
        setGatewayPaymentId(result.id);
        Alert.alert('PIX gerado', 'Use o QR Code ou PIX copia e cola para concluir a doação.');
        return;
      }

      const result = await publicApi.createGatewayCardCheckout(orgUnitId, payloadBase);
      setGatewayPaymentId(result.id);
      const checkoutUrl = (result.checkoutUrl || result.sandboxCheckoutUrl || '').trim();
      if (!checkoutUrl) {
        Alert.alert('Checkout indisponível', 'Não foi possível iniciar o pagamento com cartão.');
        return;
      }

      const supported = await Linking.canOpenURL(checkoutUrl);
      if (!supported) {
        Alert.alert('Link inválido', 'Não foi possível abrir o checkout do Mercado Pago.');
        return;
      }

      await Linking.openURL(checkoutUrl);
    } catch (error) {
      Alert.alert('Falha ao processar doação', messageFromError(error, 'Tente novamente em instantes.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amount,
    anonymous,
    description,
    donorEmail,
    donorName,
    intent,
    isActiveTitherInOrg,
    isAuthenticated,
    isTitheIntent,
    method,
    org.entity?.orgUnitId,
    providerAvailable,
    session?.user?.personId,
  ]);

  const methodSelectedStyle = {
    borderColor: theme.secondary,
    backgroundColor: 'rgba(218, 139, 60, 0.16)',
  };

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
          <Text style={[styles.title, { color: theme.primary }]}>Doações</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}> 
            Contribua com {org.displayName}. Pagamentos via Mercado Pago com PIX dinâmico e cartão.
          </Text>
          {!isAuthenticated && (
            <Text style={[styles.infoText, { color: theme.textSoft }]}> 
              Você pode doar de forma anônima ou preencher seu nome e e-mail para identificação.
            </Text>
          )}
        </View>

        {!providerLoading && !providerAvailable && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.title, { color: theme.primary }]}>Pagamento online indisponível</Text>
            <Text style={[styles.infoText, { color: theme.textSoft }]}> 
              {providerError || 'A organização ainda não conectou o Mercado Pago para receber doações online.'}
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.infoLabel, { color: theme.secondary }]}>Forma de pagamento</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.methodButton,
                { borderColor: theme.border, backgroundColor: theme.bg },
                method === 'PIX' ? methodSelectedStyle : null,
              ]}
              onPress={() => setMethod('PIX')}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={16} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>PIX</Text>
            </Pressable>
            <Pressable
              style={[
                styles.methodButton,
                { borderColor: theme.border, backgroundColor: theme.bg },
                method === 'CARD' ? methodSelectedStyle : null,
              ]}
              onPress={() => setMethod('CARD')}
            >
              <MaterialCommunityIcons name="credit-card-outline" size={16} color={theme.secondary} />
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Cartão</Text>
            </Pressable>
          </View>

          <Text style={[styles.infoLabel, { color: theme.secondary }]}>Motivo</Text>
          <View style={styles.chipWrap}>
            {INTENT_OPTIONS.map((option) => {
              const selected = intent === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.chip,
                    { borderColor: theme.border, backgroundColor: theme.bg },
                    selected ? methodSelectedStyle : null,
                  ]}
                  onPress={() => setIntent(option.value)}
                >
                  <Text style={{ color: selected ? theme.secondary : theme.textSoft, fontWeight: selected ? '700' : '500' }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.infoLabel, { color: theme.secondary }]}>Valor (R$)</Text>
          <TextInput
            value={amountInput}
            onChangeText={(text) => setAmountInput(toMoneyInput(text))}
            placeholder="50,00"
            keyboardType="numeric"
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
            placeholderTextColor={theme.textSoft}
          />

          <Text style={[styles.infoLabel, { color: theme.secondary }]}>Mensagem (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
            placeholder="Ex.: contribuição para ação social"
            placeholderTextColor={theme.textSoft}
            multiline
            numberOfLines={4}
            maxLength={280}
          />

          <Pressable
            style={styles.toggleRow}
            disabled={method === 'CARD' || isTitheIntent}
            onPress={() => {
              if (method === 'CARD' || isTitheIntent) return;
              setAnonymous((prev) => !prev);
            }}
          >
            <MaterialCommunityIcons
              name={anonymous ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={20}
              color={theme.secondary}
            />
            <Text style={{ color: theme.text }}>
              {isTitheIntent
                ? 'Dízimo exige identificação do fiel'
                : 'Contribuição anônima'}
            </Text>
          </Pressable>

          {isTitheIntent && (
            <Text style={[styles.infoText, { color: theme.textSoft }]}> 
              Para doar dízimo, é obrigatório estar autenticado e cadastrado como dizimista ativo nesta organização.
            </Text>
          )}

          {method === 'CARD' && (
            <Text style={[styles.infoText, { color: theme.textSoft }]}> 
              No checkout do Mercado Pago, Google Pay/Apple Pay podem aparecer automaticamente quando suportados.
            </Text>
          )}

          {!anonymous && (
            <>
              <Text style={[styles.infoLabel, { color: theme.secondary }]}>Nome do doador</Text>
              <TextInput
                value={donorName}
                onChangeText={setDonorName}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                placeholder="Seu nome"
                placeholderTextColor={theme.textSoft}
                maxLength={120}
              />

              <Text style={[styles.infoLabel, { color: theme.secondary }]}>E-mail do doador</Text>
              <TextInput
                value={donorEmail}
                onChangeText={(text) => setDonorEmail(text.trim().toLowerCase())}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bg }]}
                placeholder="voce@email.com"
                placeholderTextColor={theme.textSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                maxLength={160}
              />
            </>
          )}

          <Pressable
            style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
            onPress={() => {
              void submitDonation();
            }}
            disabled={isSubmitting || providerLoading || !providerAvailable}
          >
            {isSubmitting ? <ActivityIndicator size="small" color={theme.secondary} /> : null}
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>
              {isSubmitting
                ? 'Processando...'
                : method === 'PIX'
                  ? 'Gerar PIX dinâmico'
                  : 'Continuar no checkout do cartão'}
            </Text>
          </Pressable>
        </View>

        {pixResult && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.title, { color: theme.primary }]}>PIX dinâmico</Text>
            <Text style={[styles.infoText, { color: theme.secondary }]}> 
              Valor: R$ {pixResult.amount.toFixed(2)}
            </Text>
            {!!pixResult.pixExpiresAt && (
              <Text style={[styles.infoText, { color: theme.textSoft }]}> 
                Expira em: {new Date(pixResult.pixExpiresAt).toLocaleString('pt-BR')}
              </Text>
            )}
            {!!pixQrSrc && <Image source={{ uri: pixQrSrc }} style={styles.qrImage} resizeMode="contain" />}

            <View style={[styles.pixCopyCodeBox, { borderColor: theme.border, backgroundColor: theme.bg }]}> 
              <Text style={[styles.pixCopyCodeLabel, { color: theme.secondary }]}>PIX copia e cola</Text>
              <Text selectable style={[styles.pixCopyCodeValue, { color: theme.text }]}> 
                {pixResult.pixCopyPaste || 'Código não disponível'}
              </Text>
            </View>

            <Pressable
              style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
              onPress={copyPixCode}
              disabled={!pixResult.pixCopyPaste}
            >
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Copiar PIX copia e cola</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.primary }]}>Localização</Text>
          <Text style={[styles.infoText, { color: theme.textSoft }]}> 
            {addressText || 'Endereço ainda não configurado.'}
          </Text>
          {!!mapsUrl && (
            <Pressable
              style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
              onPress={() => {
                void Linking.openURL(mapsUrl);
              }}
            >
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Abrir no Google Maps</Text>
            </Pressable>
          )}
        </View>

        {socialLinks.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.title, { color: theme.primary }]}>Redes sociais</Text>
            <View style={styles.socialRow}>
              {socialLinks.map((social) => (
                <Pressable
                  key={social.key}
                  style={[styles.socialButton, { borderColor: theme.border }]}
                  onPress={() => {
                    void Linking.openURL(social.href);
                  }}
                >
                  <MaterialCommunityIcons
                    name={
                      social.key === 'whatsapp'
                        ? 'whatsapp'
                        : social.key === 'facebook'
                          ? 'facebook'
                          : social.key === 'instagram'
                            ? 'instagram'
                            : 'youtube'
                    }
                    size={14}
                    color={theme.secondary}
                  />
                  <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: 12 }}>{social.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
