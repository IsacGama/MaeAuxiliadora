import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAuth } from '../../mobile/auth-context';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useMemberDashboard } from '../../mobile/hooks/use-member-dashboard';
import { createThemeWithMode } from '../../mobile/theme';
import { authApi, publicApi } from '../../mobile/api';
import { ChapelPublic, ParishPublic } from '../../mobile/types';
import { ThemePreference, useThemePreference } from '../../mobile/theme-preference';

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
  selectTrigger: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectTriggerTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectTriggerLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectTriggerHint: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 9,
  },
  modalList: {
    maxHeight: 320,
  },
  modalOption: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 3,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOptionSubtitle: {
    fontSize: 12,
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
  themeOptionButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeOptionText: {
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

const SEARCH_DEBOUNCE_MS = 300;

const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

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
  const { preference, resolvedMode, setPreference } = useThemePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useMemo(
    () => createThemeWithMode(org.branding, resolvedMode),
    [org.branding, resolvedMode],
  );

  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [selectedParishId, setSelectedParishId] = useState<string>('');
  const [selectedChapelId, setSelectedChapelId] = useState<string>('');
  const [parishPickerOpen, setParishPickerOpen] = useState(false);
  const [chapelPickerOpen, setChapelPickerOpen] = useState(false);
  const [parishQuery, setParishQuery] = useState('');
  const [chapelQuery, setChapelQuery] = useState('');
  const [debouncedParishQuery, setDebouncedParishQuery] = useState('');
  const [debouncedChapelQuery, setDebouncedChapelQuery] = useState('');

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

  useEffect(() => {
    setChapelPickerOpen(false);
    setChapelQuery('');
  }, [selectedParishId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParishQuery(parishQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [parishQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedChapelQuery(chapelQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [chapelQuery]);

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
      <SafeAreaView
        edges={['top']}
        style={[styles.screen, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}
      >
        <ActivityIndicator size="large" color={theme.secondary} />
      </SafeAreaView>
    );
  }

  const activeTither = dashboard.dashboard?.titherProfiles?.find((profile) => profile.status === 'ACTIVE');
  const streak = dashboard.dashboard?.titheSummary.currentStreakMonths ?? 0;
  const fireCount = Math.min(Math.max(streak, 0), 12);
  const selectedParish = parishes.find((parish) => parish.id === selectedParishId);
  const selectedChapel = chapels.find((chapel) => chapel.id === selectedChapelId);
  const filteredParishes = useMemo(() => {
    const normalizedQuery = normalizeForSearch(debouncedParishQuery);
    if (!normalizedQuery) {
      return parishes;
    }
    return parishes.filter((parish) => {
      const name = normalizeForSearch(parish.name);
      const dioceseName = normalizeForSearch(parish.diocese?.name ?? '');
      return name.includes(normalizedQuery) || dioceseName.includes(normalizedQuery);
    });
  }, [debouncedParishQuery, parishes]);
  const filteredChapels = useMemo(() => {
    const normalizedQuery = normalizeForSearch(debouncedChapelQuery);
    if (!normalizedQuery) {
      return chapels;
    }
    return chapels.filter((chapel) => normalizeForSearch(chapel.name).includes(normalizedQuery));
  }, [chapels, debouncedChapelQuery]);
  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'SYSTEM', label: 'Sistema' },
    { value: 'LIGHT', label: 'Claro' },
    { value: 'DARK', label: 'Escuro' },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + tabBarHeight }]}
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
                ) : parishes.length ? (
                  <Pressable
                    style={[styles.selectTrigger, { borderColor: theme.border }]}
                    onPress={() => {
                      setParishQuery('');
                      setParishPickerOpen(true);
                    }}
                  >
                    <View style={styles.selectTriggerTextWrap}>
                      <Text style={[styles.selectTriggerLabel, { color: theme.text }]} numberOfLines={1}>
                        {selectedParish?.name ?? 'Escolher paróquia'}
                      </Text>
                      <Text style={[styles.selectTriggerHint, { color: theme.textSoft }]} numberOfLines={1}>
                        {selectedParish?.diocese?.name ??
                          `${parishes.length} ${
                            parishes.length === 1 ? 'paróquia disponível' : 'paróquias disponíveis'
                          }`}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
                  </Pressable>
                ) : (
                  <Text style={{ color: theme.textSoft }}>Nenhuma paróquia disponível.</Text>
                )}

                {!!selectedParishId && (
                  <>
                    <Text style={[styles.statLabel, { color: theme.textSoft }]}>
                      Capela (opcional - se não escolher, fica na paróquia)
                    </Text>
                    {loadingChapels ? (
                      <ActivityIndicator size="small" color={theme.secondary} />
                    ) : chapels.length ? (
                      <Pressable
                        style={[styles.selectTrigger, { borderColor: theme.border }]}
                        onPress={() => {
                          setChapelQuery('');
                          setChapelPickerOpen(true);
                        }}
                      >
                        <View style={styles.selectTriggerTextWrap}>
                          <Text style={[styles.selectTriggerLabel, { color: theme.text }]} numberOfLines={1}>
                            {selectedChapel?.name ?? 'Sem capela (usar paróquia)'}
                          </Text>
                          <Text style={[styles.selectTriggerHint, { color: theme.textSoft }]} numberOfLines={1}>
                            {selectedChapel
                              ? 'Conta vinculada à capela selecionada'
                              : 'Conta vinculada direto à paróquia'}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
                      </Pressable>
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

            <Modal
              visible={parishPickerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setParishPickerOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setParishPickerOpen(false)} />
                <View style={[styles.modalPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Escolher paróquia</Text>
                    <Pressable
                      style={[styles.modalCloseButton, { borderColor: theme.border }]}
                      onPress={() => setParishPickerOpen(false)}
                    >
                      <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
                    </Pressable>
                  </View>

                  <View style={[styles.modalSearchRow, { borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="magnify" size={18} color={theme.textSoft} />
                    <TextInput
                      value={parishQuery}
                      onChangeText={setParishQuery}
                      placeholder="Buscar por nome da paróquia ou diocese"
                      placeholderTextColor={theme.textSoft}
                      style={[styles.modalSearchInput, { color: theme.text }]}
                    />
                  </View>

                  <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                    {filteredParishes.length ? (
                      filteredParishes.map((parish) => (
                        <Pressable
                          key={parish.id}
                          style={[
                            styles.modalOption,
                            {
                              borderColor: theme.border,
                              backgroundColor:
                                selectedParishId === parish.id ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setSelectedParishId(parish.id);
                            setSelectedChapelId('');
                            setParishPickerOpen(false);
                            setParishQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionTitle,
                              { color: theme.text, fontWeight: selectedParishId === parish.id ? '800' : '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {parish.name}
                          </Text>
                          {!!parish.diocese?.name && (
                            <Text style={[styles.modalOptionSubtitle, { color: theme.textSoft }]} numberOfLines={1}>
                              {parish.diocese.name}
                            </Text>
                          )}
                        </Pressable>
                      ))
                    ) : (
                      <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                        Nenhuma paróquia encontrada para "{parishQuery.trim()}".
                      </Text>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Modal
              visible={chapelPickerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setChapelPickerOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={() => setChapelPickerOpen(false)} />
                <View style={[styles.modalPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Escolher capela</Text>
                    <Pressable
                      style={[styles.modalCloseButton, { borderColor: theme.border }]}
                      onPress={() => setChapelPickerOpen(false)}
                    >
                      <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
                    </Pressable>
                  </View>

                  <View style={[styles.modalSearchRow, { borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="magnify" size={18} color={theme.textSoft} />
                    <TextInput
                      value={chapelQuery}
                      onChangeText={setChapelQuery}
                      placeholder="Buscar capela"
                      placeholderTextColor={theme.textSoft}
                      style={[styles.modalSearchInput, { color: theme.text }]}
                    />
                  </View>

                  <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                    <Pressable
                      style={[
                        styles.modalOption,
                        {
                          borderColor: theme.border,
                          backgroundColor: selectedChapelId ? 'transparent' : 'rgba(218, 139, 60, 0.16)',
                        },
                      ]}
                      onPress={() => {
                        setSelectedChapelId('');
                        setChapelPickerOpen(false);
                        setChapelQuery('');
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionTitle,
                          { color: theme.text, fontWeight: selectedChapelId ? '700' : '800' },
                        ]}
                      >
                        Sem capela (usar paróquia)
                      </Text>
                      <Text style={[styles.modalOptionSubtitle, { color: theme.textSoft }]}>
                        Recomendado para quem participa direto na matriz
                      </Text>
                    </Pressable>

                    {filteredChapels.length ? (
                      filteredChapels.map((chapel) => (
                        <Pressable
                          key={chapel.id}
                          style={[
                            styles.modalOption,
                            {
                              borderColor: theme.border,
                              backgroundColor:
                                selectedChapelId === chapel.id ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setSelectedChapelId(chapel.id);
                            setChapelPickerOpen(false);
                            setChapelQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionTitle,
                              { color: theme.text, fontWeight: selectedChapelId === chapel.id ? '800' : '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {chapel.name}
                          </Text>
                        </Pressable>
                      ))
                    ) : chapelQuery.trim() ? (
                      <Text style={[styles.subtitle, { color: theme.textSoft }]}>
                        Nenhuma capela encontrada para "{chapelQuery.trim()}".
                      </Text>
                    ) : null}
                  </ScrollView>
                </View>
              </View>
            </Modal>

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

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Aparência</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft }]}>
            Tema atual: {resolvedMode === 'dark' ? 'Escuro' : 'Claro'}
          </Text>
          <View style={styles.toggleRow}>
            {themeOptions.map((option) => {
              const active = preference === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.themeOptionButton,
                    {
                      borderColor: active ? theme.secondary : theme.border,
                      backgroundColor: active ? 'rgba(218, 139, 60, 0.16)' : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    void setPreference(option.value);
                  }}
                >
                  <Text style={[styles.themeOptionText, { color: active ? theme.secondary : theme.textSoft }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
