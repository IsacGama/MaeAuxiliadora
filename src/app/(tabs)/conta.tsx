import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../mobile/auth-context';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useMemberDashboard } from '../../mobile/hooks/use-member-dashboard';
import { createTheme } from '../../mobile/theme';
import { authApi, publicApi } from '../../mobile/api';
import { ChapelPublic, ParishPublic } from '../../mobile/types';

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
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerList: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  streakRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

export default function AccountScreen() {
  const {
    session,
    isLoading: authLoading,
    isAuthenticated,
    login,
    register,
    logout,
    requestWithAuth,
  } = useAuth();
  const dashboard = useMemberDashboard();
  const org = useOrgContext();
  const theme = useMemo(() => createTheme(org.branding), [org.branding]);

  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [selectedParishId, setSelectedParishId] = useState<string>('');
  const [selectedChapelId, setSelectedChapelId] = useState<string>('');

  const [parishes, setParishes] = useState<ParishPublic[]>([]);
  const [chapels, setChapels] = useState<ChapelPublic[]>([]);
  const [loadingParishes, setLoadingParishes] = useState(false);
  const [loadingChapels, setLoadingChapels] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [titherSubmitting, setTitherSubmitting] = useState(false);

  const setChapelsIfNeeded = (next: ChapelPublic[]) => {
    setChapels(next);
    if (selectedChapelId && !next.some((chapel) => chapel.id === selectedChapelId)) {
      setSelectedChapelId('');
    }
  };

  useEffect(() => {
    if (isAuthenticated) return;

    const loadParishes = async () => {
      setLoadingParishes(true);
      try {
        const result = await publicApi.fetchPublicParishes();
        setParishes(result);
        if (!selectedParishId && result.length === 1) {
          setSelectedParishId(result[0].id);
        }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível carregar as paróquias.');
      } finally {
        setLoadingParishes(false);
      }
    };

    void loadParishes();
  }, [isAuthenticated, selectedParishId]);

  useEffect(() => {
    if (!selectedParishId || isAuthenticated) {
      setChapelsIfNeeded([]);
      return;
    }

    const loadChapels = async () => {
      setLoadingChapels(true);
      try {
        const result = await publicApi.fetchPublicChapels(selectedParishId);
        setChapelsIfNeeded(result);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível carregar as capelas.');
      } finally {
        setLoadingChapels(false);
      }
    };

    void loadChapels();
  }, [isAuthenticated, selectedParishId]);

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setSubmitError('Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await login(email.trim(), password);
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível fazer login.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setSubmitError('Preencha nome, e-mail e senha.');
      return;
    }
    if (registerPassword.length < 6) {
      setSubmitError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (registerPassword !== registerPasswordConfirm) {
      setSubmitError('A confirmação de senha não confere.');
      return;
    }
    if (!selectedParishId) {
      setSubmitError('Selecione a paróquia.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await register({
        name: registerName.trim(),
        email: registerEmail.trim().toLowerCase(),
        password: registerPassword,
        parishId: selectedParishId,
        chapelId: selectedChapelId || undefined,
      });
      setRegisterPassword('');
      setRegisterPasswordConfirm('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar sua conta.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleTither = async (isActive: boolean) => {
    setTitherSubmitting(true);
    setSubmitError(null);
    try {
      await requestWithAuth((token) =>
        isActive ? authApi.unenrollTither(token) : authApi.enrollTither(token),
      );
      await dashboard.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o status de dizimista.';
      setSubmitError(message);
    } finally {
      setTitherSubmitting(false);
    }
  };

  const onLogout = async () => {
    await logout();
    Alert.alert('Sessão encerrada', 'Você saiu da conta neste dispositivo.');
  };

  if (authLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.secondary} />
      </View>
    );
  }

  const activeTither = dashboard.dashboard?.titherProfiles?.find((profile) => profile.status === 'ACTIVE');
  const streak = dashboard.dashboard?.titheSummary.currentStreakMonths ?? 0;
  const fireCount = Math.min(Math.max(streak, 0), 12);
  const selectedParish = parishes.find((parish) => parish.id === selectedParishId);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          isAuthenticated ? (
            <RefreshControl
              refreshing={dashboard.isRefreshing}
              onRefresh={dashboard.refresh}
              tintColor={theme.secondary}
              colors={[theme.secondary, theme.primary]}
            />
          ) : undefined
        }
      >
        {!isAuthenticated ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggleButton,
                  {
                    borderColor: mode === 'login' ? theme.secondary : theme.border,
                    backgroundColor: mode === 'login' ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setMode('login');
                  setSubmitError(null);
                }}
              >
                <Text style={[styles.buttonText, { color: mode === 'login' ? theme.secondary : theme.textSoft }]}>
                  Entrar
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleButton,
                  {
                    borderColor: mode === 'register' ? theme.secondary : theme.border,
                    backgroundColor: mode === 'register' ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                  },
                ]}
                onPress={() => {
                  setMode('register');
                  setSubmitError(null);
                }}
              >
                <Text style={[styles.buttonText, { color: mode === 'register' ? theme.secondary : theme.textSoft }]}>
                  Cadastrar
                </Text>
              </Pressable>
            </View>

            {mode === 'login' ? (
              <>
                <Text style={[styles.title, { color: theme.text }]}>Entrar como fiel</Text>
                <Text style={[styles.subtitle, { color: theme.textSoft }]}>Acesse seu perfil para acompanhar seu dízimo.</Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Senha"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />

                <Pressable
                  style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
                  onPress={onLogin}
                  disabled={submitting}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary }]}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: theme.text }]}>Criar conta de fiel</Text>
                <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                  Escolha sua paróquia e, se for o caso, sua capela.
                </Text>

                <TextInput
                  value={registerName}
                  onChangeText={setRegisterName}
                  placeholder="Nome completo"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry
                  placeholder="Senha (mínimo 6 caracteres)"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />
                <TextInput
                  value={registerPasswordConfirm}
                  onChangeText={setRegisterPasswordConfirm}
                  secureTextEntry
                  placeholder="Confirmar senha"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                />

                <Text style={[styles.statLabel, { color: theme.textSoft }]}>Paróquia</Text>
                {loadingParishes ? (
                  <ActivityIndicator size="small" color={theme.secondary} />
                ) : (
                  <View style={[styles.pickerList, { borderColor: theme.border }]}>
                    {parishes.map((parish, index) => (
                      <Pressable
                        key={parish.id}
                        style={[
                          styles.pickerOption,
                          {
                            borderBottomColor: theme.border,
                            borderBottomWidth: index === parishes.length - 1 ? 0 : StyleSheet.hairlineWidth,
                            backgroundColor: selectedParishId === parish.id ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          setSelectedParishId(parish.id);
                          setSelectedChapelId('');
                        }}
                      >
                        <Text style={{ color: theme.text, fontWeight: selectedParishId === parish.id ? '700' : '500' }}>
                          {parish.name}
                        </Text>
                        {!!parish.diocese?.name && (
                          <Text style={{ color: theme.textSoft, fontSize: 12 }}>{parish.diocese.name}</Text>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}

                {!!selectedParishId && (
                  <>
                    <Text style={[styles.statLabel, { color: theme.textSoft }]}>
                      Capela (opcional - se não escolher, fica na paróquia)
                    </Text>
                    {loadingChapels ? (
                      <ActivityIndicator size="small" color={theme.secondary} />
                    ) : chapels.length ? (
                      <View style={[styles.pickerList, { borderColor: theme.border }]}>
                        <Pressable
                          style={[
                            styles.pickerOption,
                            {
                              borderBottomColor: theme.border,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              backgroundColor: selectedChapelId ? 'transparent' : 'rgba(218, 139, 60, 0.16)',
                            },
                          ]}
                          onPress={() => setSelectedChapelId('')}
                        >
                          <Text style={{ color: theme.text, fontWeight: selectedChapelId ? '500' : '700' }}>
                            Sem capela (usar paróquia)
                          </Text>
                        </Pressable>
                        {chapels.map((chapel, index) => (
                          <Pressable
                            key={chapel.id}
                            style={[
                              styles.pickerOption,
                              {
                                borderBottomColor: theme.border,
                                borderBottomWidth: index === chapels.length - 1 ? 0 : StyleSheet.hairlineWidth,
                                backgroundColor: selectedChapelId === chapel.id ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                              },
                            ]}
                            onPress={() => setSelectedChapelId(chapel.id)}
                          >
                            <Text style={{ color: theme.text, fontWeight: selectedChapelId === chapel.id ? '700' : '500' }}>
                              {chapel.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: theme.textSoft }}>
                        {selectedParish ? `${selectedParish.name} não possui capelas cadastradas.` : 'Nenhuma capela disponível.'}
                      </Text>
                    )}
                  </>
                )}

                <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                  Não encontrou sua paróquia ou capela? Fale com o pároco ou com a secretaria da sua comunidade para
                  verificarem a ativação do app.
                </Text>

                <Pressable
                  style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
                  onPress={onRegister}
                  disabled={submitting || loadingParishes}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary }]}>
                    {submitting ? 'Cadastrando...' : 'Criar conta e entrar'}
                  </Text>
                </Pressable>
              </>
            )}

            {!!submitError && <Text style={{ color: '#FCA5A5' }}>{submitError}</Text>}
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Minha conta</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>{session?.user.name}</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft }]}>{session?.user.email}</Text>

              <Pressable
                style={[styles.button, { borderColor: '#F87171', backgroundColor: 'rgba(248, 113, 113, 0.14)' }]}
                onPress={onLogout}
              >
                <Text style={[styles.buttonText, { color: '#FCA5A5' }]}>Sair</Text>
              </Pressable>
            </View>

            {dashboard.isLoading && !dashboard.dashboard ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.secondary} />
                <Text style={{ color: theme.textSoft }}>Carregando seu painel...</Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.title, { color: theme.text }]}>Resumo do dízimo</Text>
                  <View style={styles.statRow}>
                    <View style={[styles.statItem, { borderColor: theme.border }]}>
                      <Text style={[styles.statLabel, { color: theme.textSoft }]}>Total</Text>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {money(dashboard.dashboard?.titheSummary.totalTithed ?? 0)}
                      </Text>
                    </View>
                    <View style={[styles.statItem, { borderColor: theme.border }]}>
                      <Text style={[styles.statLabel, { color: theme.textSoft }]}>Contribuições</Text>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {dashboard.dashboard?.titheSummary.titheCount ?? 0}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statItem, { borderColor: theme.border }]}>
                    <Text style={[styles.statLabel, { color: theme.textSoft }]}>Sequência no dízimo</Text>
                    <View style={styles.streakRow}>
                      {fireCount ? (
                        Array.from({ length: fireCount }).map((_, index) => (
                          <MaterialCommunityIcons key={`fire-${index}`} name="fire" size={20} color="#FB923C" />
                        ))
                      ) : (
                        <MaterialCommunityIcons name="fire-off" size={20} color={theme.textSoft} />
                      )}
                      <Text style={[styles.streakText, { color: theme.text }]}>
                        {streak} {streak === 1 ? 'mês seguido' : 'meses seguidos'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.title, { color: theme.text }]}>Status dizimista</Text>
                  {dashboard.dashboard?.titherProfiles?.length ? (
                    dashboard.dashboard.titherProfiles.map((profile) => (
                      <View key={profile.id} style={[styles.statItem, { borderColor: theme.border }]}>
                        <Text style={[styles.statLabel, { color: theme.textSoft }]}>Envelope</Text>
                        <Text style={[styles.statValue, { color: theme.text }]}>{profile.envelopeCode ?? 'Sem código'}</Text>
                        <Text style={{ color: profile.status === 'ACTIVE' ? '#4ADE80' : '#FCA5A5', fontWeight: '700' }}>
                          {profile.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: theme.textSoft }}>Nenhum cadastro de dizimista encontrado.</Text>
                  )}

                  <Pressable
                    style={[
                      styles.button,
                      {
                        borderColor: activeTither ? '#F87171' : theme.secondary,
                        backgroundColor: activeTither ? 'rgba(248, 113, 113, 0.14)' : 'rgba(218, 139, 60, 0.16)',
                      },
                    ]}
                    onPress={() => void onToggleTither(Boolean(activeTither))}
                    disabled={titherSubmitting}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: activeTither ? '#FCA5A5' : theme.secondary },
                      ]}
                    >
                      {titherSubmitting
                        ? 'Salvando...'
                        : activeTither
                          ? 'Desativar cadastro de dizimista'
                          : 'Quero me cadastrar como dizimista'}
                    </Text>
                  </Pressable>
                  {!!dashboard.error && <Text style={{ color: '#FCA5A5' }}>{dashboard.error}</Text>}
                  {!!submitError && <Text style={{ color: '#FCA5A5' }}>{submitError}</Text>}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
