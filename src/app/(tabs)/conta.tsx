import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
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
import { PublicRegisterOrganization, TitherStatus } from '../../mobile/types';
import { ThemePreference, useThemePreference } from '../../mobile/theme-preference';
import { FontScalePreference, scaleFont, useFontScalePreference } from '../../mobile/font-scale-preference';
import { AppAlertDialog } from '../../mobile/components/app-alert-dialog';
import { appConfig } from '../../mobile/config';

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
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    flexGrow: 1,
    minWidth: '48%',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  infoItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoItemValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  overdueList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  overdueBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  overdueBadgeText: {
    fontSize: 11,
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

const formatCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const isValidCep = (value: string) => onlyDigits(value).length === 8;

const formatUf = (value: string) =>
  value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

const isValidUf = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());

type CepAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

const fetchAddressByCep = async (cep: string): Promise<CepAddress | null> => {
  const cleanCep = onlyDigits(cep);
  if (cleanCep.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  if (!response.ok) return null;

  const data = (await response.json()) as {
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
  };
  if (data.erro) return null;

  return {
    street: data.logradouro || undefined,
    neighborhood: data.bairro || undefined,
    city: data.localidade || undefined,
    state: data.uf || undefined,
  };
};

const normalizeForSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeInlineText = (value: string) =>
  value.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');

const normalizeInlineEmail = (value: string) =>
  value.toLowerCase().replace(/\s+/g, '');

const formatOrgTypeShort = (type: PublicRegisterOrganization['type']) => {
  if (type === 'DIOCESE') return 'Diocese';
  if (type === 'PARISH') return 'Paróquia';
  return 'Capela';
};

const formatCompetenceMonth = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR', {
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return 'não informado';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'não informado';
  return parsed.toLocaleDateString('pt-BR');
};

const getTitherStatusMeta = (status: TitherStatus) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Ativo', color: '#22C55E' };
    case 'PAUSED':
      return { label: 'Pausado', color: '#F59E0B' };
    case 'SUSPENDED':
      return { label: 'Suspenso', color: '#EF4444' };
    case 'INACTIVE':
    default:
      return { label: 'Inativo', color: '#F87171' };
  }
};

