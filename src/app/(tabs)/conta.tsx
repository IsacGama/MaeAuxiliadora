import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { router } from 'expo-router';
import { useAuth } from '../../mobile/auth-context';
import { useOrgContext } from '../../mobile/hooks/use-org-context';
import { useMemberDashboard } from '../../mobile/hooks/use-member-dashboard';
import { useAppTheme, withAlpha } from '../../mobile/theme';
import { authApi, publicApi } from '../../mobile/api';
import { ChapelPublic, ParishPublic } from '../../mobile/types';
import { ThemePreference, useThemePreference } from '../../mobile/theme-preference';
import { FontScalePreference, scaleFont, useFontScalePreference } from '../../mobile/font-scale-preference';
import { AppAlertDialog } from '../../mobile/components/app-alert-dialog';

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
    flexWrap: 'wrap',
  },
  toggleButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  genderOptionText: {
    fontSize: 12,
    fontWeight: '700',
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
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const money = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

const SEARCH_DEBOUNCE_MS = 300;

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

const isValidCpf = (value: string) => {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(cpf[10]);
};

const formatPhoneBR = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidPhoneBR = (value: string) => {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
};

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
    changePassword,
    logout,
    requestWithAuth,
  } = useAuth();
  const dashboard = useMemberDashboard();
  const org = useOrgContext();
  const { preference, resolvedMode, setPreference } = useThemePreference();
  const {
    preference: fontScalePreference,
    fontScale,
    setPreference: setFontScalePreference,
  } = useFontScalePreference();
  const tabBarHeight = useBottomTabBarHeight();
  const theme = useAppTheme();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCpf, setRegisterCpf] = useState('');
  const [registerGender, setRegisterGender] = useState<
    'MALE' | 'FEMALE' | 'OTHER' | 'UNDECLARED'
  >('UNDECLARED');
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
  const [queuedAccessEmail, setQueuedAccessEmail] = useState<string | null>(null);
  const [accountSetupNotice, setAccountSetupNotice] = useState<string | null>(null);
  const [resendingAccessEmail, setResendingAccessEmail] = useState(false);
  const [requestingPasswordReset, setRequestingPasswordReset] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordChangeSubmitting, setPasswordChangeSubmitting] = useState(false);
  const [passwordChangeNotice, setPasswordChangeNotice] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [postLogoutNotice, setPostLogoutNotice] = useState<string | null>(null);
  const [registerConsentLgpd, setRegisterConsentLgpd] = useState(false);

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
      const selectedParish = parishes.find((parish) => parish.id === selectedParishId);
      const parishOrgId = selectedParish?.orgUnit?.id;
      if (!parishOrgId) {
        setChapelsIfNeeded([]);
        return;
      }
      setLoadingChapels(true);
      try {
        const result = await publicApi.fetchPublicChapels(parishOrgId);
        setChapelsIfNeeded(result);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Não foi possível carregar as capelas.');
      } finally {
        setLoadingChapels(false);
      }
    };

    void loadChapels();
  }, [isAuthenticated, parishes, selectedParishId]);

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

  const onLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setSubmitError('Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await login(email.trim(), password);
      setQueuedAccessEmail(null);
      setAccountSetupNotice(null);
      setPasswordChangeNotice(null);
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível fazer login.';
      if (/conta ainda não ativada|verifique seu e-mail/i.test(message)) {
        setQueuedAccessEmail(email.trim().toLowerCase());
        setAccountSetupNotice(
          'Sua conta ainda precisa ser ativada pelo e-mail. Abra o link enviado e depois faça login.',
        );
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async () => {
    if (!registerName.trim() || !registerEmail.trim()) {
      setSubmitError('Preencha nome e e-mail.');
      return;
    }
    if (!registerPhone.trim()) {
      setSubmitError('Informe o telefone.');
      return;
    }
    if (!isValidPhoneBR(registerPhone)) {
      setSubmitError('Telefone inválido.');
      return;
    }
    if (!registerCpf.trim()) {
      setSubmitError('Informe o CPF.');
      return;
    }
    if (!isValidCpf(registerCpf)) {
      setSubmitError('CPF inválido.');
      return;
    }
    if (!selectedParishId) {
      setSubmitError('Selecione a paróquia.');
      return;
    }
    if (!registerConsentLgpd) {
      setSubmitError('Aceite a Política de Privacidade e os Termos de Uso para continuar.');
      return;
    }

    const selectedParish = parishes.find((parish) => parish.id === selectedParishId);
    const selectedChapel = chapels.find((chapel) => chapel.id === selectedChapelId);
    const targetOrgId = selectedChapel?.orgUnit?.id ?? selectedParish?.orgUnit?.id;
    if (!targetOrgId) {
      setSubmitError('Não foi possível identificar a organização para cadastro.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await register({
        name: registerName.trim(),
        email: registerEmail.trim().toLowerCase(),
        orgId: targetOrgId,
        primaryPhone: onlyDigits(registerPhone),
        cpf: onlyDigits(registerCpf),
        gender: registerGender,
        consentLgpd: true,
      });
      setAccountSetupNotice(result.message);
      setQueuedAccessEmail(result.email);
      setMode('login');
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPhone('');
      setRegisterCpf('');
      setRegisterGender('UNDECLARED');
      setRegisterConsentLgpd(false);
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar sua conta.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const onResendAccessEmail = async () => {
    const targetEmail = queuedAccessEmail?.trim().toLowerCase();
    if (!targetEmail) {
      setSubmitError('Informe um e-mail válido para reenviar o acesso.');
      return;
    }

    setResendingAccessEmail(true);
    setSubmitError(null);

    try {
      const result = await authApi.requestAccountSetupEmail(targetEmail);
      setAccountSetupNotice(result.message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível reenviar o e-mail de acesso.';
      setSubmitError(message);
    } finally {
      setResendingAccessEmail(false);
    }
  };

  const onRequestPasswordReset = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setSubmitError('Informe o e-mail da conta para recuperar a senha.');
      return;
    }

    setRequestingPasswordReset(true);
    setSubmitError(null);

    try {
      const result = await authApi.requestPasswordReset(targetEmail);
      setAccountSetupNotice(result.message);
      setQueuedAccessEmail(result.email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação de senha.';
      setSubmitError(message);
    } finally {
      setRequestingPasswordReset(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPasswordInput.trim() || !newPasswordInput.trim()) {
      setSubmitError('Preencha a senha atual e a nova senha.');
      return;
    }
    if (newPasswordInput.length < 6) {
      setSubmitError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setSubmitError('A confirmação da nova senha não confere.');
      return;
    }

    setPasswordChangeSubmitting(true);
    setSubmitError(null);

    try {
      await changePassword(currentPasswordInput, newPasswordInput);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordChangeNotice('Senha atualizada com sucesso. Seu acesso foi liberado.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível atualizar a senha.';
      setSubmitError(message);
    } finally {
      setPasswordChangeSubmitting(false);
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
    setLogoutSubmitting(true);
    setSubmitError(null);
    try {
      await logout();
      setPostLogoutNotice('Sessão encerrada com sucesso neste dispositivo.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível sair da conta.';
      setSubmitError(message);
    } finally {
      setLogoutSubmitting(false);
      setLogoutDialogOpen(false);
    }
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
  const mustChangePassword = Boolean(session?.user.mustChangePassword);
  const selectedParish = parishes.find((parish) => parish.id === selectedParishId);
  const selectedChapel = chapels.find((chapel) => chapel.id === selectedChapelId);
  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'SYSTEM', label: 'Sistema' },
    { value: 'LIGHT', label: 'Claro' },
    { value: 'DARK', label: 'Escuro' },
  ];
  const fontScaleOptions: Array<{ value: FontScalePreference; label: string }> = [
    { value: 'DEFAULT', label: 'Padrão' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'LARGE', label: 'Grande' },
    { value: 'EXTRA_LARGE', label: 'Extra grande' },
  ];
  const scaled = useMemo(
    () => ({
      title: scaleFont(20, fontScale),
      subtitle: scaleFont(13, fontScale),
      input: scaleFont(15, fontScale),
      buttonText: scaleFont(14, fontScale),
      statLabel: scaleFont(12, fontScale),
      statValue: scaleFont(18, fontScale),
      genderOptionText: scaleFont(12, fontScale),
      selectTriggerLabel: scaleFont(15, fontScale),
      selectTriggerHint: scaleFont(12, fontScale),
      modalHeaderTitle: scaleFont(17, fontScale),
      modalSearchInput: scaleFont(14, fontScale),
      modalOptionTitle: scaleFont(14, fontScale),
      modalOptionSubtitle: scaleFont(12, fontScale),
      streakText: scaleFont(13, fontScale),
      themeOptionText: scaleFont(13, fontScale),
      noticeText: scaleFont(13, fontScale),
    }),
    [fontScale],
  );

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
        {!!postLogoutNotice && !isAuthenticated && (
          <View
            style={[
              styles.noticeCard,
              {
                borderColor: theme.secondary,
                backgroundColor: withAlpha(theme.secondary, 0.12),
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: theme.secondary, fontSize: scaled.noticeText }]}>
              {postLogoutNotice}
            </Text>
          </View>
        )}

        {!!accountSetupNotice && !isAuthenticated && (
          <View
            style={[
              styles.noticeCard,
              {
                borderColor: theme.secondary,
                backgroundColor: withAlpha(theme.secondary, 0.12),
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: theme.secondary, fontSize: scaled.noticeText }]}>
              {accountSetupNotice}
            </Text>
            {!!queuedAccessEmail && (
              <Pressable
                style={[
                  styles.button,
                  {
                    marginTop: 10,
                    borderColor: theme.secondary,
                    backgroundColor: 'transparent',
                  },
                ]}
                onPress={() => {
                  void onResendAccessEmail();
                }}
                disabled={resendingAccessEmail}
              >
                <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                  {resendingAccessEmail ? 'Reenviando...' : 'Reenviar e-mail de acesso'}
                </Text>
              </Pressable>
            )}
          </View>
        )}

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
                <Text style={[styles.buttonText, { color: mode === 'login' ? theme.secondary : theme.textSoft, fontSize: scaled.buttonText }]}>
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
                <Text style={[styles.buttonText, { color: mode === 'register' ? theme.secondary : theme.textSoft, fontSize: scaled.buttonText }]}>
                  Cadastrar
                </Text>
              </Pressable>
            </View>

            {mode === 'login' ? (
              <>
                <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Entrar como fiel</Text>
                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>Acesse seu perfil para acompanhar seu dízimo.</Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Senha"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />

                <Pressable
                  style={[styles.button, { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' }]}
                  onPress={onLogin}
                  disabled={submitting}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.button, { borderColor: theme.border, backgroundColor: 'transparent' }]}
                  onPress={() => {
                    void onRequestPasswordReset();
                  }}
                  disabled={requestingPasswordReset}
                >
                  <Text style={[styles.buttonText, { color: theme.textSoft, fontSize: scaled.buttonText }]}>
                    {requestingPasswordReset ? 'Enviando link...' : 'Esqueci minha senha'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Criar conta de fiel</Text>
                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                  Escolha sua paróquia e, se for o caso, sua capela. O acesso inicial será enviado por e-mail.
                </Text>

                <TextInput
                  value={registerName}
                  onChangeText={setRegisterName}
                  placeholder="Nome completo"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerPhone}
                  onChangeText={(value) => setRegisterPhone(formatPhoneBR(value))}
                  keyboardType="phone-pad"
                  placeholder="Telefone (88) 99999-9999"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerCpf}
                  onChangeText={(value) => setRegisterCpf(formatCpf(value))}
                  keyboardType="number-pad"
                  placeholder="CPF 000.000.000-00"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />

                <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Gênero</Text>
                <View style={styles.genderRow}>
                  {[
                    { value: 'MALE', label: 'Masculino' },
                    { value: 'FEMALE', label: 'Feminino' },
                    { value: 'OTHER', label: 'Outro' },
                    { value: 'UNDECLARED', label: 'Prefiro não informar' },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.genderOption,
                        {
                          borderColor:
                            registerGender === option.value ? theme.secondary : theme.border,
                          backgroundColor:
                            registerGender === option.value
                              ? 'rgba(218, 139, 60, 0.16)'
                              : 'transparent',
                        },
                      ]}
                      onPress={() => setRegisterGender(option.value as typeof registerGender)}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          {
                            color:
                              registerGender === option.value
                                ? theme.secondary
                                : theme.textSoft,
                            fontSize: scaled.genderOptionText,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Paróquia</Text>
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
                      <Text style={[styles.selectTriggerLabel, { color: theme.text, fontSize: scaled.selectTriggerLabel }]} numberOfLines={1}>
                        {selectedParish?.name ?? 'Escolher paróquia'}
                      </Text>
                      <Text style={[styles.selectTriggerHint, { color: theme.textSoft, fontSize: scaled.selectTriggerHint }]} numberOfLines={1}>
                        {selectedParish?.diocese?.name ??
                          `${parishes.length} ${parishes.length === 1 ? 'paróquia disponível' : 'paróquias disponíveis'
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
                    <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>
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
                          <Text style={[styles.selectTriggerLabel, { color: theme.text, fontSize: scaled.selectTriggerLabel }]} numberOfLines={1}>
                            {selectedChapel?.name ?? 'Sem capela (usar paróquia)'}
                          </Text>
                          <Text style={[styles.selectTriggerHint, { color: theme.textSoft, fontSize: scaled.selectTriggerHint }]} numberOfLines={1}>
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

                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                  Não encontrou sua paróquia ou capela? Fale com o pároco ou com a secretaria da sua comunidade para
                  verificarem a ativação do app.
                </Text>

                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                  onPress={() => setRegisterConsentLgpd((prev) => !prev)}
                >
                  <MaterialCommunityIcons
                    name={registerConsentLgpd ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={theme.secondary}
                  />
                  <Text style={{ color: theme.textSoft, fontSize: scaled.subtitle, flex: 1, lineHeight: 20 }}>
                    Li e aceito a Política de Privacidade e os Termos de Uso
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' },
                    !registerConsentLgpd && { opacity: 0.5 },
                  ]}
                  onPress={onRegister}
                  disabled={submitting || loadingParishes || !registerConsentLgpd}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                    {submitting ? 'Enviando acesso...' : 'Criar conta'}
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
                    <Text style={[styles.modalHeaderTitle, { color: theme.text, fontSize: scaled.modalHeaderTitle }]}>Escolher paróquia</Text>
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
                      style={[styles.modalSearchInput, { color: theme.text, fontSize: scaled.modalSearchInput }]}
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
                              { color: theme.text, fontWeight: selectedParishId === parish.id ? '800' : '700', fontSize: scaled.modalOptionTitle },
                            ]}
                            numberOfLines={1}
                          >
                            {parish.name}
                          </Text>
                          {!!parish.diocese?.name && (
                            <Text style={[styles.modalOptionSubtitle, { color: theme.textSoft, fontSize: scaled.modalOptionSubtitle }]} numberOfLines={1}>
                              {parish.diocese.name}
                            </Text>
                          )}
                        </Pressable>
                      ))
                    ) : (
                      <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
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
                    <Text style={[styles.modalHeaderTitle, { color: theme.text, fontSize: scaled.modalHeaderTitle }]}>Escolher capela</Text>
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
                      style={[styles.modalSearchInput, { color: theme.text, fontSize: scaled.modalSearchInput }]}
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
                          { color: theme.text, fontWeight: selectedChapelId ? '700' : '800', fontSize: scaled.modalOptionTitle },
                        ]}
                      >
                        Sem capela (usar paróquia)
                      </Text>
                      <Text style={[styles.modalOptionSubtitle, { color: theme.textSoft, fontSize: scaled.modalOptionSubtitle }]}>
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
                              { color: theme.text, fontWeight: selectedChapelId === chapel.id ? '800' : '700', fontSize: scaled.modalOptionTitle },
                            ]}
                            numberOfLines={1}
                          >
                            {chapel.name}
                          </Text>
                        </Pressable>
                      ))
                    ) : chapelQuery.trim() ? (
                      <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
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
              <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Minha conta</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>{session?.user.name}</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>{session?.user.email}</Text>

              {mustChangePassword ? (
                <Text style={[styles.subtitle, { color: theme.secondary, fontSize: scaled.subtitle }]}>
                  Atualize sua senha agora para liberar o restante das áreas privadas.
                </Text>
              ) : (
                <Pressable
                  style={[
                    styles.button,
                    {
                      borderColor: theme.secondary,
                      backgroundColor: 'rgba(218, 139, 60, 0.16)',
                    },
                  ]}
                  onPress={() => router.push('/mensagens' as never)}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                    Ver mensagens recebidas
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.button, { borderColor: theme.destructive, backgroundColor: withAlpha(theme.destructive, 0.14) }]}
                onPress={() => setLogoutDialogOpen(true)}
              >
                <Text style={[styles.buttonText, { color: theme.destructive, fontSize: scaled.buttonText }]}>Sair</Text>
              </Pressable>
            </View>

            {mustChangePassword ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Atualize sua senha</Text>
                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                  Por segurança, seu primeiro acesso só é concluído depois que você trocar a senha.
                </Text>

                <TextInput
                  value={currentPasswordInput}
                  onChangeText={setCurrentPasswordInput}
                  secureTextEntry
                  placeholder="Senha atual"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={newPasswordInput}
                  onChangeText={setNewPasswordInput}
                  secureTextEntry
                  placeholder="Nova senha"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={confirmPasswordInput}
                  onChangeText={setConfirmPasswordInput}
                  secureTextEntry
                  placeholder="Confirmar nova senha"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />

                <Pressable
                  style={[
                    styles.button,
                    {
                      borderColor: theme.secondary,
                      backgroundColor: 'rgba(218, 139, 60, 0.16)',
                    },
                  ]}
                  onPress={() => {
                    void onChangePassword();
                  }}
                  disabled={passwordChangeSubmitting}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                    {passwordChangeSubmitting ? 'Atualizando...' : 'Atualizar senha'}
                  </Text>
                </Pressable>

                {!!passwordChangeNotice && (
                  <Text style={{ color: '#86EFAC', fontWeight: '700' }}>
                    {passwordChangeNotice}
                  </Text>
                )}
                {!!submitError && <Text style={{ color: '#FCA5A5' }}>{submitError}</Text>}
              </View>
            ) : dashboard.isLoading && !dashboard.dashboard ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.secondary} />
                <Text style={{ color: theme.textSoft, fontSize: scaled.subtitle }}>Carregando seu painel...</Text>
              </View>
            ) : (
              <>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Resumo do dízimo</Text>
                  <View style={styles.statRow}>
                    <View style={[styles.statItem, { borderColor: theme.border }]}>
                      <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Total</Text>
                      <Text style={[styles.statValue, { color: theme.text, fontSize: scaled.statValue }]}>
                        {money(dashboard.dashboard?.titheSummary.totalTithed ?? 0)}
                      </Text>
                    </View>
                    <View style={[styles.statItem, { borderColor: theme.border }]}>
                      <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Contribuições</Text>
                      <Text style={[styles.statValue, { color: theme.text, fontSize: scaled.statValue }]}>
                        {dashboard.dashboard?.titheSummary.titheCount ?? 0}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statItem, { borderColor: theme.border }]}>
                    <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Total em contribuições</Text>
                    <Text style={[styles.statValue, { color: theme.text, fontSize: scaled.statValue }]}>
                      {money(dashboard.dashboard?.contributionSummary?.totalContributed ?? 0)}
                    </Text>
                  </View>

                  <View style={[styles.statItem, { borderColor: theme.border }]}>
                    <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Sequência no dízimo</Text>
                    <View style={styles.streakRow}>
                      {fireCount ? (
                        Array.from({ length: fireCount }).map((_, index) => (
                          <MaterialCommunityIcons key={`fire-${index}`} name="fire" size={20} color="#FB923C" />
                        ))
                      ) : (
                        <MaterialCommunityIcons name="fire-off" size={20} color={theme.textSoft} />
                      )}
                      <Text style={[styles.streakText, { color: theme.text, fontSize: scaled.streakText }]}>
                        {streak} {streak === 1 ? 'mês seguido' : 'meses seguidos'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Status dizimista</Text>
                  {dashboard.dashboard?.titherProfiles?.length ? (
                    dashboard.dashboard.titherProfiles.map((profile) => (
                      <View key={profile.id} style={[styles.statItem, { borderColor: theme.border }]}>
                        <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Envelope</Text>
                        <Text style={[styles.statValue, { color: theme.text, fontSize: scaled.statValue }]}>{profile.envelopeCode ?? 'Sem código'}</Text>
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
                        borderColor: activeTither ? theme.destructive : theme.secondary,
                        backgroundColor: activeTither ? withAlpha(theme.destructive, 0.14) : withAlpha(theme.secondary, 0.16),
                      },
                    ]}
                    onPress={() => void onToggleTither(Boolean(activeTither))}
                    disabled={titherSubmitting}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: activeTither ? theme.destructive : theme.secondary, fontSize: scaled.buttonText },
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
          <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Aparência</Text>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
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
                  <Text style={[styles.themeOptionText, { color: active ? theme.secondary : theme.textSoft, fontSize: scaled.themeOptionText }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
            Tamanho do texto: {fontScaleOptions.find((option) => option.value === fontScalePreference)?.label ?? 'Padrão'}
          </Text>
          <View style={styles.toggleRow}>
            {fontScaleOptions.map((option) => {
              const active = fontScalePreference === option.value;
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
                    void setFontScalePreference(option.value);
                  }}
                >
                  <Text style={[styles.themeOptionText, { color: active ? theme.secondary : theme.textSoft, fontSize: scaled.themeOptionText }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <AppAlertDialog
        visible={logoutDialogOpen}
        theme={theme}
        variant="danger"
        title="Encerrar sessão?"
        description="Você será desconectado deste dispositivo e precisará entrar novamente para acessar recursos privados."
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        confirmLoading={logoutSubmitting}
        onCancel={() => {
          if (!logoutSubmitting) {
            setLogoutDialogOpen(false);
          }
        }}
        onConfirm={onLogout}
      />
    </SafeAreaView >
  );
}
