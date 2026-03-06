import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { authApi } from '../mobile/api';
import { useAppTheme, withAlpha } from '../mobile/theme';

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  infoName: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoMeta: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  textButton: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  textButtonLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
  },
});

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const theme = useAppTheme();
  const tokenValue = useMemo(
    () => (Array.isArray(token) ? token[0] : token)?.trim() ?? '',
    [token],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [preview, setPreview] = useState<{
    name: string;
    email: string;
    expiresAt: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [requestEmail, setRequestEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!tokenValue) {
        setPreview(null);
        setPreviewError('Link de redefinição inválido ou ausente.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setPreview(null);
      setPreviewError(null);
      setNotice(null);
      setError(null);

      try {
        const result = await authApi.previewPasswordReset(tokenValue);
        if (cancelled) return;
        setPreview(result);
        setRequestEmail(result.email);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Link inválido ou expirado.';
        setPreview(null);
        setPreviewError(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [tokenValue]);

  const onComplete = async () => {
    if (!tokenValue) {
      setError('Link de redefinição inválido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação da senha não confere.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await authApi.completePasswordReset({
        token: tokenValue,
        password,
      });
      setNotice(result.message);
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.replace('/(tabs)/conta');
      }, 800);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível redefinir a senha.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const targetEmail = requestEmail.trim().toLowerCase();
    if (!targetEmail) {
      setError('Informe o e-mail da conta.');
      return;
    }

    setResending(true);
    setError(null);
    setNotice(null);

    try {
      const result = await authApi.requestPasswordReset(targetEmail);
      setNotice(result.message);
      setRequestEmail(result.email);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível reenviar o link.';
      setError(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: withAlpha(theme.primary, 0.14) },
                ]}
              >
                <MaterialCommunityIcons
                  name="lock-reset"
                  size={28}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                Redefinir senha
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                Defina uma nova senha com segurança e volte ao app com o acesso liberado.
              </Text>
            </View>

            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <ActivityIndicator size="large" color={theme.secondary} />
              </View>
            ) : preview ? (
              <>
                <View
                  style={[
                    styles.infoCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: withAlpha(theme.primary, 0.06),
                    },
                  ]}
                >
                  <Text style={[styles.infoName, { color: theme.text }]}>
                    {preview.name}
                  </Text>
                  <Text style={[styles.infoMeta, { color: theme.textSoft }]}>
                    {preview.email}
                  </Text>
                  <Text style={[styles.infoMeta, { color: theme.textSoft }]}>
                    Link válido até{' '}
                    {new Date(preview.expiresAt).toLocaleString('pt-BR')}
                  </Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={[styles.label, { color: theme.text }]}>Nova senha</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.surfaceOpaque,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor={theme.textSoft}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    Confirmar nova senha
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.surfaceOpaque,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Repita a nova senha"
                    placeholderTextColor={theme.textSoft}
                  />
                </View>

                {!!notice && (
                  <View
                    style={[
                      styles.notice,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: withAlpha(theme.secondary, 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: theme.secondary }]}>
                      {notice}
                    </Text>
                  </View>
                )}

                {!!error && (
                  <View
                    style={[
                      styles.notice,
                      {
                        borderColor: theme.destructive,
                        backgroundColor: withAlpha(theme.destructive, 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: theme.destructive }]}>
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    void onComplete();
                  }}
                  disabled={submitting}
                  style={[
                    styles.button,
                    {
                      borderColor: theme.primary,
                      backgroundColor: theme.primary,
                      opacity: submitting ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: theme.primaryForeground }]}>
                    {submitting ? 'Salvando...' : 'Salvar nova senha'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View
                  style={[
                    styles.notice,
                    {
                        borderColor: theme.accent,
                        backgroundColor: withAlpha(theme.accent, 0.14),
                      },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: theme.accent }]}>
                      {previewError ?? 'Link inválido ou expirado.'}
                    </Text>
                  </View>

                <View style={{ gap: 8 }}>
                  <Text style={[styles.label, { color: theme.text }]}>Reenviar por e-mail</Text>
                  <TextInput
                    value={requestEmail}
                    onChangeText={setRequestEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.surfaceOpaque,
                        color: theme.text,
                      },
                    ]}
                    placeholder="seuemail@exemplo.com"
                    placeholderTextColor={theme.textSoft}
                  />
                </View>

                {!!notice && (
                  <View
                    style={[
                      styles.notice,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: withAlpha(theme.secondary, 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: theme.secondary }]}>
                      {notice}
                    </Text>
                  </View>
                )}

                {!!error && (
                  <View
                    style={[
                      styles.notice,
                      {
                        borderColor: theme.destructive,
                        backgroundColor: withAlpha(theme.destructive, 0.12),
                      },
                    ]}
                  >
                    <Text style={[styles.noticeText, { color: theme.destructive }]}>
                      {error}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => {
                    void onResend();
                  }}
                  disabled={resending}
                  style={[
                    styles.button,
                    {
                      borderColor: theme.secondary,
                      backgroundColor: theme.secondary,
                      opacity: resending ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: theme.secondaryForeground }]}>
                    {resending ? 'Reenviando...' : 'Enviar novo link'}
                  </Text>
                </Pressable>
              </>
            )}

            <Pressable
              onPress={() => router.replace('/(tabs)/conta')}
              style={styles.textButton}
            >
              <Text style={[styles.textButtonLabel, { color: theme.primary }]}>
                Voltar para a conta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
