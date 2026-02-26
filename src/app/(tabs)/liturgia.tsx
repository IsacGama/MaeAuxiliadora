import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { DayKeyPicker } from '../../mobile/components/day-key-picker';
import { formatDateLabel } from '../../mobile/date';
import { useDailyLiturgy } from '../../mobile/hooks/use-daily-liturgy';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
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
  block: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.9,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
  },
  reference: {
    fontSize: 13,
    fontWeight: '700',
  },
  refreshButton: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

const readingSections: Array<{
  key: 'primeiraLeitura' | 'salmo' | 'segundaLeitura' | 'evangelho' | 'extras';
  title: string;
}> = [
  { key: 'primeiraLeitura', title: 'Primeira Leitura' },
  { key: 'salmo', title: 'Salmo' },
  { key: 'segundaLeitura', title: 'Segunda Leitura' },
  { key: 'evangelho', title: 'Evangelho' },
  { key: 'extras', title: 'Leituras Extras' },
];

export default function LiturgyScreen() {
  const liturgy = useDailyLiturgy();
  const org = useOrgContext();
  const { resolvedMode } = useThemePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  useEffect(() => {
    if (!liturgy.dateMismatch) {
      return;
    }

    Alert.alert(
      'Liturgia indisponível',
      `Ainda não há liturgia para ${formatDateLabel(liturgy.dateMismatch.requestedDate)}. Exibimos ${formatDateLabel(
        liturgy.dateMismatch.payloadDate,
      )}.`,
      [{ text: 'OK', onPress: liturgy.clearDateMismatch }],
      { cancelable: true, onDismiss: liturgy.clearDateMismatch },
    );
  }, [liturgy.clearDateMismatch, liturgy.dateMismatch]);

  if (liturgy.isLoading && !liturgy.liturgy) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.secondary} />
        <Text style={{ marginTop: 10, color: theme.textSoft }}>Carregando liturgia diária...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
        refreshControl={
          <RefreshControl
            refreshing={liturgy.isRefreshing}
            onRefresh={liturgy.refresh}
            tintColor={theme.secondary}
            colors={[theme.secondary, theme.primary]}
          />
        }
      >
        <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <DayKeyPicker
            value={liturgy.selectedDate}
            onChange={liturgy.setDate}
            theme={theme}
            label="Data da liturgia"
            title="Escolher data da liturgia"
          />
        </View>

        {liturgy.isLoading && !!liturgy.liturgy && (
          <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.secondary} />
              <Text style={[styles.text, { color: theme.textSoft }]}>Carregando a data selecionada...</Text>
            </View>
          </View>
        )}

        <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.title, { color: theme.primary }]}>{liturgy.liturgy?.liturgia ?? 'Liturgia diária'}</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>
            {liturgy.liturgy?.data ?? 'Sem data'} • {liturgy.liturgy?.cor ?? 'Cor não informada'}
          </Text>
          <Pressable
            style={[styles.refreshButton, { borderColor: theme.secondary }]}
            onPress={liturgy.refresh}
          >
            <Text style={{ color: theme.secondary, fontWeight: '700' }}>Atualizar agora</Text>
          </Pressable>
          {!!liturgy.error && <Text style={{ color: '#FCA5A5' }}>{liturgy.error}</Text>}
        </View>

        {!!liturgy.liturgy?.oracoes?.coleta && (
          <View style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Orações</Text>
            {!!liturgy.liturgy.oracoes?.coleta && (
              <Text style={[styles.text, { color: theme.text }]}>Coleta: {liturgy.liturgy.oracoes.coleta}</Text>
            )}
            {!!liturgy.liturgy.oracoes?.oferendas && (
              <Text style={[styles.text, { color: theme.text }]}>Oferendas: {liturgy.liturgy.oracoes.oferendas}</Text>
            )}
            {!!liturgy.liturgy.oracoes?.comunhao && (
              <Text style={[styles.text, { color: theme.text }]}>Comunhão: {liturgy.liturgy.oracoes.comunhao}</Text>
            )}
          </View>
        )}

        {readingSections.map((section) => {
          const items = liturgy.liturgy?.leituras?.[section.key];
          if (!items || items.length === 0) {
            return null;
          }

          return (
            <View key={section.key} style={[styles.block, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>{section.title}</Text>
              {items.map((item, index) => (
                <View key={`${section.key}-${index}`} style={{ gap: 6 }}>
                  <Text style={[styles.reference, { color: theme.secondary }]}>{item.titulo} ({item.referencia})</Text>
                  <Text style={[styles.text, { color: theme.text }]}>{item.texto}</Text>
                  {!!item.refrao && <Text style={[styles.text, { color: theme.textSoft }]}>R: {item.refrao}</Text>}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
