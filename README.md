# App Mobile - Sistema Paroquial

Aplicativo refeito com Expo Router (React Native) com foco em:

- Visual novo e organização por abas (`Início`, `Liturgia`, `Bíblia`, `Conta`)
- Integração com a API do sistema paroquial
- Cache offline por 24h para dados principais

## Cache offline (24h)

- Branding + unidade organizacional por domínio
- Liturgia diária
- Sessão de login do fiel
- Painel do fiel (`/member/dashboard`)

Sempre que houver internet e o cache do dia não existir, o app busca e salva os dados automaticamente.

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_LITURGY_API_URL`
- `EXPO_PUBLIC_SAINT_API_URL`
- `EXPO_PUBLIC_ORG_DOMAIN`
- `EXPO_PUBLIC_REQUEST_TIMEOUT_MS`

## Executar

Use Node LTS 20 (arquivo `.nvmrc`):

```bash
nvm use
```

Se o ambiente estiver quebrado, reinstale dependências:

```bash
rm -rf node_modules package-lock.json
npm install
```

Depois:

```bash
npm run start
```

## Login do fiel

A tela `Conta` usa `POST /auth/login` e o dashboard usa `/member/dashboard` com refresh automático de token em `/auth/refresh`.