const isInactiveLikeTither = (status: TitherStatus) =>
  status === 'INACTIVE' || status === 'PAUSED' || status === 'SUSPENDED';

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
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCpf, setRegisterCpf] = useState('');
  const [registerZipCode, setRegisterZipCode] = useState('');
  const [registerStreet, setRegisterStreet] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [registerComplement, setRegisterComplement] = useState('');
  const [registerNeighborhood, setRegisterNeighborhood] = useState('');
  const [registerCity, setRegisterCity] = useState('');
  const [registerState, setRegisterState] = useState('');
  const [cepLookupLoading, setCepLookupLoading] = useState(false);
  const [cepLookupError, setCepLookupError] = useState('');
  const lastResolvedCepRef = useRef('');
  const [registerGender, setRegisterGender] = useState<
    'MALE' | 'FEMALE' | 'OTHER' | 'UNDECLARED'
  >('UNDECLARED');
  const [selectedRegisterOrgUnitId, setSelectedRegisterOrgUnitId] = useState<string>('');
  const [organizationPickerOpen, setOrganizationPickerOpen] = useState(false);
  const [organizationQuery, setOrganizationQuery] = useState('');
  const [debouncedOrganizationQuery, setDebouncedOrganizationQuery] = useState('');
  const [registerOrganizations, setRegisterOrganizations] = useState<
    PublicRegisterOrganization[]
  >([]);
  const [loadingRegisterOrganizations, setLoadingRegisterOrganizations] = useState(false);

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

  useEffect(() => {
    if (isAuthenticated) return;

    const loadRegisterOrganizations = async () => {
      setLoadingRegisterOrganizations(true);
      try {
        const result = await publicApi.fetchPublicRegisterOrganizations();
        setRegisterOrganizations(result);
        if (!selectedRegisterOrgUnitId && result.length === 1) {
          setSelectedRegisterOrgUnitId(result[0].orgUnitId);
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as organizações para cadastro.',
        );
      } finally {
        setLoadingRegisterOrganizations(false);
      }
    };

    void loadRegisterOrganizations();
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrganizationQuery(organizationQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [organizationQuery]);

  useEffect(() => {
    const cepDigits = onlyDigits(registerZipCode);
    if (cepDigits.length !== 8) {
      setCepLookupError('');
      return;
    }

    if (lastResolvedCepRef.current === cepDigits) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCepLookupLoading(true);
        setCepLookupError('');
        const result = await fetchAddressByCep(cepDigits);
        if (!result) {
          setCepLookupError('CEP não encontrado. Preencha o endereço manualmente.');
          return;
        }

        setRegisterStreet((current) => current || result.street || '');
        setRegisterNeighborhood((current) => current || result.neighborhood || '');
        setRegisterCity((current) => current || result.city || '');
        setRegisterState((current) =>
          current || (result.state ? formatUf(result.state) : ''),
        );
        lastResolvedCepRef.current = cepDigits;
      } catch {
        setCepLookupError('Não foi possível consultar o CEP agora.');
      } finally {
        setCepLookupLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [registerZipCode]);

  const filteredRegisterOrganizations = useMemo(() => {
    const normalizedQuery = normalizeForSearch(debouncedOrganizationQuery);
    if (!normalizedQuery) {
      return registerOrganizations;
    }
    return registerOrganizations.filter((option) =>
      normalizeForSearch(
        `${option.label} ${option.name} ${option.parentName ?? ''} ${option.type}`,
      ).includes(normalizedQuery),
    );
  }, [debouncedOrganizationQuery, registerOrganizations]);

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
    if (!registerPassword.trim()) {
      setSubmitError('Informe uma senha.');
      return;
    }
    if (registerPassword.trim().length < 12) {
      setSubmitError('A senha deve ter no mínimo 12 caracteres.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setSubmitError('A confirmação da senha não confere.');
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
    if (!isValidCep(registerZipCode)) {
      setSubmitError('Informe um CEP válido.');
      return;
    }
    if (!registerStreet.trim()) {
      setSubmitError('Informe a rua.');
      return;
    }
    if (!registerNumber.trim()) {
      setSubmitError('Informe o número.');
      return;
    }
    if (!registerNeighborhood.trim()) {
      setSubmitError('Informe o bairro.');
      return;
    }
    if (!registerCity.trim()) {
      setSubmitError('Informe a cidade.');
      return;
    }
    if (!isValidUf(registerState)) {
      setSubmitError('Informe uma UF válida.');
      return;
    }
    if (!selectedRegisterOrgUnitId) {
      setSubmitError('Selecione a organização.');
      return;
    }
    if (!registerConsentLgpd) {
      setSubmitError('Aceite a Política de Privacidade e os Termos de Uso para continuar.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await register({
        name: registerName.trim(),
        email: registerEmail.trim().toLowerCase(),
        password: registerPassword,
        orgId: selectedRegisterOrgUnitId,
        primaryPhone: onlyDigits(registerPhone),
        cpf: onlyDigits(registerCpf),
        gender: registerGender,
        consentLgpd: true,
        address: {
          zipCode: onlyDigits(registerZipCode).slice(0, 8),
          street: registerStreet.trim(),
          number: registerNumber.trim(),
          complement: registerComplement.trim() || undefined,
          neighborhood: registerNeighborhood.trim(),
          city: registerCity.trim(),
          state: formatUf(registerState),
        },
      });
      setAccountSetupNotice(result.message);
      setQueuedAccessEmail(result.email);
      setMode('login');
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterPhone('');
      setRegisterCpf('');
      setRegisterZipCode('');
      setRegisterStreet('');
      setRegisterNumber('');
      setRegisterComplement('');
      setRegisterNeighborhood('');
      setRegisterCity('');
      setRegisterState('');
      setCepLookupError('');
      setCepLookupLoading(false);
      lastResolvedCepRef.current = '';
      setRegisterGender('UNDECLARED');
      setSelectedRegisterOrgUnitId('');
      setRegisterConsentLgpd(false);
      setPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar sua conta.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openLegalDoc = async (path: '/termos' | '/privacidade') => {
    const target = `${appConfig.publicWebUrl}${path}`;
    try {
      await Linking.openURL(target);
    } catch {
      setSubmitError('Não foi possível abrir o link legal no momento.');
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
  const inactiveTither = dashboard.dashboard?.titherProfiles?.find((profile) =>
    isInactiveLikeTither(profile.status),
  );
  const streak = dashboard.dashboard?.titheSummary.currentStreakMonths ?? 0;
  const fireCount = Math.min(Math.max(streak, 0), 12);
  const mustChangePassword = Boolean(session?.user.mustChangePassword);
  const selectedRegisterOrganization = registerOrganizations.find(
    (entry) => entry.orgUnitId === selectedRegisterOrgUnitId,
  );
  const selectedRegisterOrganizationHint = selectedRegisterOrganization
    ? `${formatOrgTypeShort(selectedRegisterOrganization.type)}${
        selectedRegisterOrganization.parentName
          ? ` • ${selectedRegisterOrganization.parentName}`
          : ''
      }`
    : `${registerOrganizations.length} ${
        registerOrganizations.length === 1 ? 'opção disponível' : 'opções disponíveis'
      }`;
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
                  Escolha a organização onde você participa e confirme seu e-mail para ativar o acesso.
                </Text>
                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                  Campos com * são obrigatórios.
                </Text>

                <TextInput
                  value={registerName}
                  onChangeText={(value) => setRegisterName(normalizeInlineText(value))}
                  placeholder="Nome completo *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerEmail}
                  onChangeText={(value) => setRegisterEmail(normalizeInlineEmail(value))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="E-mail *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerPassword}
                  onChangeText={setRegisterPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Senha * (mín. 12)"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerConfirmPassword}
                  onChangeText={setRegisterConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="Confirmar senha *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerPhone}
                  onChangeText={(value) => setRegisterPhone(formatPhoneBR(value))}
                  keyboardType="phone-pad"
                  placeholder="Telefone *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerCpf}
                  onChangeText={(value) => setRegisterCpf(formatCpf(value))}
                  keyboardType="number-pad"
                  placeholder="CPF *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerZipCode}
                  onChangeText={(value) => setRegisterZipCode(formatCep(value))}
                  keyboardType="number-pad"
                  placeholder="CEP *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                {cepLookupLoading ? (
                  <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                    Buscando endereço pelo CEP...
                  </Text>
                ) : null}
                {!cepLookupLoading && cepLookupError ? (
                  <Text style={[styles.subtitle, { color: theme.destructive, fontSize: scaled.subtitle }]}>
                    {cepLookupError}
                  </Text>
                ) : null}
                <TextInput
                  value={registerStreet}
                  onChangeText={(value) => setRegisterStreet(normalizeInlineText(value))}
                  placeholder="Rua / Logradouro *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <View style={styles.statRow}>
                  <TextInput
                    value={registerNumber}
                    onChangeText={(value) => setRegisterNumber(normalizeInlineText(value))}
                    placeholder="Número *"
                    placeholderTextColor={theme.textSoft}
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        borderColor: theme.border,
                        color: theme.text,
                        fontSize: scaled.input,
                      },
                    ]}
                  />
                  <TextInput
                    value={registerState}
                    onChangeText={(value) => setRegisterState(formatUf(value))}
                    placeholder="UF *"
                    placeholderTextColor={theme.textSoft}
                    maxLength={2}
                    autoCapitalize="characters"
                    style={[
                      styles.input,
                      {
                        width: 88,
                        borderColor: theme.border,
                        color: theme.text,
                        fontSize: scaled.input,
                      },
                    ]}
                  />
                </View>
                <TextInput
                  value={registerNeighborhood}
                  onChangeText={(value) => setRegisterNeighborhood(normalizeInlineText(value))}
                  placeholder="Bairro *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerCity}
                  onChangeText={(value) => setRegisterCity(normalizeInlineText(value))}
                  placeholder="Cidade *"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />
                <TextInput
                  value={registerComplement}
                  onChangeText={(value) => setRegisterComplement(normalizeInlineText(value))}
                  placeholder="Complemento (opcional)"
                  placeholderTextColor={theme.textSoft}
                  style={[styles.input, { borderColor: theme.border, color: theme.text, fontSize: scaled.input }]}
                />

                <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Gênero *</Text>
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

                <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>Organização *</Text>
                {loadingRegisterOrganizations ? (
                  <ActivityIndicator size="small" color={theme.secondary} />
                ) : registerOrganizations.length ? (
                  <Pressable
                    style={[styles.selectTrigger, { borderColor: theme.border }]}
                    onPress={() => {
                      setOrganizationQuery('');
                      setOrganizationPickerOpen(true);
                    }}
                  >
                    <View style={styles.selectTriggerTextWrap}>
                      <Text
                        style={[
                          styles.selectTriggerLabel,
                          { color: theme.text, fontSize: scaled.selectTriggerLabel },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedRegisterOrganization?.name ?? 'Escolher organização'}
                      </Text>
                      <Text
                        style={[
                          styles.selectTriggerHint,
                          { color: theme.textSoft, fontSize: scaled.selectTriggerHint },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedRegisterOrganizationHint}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={theme.textSoft} />
                  </Pressable>
                ) : (
                  <Text style={{ color: theme.textSoft }}>Nenhuma organização disponível para cadastro.</Text>
                )}

                <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                  Não encontrou sua organização? Fale com o responsável da comunidade para verificarem a ativação no sistema.
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
                    Li e aceito a{' '}
                    <Text
                      onPress={() => {
                        void openLegalDoc('/privacidade');
                      }}
                      style={{ color: theme.secondary, fontWeight: '700' }}
                    >
                      Política de Privacidade
                    </Text>
                    {' '}e os{' '}
                    <Text
                      onPress={() => {
                        void openLegalDoc('/termos');
                      }}
                      style={{ color: theme.secondary, fontWeight: '700' }}
                    >
                      Termos de Uso
                    </Text>
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    { borderColor: theme.secondary, backgroundColor: 'rgba(218, 139, 60, 0.16)' },
                    !registerConsentLgpd && { opacity: 0.5 },
                  ]}
                  onPress={onRegister}
                  disabled={submitting || loadingRegisterOrganizations || !registerConsentLgpd}
                >
                  <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                    {submitting ? 'Enviando acesso...' : 'Criar conta'}
                  </Text>
                </Pressable>
              </>
            )}

            <Modal
              visible={organizationPickerOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setOrganizationPickerOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setOrganizationPickerOpen(false)}
                />
                <View style={[styles.modalPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalHeaderTitle, { color: theme.text, fontSize: scaled.modalHeaderTitle }]}>
                      Escolher organização
                    </Text>
                    <Pressable
                      style={[styles.modalCloseButton, { borderColor: theme.border }]}
                      onPress={() => setOrganizationPickerOpen(false)}
                    >
                      <MaterialCommunityIcons name="close" size={18} color={theme.textSoft} />
                    </Pressable>
                  </View>

                  <View style={[styles.modalSearchRow, { borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="magnify" size={18} color={theme.textSoft} />
                    <TextInput
                      value={organizationQuery}
                      onChangeText={setOrganizationQuery}
                      placeholder="Buscar organização"
                      placeholderTextColor={theme.textSoft}
                      style={[styles.modalSearchInput, { color: theme.text, fontSize: scaled.modalSearchInput }]}
                    />
                  </View>

                  <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                    {filteredRegisterOrganizations.length ? (
                      filteredRegisterOrganizations.map((entry) => (
                        <Pressable
                          key={entry.orgUnitId}
                          style={[
                            styles.modalOption,
                            {
                              borderColor: theme.border,
                              backgroundColor:
                                selectedRegisterOrgUnitId === entry.orgUnitId
                                  ? 'rgba(218, 139, 60, 0.16)'
                                  : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            setSelectedRegisterOrgUnitId(entry.orgUnitId);
                            setOrganizationPickerOpen(false);
                            setOrganizationQuery('');
                          }}
                        >
                          <Text
                            style={[
                              styles.modalOptionTitle,
                              {
                                color: theme.text,
                                fontWeight:
                                  selectedRegisterOrgUnitId === entry.orgUnitId ? '800' : '700',
                                fontSize: scaled.modalOptionTitle,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {entry.name}
                          </Text>
                          <Text
                            style={[
                              styles.modalOptionSubtitle,
                              { color: theme.textSoft, fontSize: scaled.modalOptionSubtitle },
                            ]}
                            numberOfLines={2}
                          >
                            {entry.label}
                          </Text>
                        </Pressable>
                      ))
                    ) : (
                      <Text style={[styles.subtitle, { color: theme.textSoft, fontSize: scaled.subtitle }]}>
                        Nenhuma organização encontrada para "{organizationQuery.trim()}".
                      </Text>
                    )}
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
                <>
                  <Pressable
                    style={[
                      styles.button,
                      {
                        borderColor: theme.secondary,
                        backgroundColor: 'rgba(218, 139, 60, 0.16)',
                      },
                    ]}
                    onPress={() => router.push('/carteirinha' as never)}
                  >
                    <Text style={[styles.buttonText, { color: theme.secondary, fontSize: scaled.buttonText }]}>
                      Ver carteirinha
                    </Text>
                  </Pressable>
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
                </>
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
                  <Text style={[styles.title, { color: theme.primary, fontSize: scaled.title }]}>Carteirinha do dizimista</Text>
                  {activeTither ? (
                    <>
                      {(() => {
                        const statusMeta = getTitherStatusMeta(activeTither.status);
                        const envelopeCode = activeTither.currentEnvelopeCode ?? activeTither.envelopeCode;
                        return (
                          <>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  borderColor: withAlpha(statusMeta.color, 0.4),
                                  backgroundColor: withAlpha(statusMeta.color, 0.15),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: statusMeta.color,
                                    fontSize: scaled.statLabel,
                                  },
                                ]}
                              >
                                Dizimista {statusMeta.label.toLowerCase()}
                              </Text>
                            </View>

                            <View style={styles.infoGrid}>
                              <View style={[styles.infoItem, { borderColor: theme.border }]}>
                                <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Envelope do mês</Text>
                                <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                  {envelopeCode ? `E${envelopeCode}` : '—'}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>
                                  {formatCompetenceMonth(activeTither.currentEnvelopeMonth)}
                                </Text>
                              </View>
                              <View style={[styles.infoItem, { borderColor: theme.border }]}>
                                <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Início</Text>
                                <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                  {formatDateOnly(activeTither.startedAt)}
                                </Text>
                              </View>
                            </View>
                          </>
                        );
                      })()}

                      {activeTither.titheControl ? (
                        <>
                          <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>
                            Regularidade do dízimo
                          </Text>
                          <View style={styles.infoGrid}>
                            <View style={[styles.infoItem, { borderColor: theme.border }]}>
                              <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Pagos</Text>
                              <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                {activeTither.titheControl.paidMonths ?? 0}
                              </Text>
                            </View>
                            <View style={[styles.infoItem, { borderColor: theme.border }]}>
                              <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Esperados</Text>
                              <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                {activeTither.titheControl.expectedMonths ?? 0}
                              </Text>
                            </View>
                            <View style={[styles.infoItem, { borderColor: theme.border }]}>
                              <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Em atraso</Text>
                              <Text
                                style={[
                                  styles.infoItemValue,
                                  {
                                    color:
                                      (activeTither.titheControl.overdueMonths ?? 0) > 0
                                        ? theme.destructive
                                        : '#22C55E',
                                  },
                                ]}
                              >
                                {activeTither.titheControl.overdueMonths ?? 0}
                              </Text>
                            </View>
                            <View style={[styles.infoItem, { borderColor: theme.border }]}>
                              <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Último mês pago</Text>
                              <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                {formatCompetenceMonth(activeTither.titheControl.lastPaidMonth)}
                              </Text>
                            </View>
                          </View>

                          {(activeTither.titheControl.overdueCompetences?.length ?? 0) > 0 && (
                            <>
                              <Text style={[styles.statLabel, { color: theme.textSoft, fontSize: scaled.statLabel }]}>
                                Competências em aberto
                              </Text>
                              <View style={styles.overdueList}>
                                {(activeTither.titheControl.overdueCompetences ?? []).map((competence) => (
                                  <View
                                    key={competence}
                                    style={[
                                      styles.overdueBadge,
                                      {
                                        borderColor: withAlpha(theme.destructive, 0.35),
                                        backgroundColor: withAlpha(theme.destructive, 0.12),
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.overdueBadgeText, { color: theme.destructive }]}>
                                      {competence}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </>
                          )}
                        </>
                      ) : null}

                      <Pressable
                        style={[
                          styles.button,
                          {
                            borderColor: theme.destructive,
                            backgroundColor: withAlpha(theme.destructive, 0.14),
                          },
                        ]}
                        onPress={() => void onToggleTither(true)}
                        disabled={titherSubmitting}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            { color: theme.destructive, fontSize: scaled.buttonText },
                          ]}
                        >
                          {titherSubmitting ? 'Salvando...' : 'Desinscrever-me'}
                        </Text>
                      </Pressable>
                    </>
                  ) : inactiveTither ? (
                    <>
                      {(() => {
                        const statusMeta = getTitherStatusMeta(inactiveTither.status);
                        const envelopeCode = inactiveTither.currentEnvelopeCode ?? inactiveTither.envelopeCode;
                        return (
                          <>
                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  borderColor: withAlpha(statusMeta.color, 0.4),
                                  backgroundColor: withAlpha(statusMeta.color, 0.15),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: statusMeta.color,
                                    fontSize: scaled.statLabel,
                                  },
                                ]}
                              >
                                Dizimista {statusMeta.label.toLowerCase()}
                              </Text>
                            </View>
                            <View style={styles.infoGrid}>
                              <View style={[styles.infoItem, { borderColor: theme.border }]}>
                                <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Envelope atual</Text>
                                <Text style={[styles.infoItemValue, { color: theme.text }]}>
                                  {envelopeCode ? `E${envelopeCode}` : '—'}
                                </Text>
                              </View>
                              <View style={[styles.infoItem, { borderColor: theme.border }]}>
                                <Text style={[styles.infoItemLabel, { color: theme.textSoft }]}>Situação</Text>
                                <Text style={[styles.infoItemValue, { color: statusMeta.color }]}>
                                  {statusMeta.label}
                                </Text>
                              </View>
                            </View>
                          </>
                        );
                      })()}

                      <Pressable
                        style={[
                          styles.button,
                          {
                            borderColor: theme.secondary,
                            backgroundColor: withAlpha(theme.secondary, 0.16),
                          },
                        ]}
                        onPress={() => void onToggleTither(false)}
                        disabled={titherSubmitting}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            { color: theme.secondary, fontSize: scaled.buttonText },
                          ]}
                        >
                          {titherSubmitting ? 'Salvando...' : 'Reinscrever-me como dizimista'}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={{ color: theme.textSoft }}>Nenhum cadastro de dizimista encontrado.</Text>
                      <Pressable
                        style={[
                          styles.button,
                          {
                            borderColor: theme.secondary,
                            backgroundColor: withAlpha(theme.secondary, 0.16),
                          },
                        ]}
                        onPress={() => void onToggleTither(false)}
                        disabled={titherSubmitting}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            { color: theme.secondary, fontSize: scaled.buttonText },
                          ]}
                        >
                          {titherSubmitting ? 'Salvando...' : 'Quero me cadastrar como dizimista'}
                        </Text>
                      </Pressable>
                    </>
                  )}
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
