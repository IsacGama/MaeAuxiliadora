import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../mobile/auth-context';
import { authApi } from '../../../mobile/api';
import { scaleFont, useFontScalePreference } from '../../../mobile/font-scale-preference';
import { useAppTheme } from '../../../mobile/theme';
import { notifyAppAlert } from '../../../mobile/app-alert';

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
    fontSize: 14,
    lineHeight: 21,
  },
  actionButton: {
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 11,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default function EventCheckInScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { isAuthenticated, requestWithAuth } = useAuth();
  const theme = useAppTheme();
  const { fontScale } = useFontScalePreference();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const scaled = useMemo(
    () => ({
      title: scaleFont(22, fontScale),
      subtitle: scaleFont(14, fontScale),
      subtitleLineHeight: scaleFont(21, fontScale),
      button: scaleFont(14, fontScale),
      back: scaleFont(14, fontScale),
    }),
    [fontScale],
  );

  const handleCheckIn = async () => {
    if (typeof token !== 'string' || !token.trim()) {
      void notifyAppAlert('Check-in', 'Token inválido.', 'danger');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestWithAuth((accessToken) =>
        authApi.checkInEventByToken(accessToken, token),
      );

      if (result.alreadyCheckedIn) {
        setStatusLabel('Presença já registrada anteriormente.');
      } else {
        setStatusLabel('Check-in registrado com sucesso.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível registrar presença.';
      void notifyAppAlert('Check-in', message, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            style={[styles.backButton, { borderColor: theme.border }]}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={theme.secondary} />
            <Text style={{ color: theme.secondary, fontWeight: '700', fontSize: scaled.back }}>Voltar</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.text, fontSize: scaled.title }]}>Check-in do evento</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
            Use esta tela para confirmar sua presença no evento.
          </Text>

          {!isAuthenticated ? (
            <>
              <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
                Faça login na sua conta para finalizar o check-in.
              </Text>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.secondary }]}
                onPress={() => router.replace('/(tabs)/conta')}
              >
                <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.button }]}>
                  Ir para login
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.actionButton, { borderColor: theme.secondary, opacity: isSubmitting ? 0.7 : 1 }]}
                onPress={() => {
                  void handleCheckIn();
                }}
                disabled={isSubmitting}
              >
                <Text style={[styles.actionButtonText, { color: theme.secondary, fontSize: scaled.button }]}>
                  Confirmar check-in
                </Text>
              </Pressable>

              {isSubmitting ? (
                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <ActivityIndicator size="small" color={theme.secondary} />
                </View>
              ) : null}

              {!!statusLabel && (
                <Text style={[styles.subtitle, { color: theme.secondary, fontSize: scaled.subtitle, lineHeight: scaled.subtitleLineHeight }]}>
                  {statusLabel}
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
