import { useCallback, useMemo } from 'react';
import {
  Alert,
  Clipboard,
  Image,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useAuth } from '../../mobile/auth-context';
import { buildPixPayload, buildPixQrImageUrl } from '../../mobile/pix';
import { createThemeWithMode } from '../../mobile/theme';
import { useThemePreference } from '../../mobile/theme-preference';

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
  pixKeyText: {
    fontSize: 16,
    fontWeight: '700',
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
  qrImage: {
    width: 210,
    height: 210,
    alignSelf: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
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

export default function DonationsScreen() {
  const { isAuthenticated } = useAuth();
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

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

  const pixKey = (org.branding?.pixKey ?? '').trim();
  const pixKeyType = org.branding?.pixKeyType?.trim() || 'PIX';
  const merchantCity = rawEntity?.address?.city ?? rawEntity?.city ?? 'BRASILIA';
  const pixPayload = pixKey
    ? buildPixPayload({
        key: pixKey,
        keyType: pixKeyType,
        merchantName: org.displayName,
        merchantCity,
        description: `Doacao ${org.displayName}`,
      })
    : null;
  const pixQrUrl = pixPayload ? buildPixQrImageUrl(pixPayload, 420) : null;
  const pixCopyCode = pixPayload || pixKey;

  const onRefresh = useCallback(async () => {
    await org.refresh();
  }, [org.refresh]);

  useFocusEffect(
    useCallback(() => {
      void org.refresh();
    }, [org.refresh]),
  );

  const copyPixCode = useCallback(() => {
    if (!pixCopyCode) {
      Alert.alert('PIX indisponível', 'Nenhum código PIX configurado no momento.');
      return;
    }
    Clipboard.setString(pixCopyCode);
    Alert.alert('Copiado', 'Código PIX copiado para a área de transferência.');
  }, [pixCopyCode]);

  if (!isAuthenticated) {
    return (
      <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
          refreshControl={
            <RefreshControl
              refreshing={org.isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.secondary}
              colors={[theme.secondary, theme.primary]}
            />
          }
        >
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.primary }]}>Doações</Text>
            <Text style={[styles.subtitle, { color: theme.textSoft }]}>
              Faça login para ver os dados de doação da sua paróquia/capela e abrir a localização no Google Maps.
            </Text>
            <Pressable
              style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
              onPress={() => router.push('/conta')}
            >
              <Text style={{ color: theme.secondary, fontWeight: '700' }}>Ir para login/cadastro</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={org.isRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.primary }]}>Doações da comunidade</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>
            Contribua com segurança via PIX e acompanhe os dados oficiais da sua comunidade.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.primary }]}>PIX</Text>
          <Text style={[styles.infoLabel, { color: theme.secondary }]}>
            Chave {pixKeyType.toUpperCase()}
          </Text>
          <Text style={[styles.pixKeyText, { color: theme.secondary }]}>
            {pixKey || 'Chave PIX não configurada'}
          </Text>
          {!!pixQrUrl && <Image source={{ uri: pixQrUrl }} style={styles.qrImage} resizeMode="contain" />}
          {!pixQrUrl && (
            <Text style={[styles.infoText, { color: theme.textSoft }]}>
              O QR Code aparecerá quando a chave PIX estiver disponível.
            </Text>
          )}
          {!!pixCopyCode && (
            <>
              <View style={[styles.pixCopyCodeBox, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={[styles.pixCopyCodeLabel, { color: theme.secondary }]}>PIX copia e cola</Text>
                <Text selectable style={[styles.pixCopyCodeValue, { color: theme.text }]}>
                  {pixCopyCode}
                </Text>
              </View>
              <Pressable
                style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
                onPress={copyPixCode}
              >
                <Text style={{ color: theme.secondary, fontWeight: '700' }}>
                  {pixPayload ? 'Copiar PIX copia e cola' : 'Copiar chave PIX'}
                </Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.primary }]}>Dados bancários</Text>
          <Text style={[styles.infoText, { color: theme.secondary }]}>
            Banco: {org.branding?.bankName || 'Não informado'}
          </Text>
          <Text style={[styles.infoText, { color: theme.secondary }]}>
            Agência: {org.branding?.bankAgency || 'Não informado'}
          </Text>
          <Text style={[styles.infoText, { color: theme.secondary }]}>
            Conta: {org.branding?.bankAccount || 'Não informado'}
          </Text>
          <Text style={[styles.infoText, { color: theme.secondary }]}>
            Titular: {org.branding?.bankHolder || 'Não informado'}
          </Text>
        </View>

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
