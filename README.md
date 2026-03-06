# App Mobile — EclesialHub (Expo)

Aplicativo móvel do ecossistema **EclesialHub** para fiéis e membros administrativos vinculados a pessoa.

## Stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- AsyncStorage + SecureStore
- Expo Notifications

## Pré-requisitos

- Node.js `>=20 <22`
- npm
- Android Studio + SDK (para build local Android)
- Java 17 (recomendado para Gradle/Android)

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Copie:

```bash
cp .env.example .env
```

### Variáveis suportadas

| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | Sim | `http://localhost:3000` | URL da API backend. |
| `EXPO_PUBLIC_DEVOTION_AUDIO_BASE_URL` | Não | `https://backend.seudominio.com` | Base para baixar/cachar MP3 de devoções (fallback: `EXPO_PUBLIC_API_URL`). |
| `EXPO_PUBLIC_LITURGY_API_URL` | Não | `https://liturgia.up.railway.app/v2` | API de liturgia diária. |
| `EXPO_PUBLIC_SAINT_API_URL` | Não | `https://catolicoapp.com/wp-json/wp/v2/santos` | API de santo do dia. |
| `EXPO_PUBLIC_ORG_DOMAIN` | Não | `paroquia.seudominio.com` | Domínio da unidade para resolver branding/entidade. |
| `EXPO_PUBLIC_REQUEST_TIMEOUT_MS` | Não | `10000` | Timeout de requisições HTTP (ms). |

## Executar em desenvolvimento

```bash
npm run start
```

Depois escolha:

- `a` para Android Emulator
- QR code para device (quando aplicável)

## Scripts principais

| Script | Descrição |
|---|---|
| `npm run start` | Expo dev server. |
| `npm run android` | Executa no Android local (`expo run:android`). |
| `npm run ios` | Executa no iOS local (`expo run:ios`). |
| `npm run web` | Roda versão web via Expo. |
| `npm run test` | Jest watch. |

## Builds Android (local)

| Script | Saída |
|---|---|
| `npm run android:release:apk` | APK release (`armeabi-v7a` + `arm64-v8a`) |
| `npm run android:release:apk:universal` | APK universal (inclui x86/x86_64) |
| `npm run android:release:arm64` | APK release apenas arm64 |
| `npm run android:release:aab` | App Bundle (Play Store) |

## Push notifications

### Importante

Push remoto no Android **não funciona no Expo Go** para SDKs recentes. Use:

- Development Build
- APK/AAB release

### Arquivos e credenciais

- `google-services.json` (Android Firebase)
- Service Account FCM V1 (EAS credentials)

Arquivos sensíveis já ignorados em `.gitignore`:

- `google-services.json`
- `android/app/google-services.json`
- arquivos de service account `.json`

## EAS (opcional)

Este projeto já possui `eas.json` com perfis:

- `development`
- `preview`
- `production`

Para usar:

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

## Cache e comportamento offline

Cache local (TTL diário / 24h, conforme módulo):

- Branding + unidade organizacional
- Liturgia diária
- Sessão autenticada
- Dashboard do membro
- Mensagens do membro
- Catálogo de devoções (orações/rosário) via `AsyncStorage` após sincronização com backend

Ações de notificação são por usuário (conta atual):

- marcar como lida
- remover da lista
- limpeza automática por preferência

## Áudio neural (oracoes/terços)

O build de MP3 neural foi centralizado no **backend**.

No repositório `eclesialhub-backend`, use:

```bash
npm run devotion-audio:build:dry
npm run devotion-audio:build
npm run devotion-audio:sync
```

### Reprodução no mobile

- O app sempre funciona com fallback TTS (`expo-speech`).
- Para tocar MP3 neural no dispositivo, o app consulta o manifest público
  `/public/devotions/audio/manifest`.
- O usuário escolhe quando baixar/remover os arquivos locais (offline opcional).
- O catálogo de orações/rosário é fonte canônica do backend (`/public/devotions/*`) e
  fica em cache local depois da primeira carga online.

## Troubleshooting

### `Invalid token type`

Esse erro normalmente era sessão antiga. Solução:

1. Atualizar backend e app para versões atuais.
2. Fazer logout/login para renovar tokens.

### Push não registra dispositivo

- Confirme permissões no dispositivo.
- Não teste push remoto no Expo Go.
- Confira `google-services.json` e credenciais FCM V1.

### API inacessível no celular físico

- `EXPO_PUBLIC_API_URL` deve apontar para URL pública HTTPS (não `localhost`).
