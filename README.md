# KambaGo

**Vamos juntos.** - Mais pessoas. Menos custos. Uma só rota.

Aplicação móvel Expo de partilha de táxi em Luanda, desenvolvida com React Native, Expo Router e Supabase.

## Estado das funcionalidades

| Funcionalidade | Estado |
|---|---|
| Estrutura Expo/Expo Router e verificação TypeScript | Funciona |
| Registo por e-mail, login e recuperação por e-mail | Funciona com Supabase configurado |
| Verificação de e-mail por código | Funciona com Email Auth, templates e SMTP configurados |
| Perfil e estado ativo/pendente | Funciona com migrations e configuração Supabase |
| Notificações Push | Pendente de configuração EAS/Expo |
| Mapas | Pendente de implementação na etapa seguinte |
| Pesquisa, correspondência e viagens partilhadas | Por fazer |
| Pagamentos e chat em tempo real | Por fazer |
| Aprovação administrativa de motoristas | Parte da Etapa 1 pronta; painel por fazer |

Os testes de aplicação não testam a interface; cobrem validação, autenticação, perfil e estados de conta.

## Instalação e verificação

```bash
npm ci
npm run lint
npm test
npx expo export --platform android --output-dir dist/export-check
npx expo config --type public
npx expo-doctor
```

Se `npm ci` falhar por lockfile desactualizado, execute `npm install --package-lock-only` e depois `npm ci`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha apenas valores públicos:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPS_PROVIDER`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`
- `EXPO_PUBLIC_EXPO_PROJECT_ID`
- `EXPO_PUBLIC_APP_ENV`

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, tokens privados ou outras credenciais no cliente, no repositório ou em `.env.example` com valor preenchido.

## Supabase local

Aplica as migrations nesta ordem:

```text
001_stage1_auth_profiles.sql
002_stage1_profile_rls_matching.sql
003_stage1_routing_storage.sql
004_stage1_account_deletion.sql
005_email_verification_rpc.sql
006_remove_unused_phone_rpc.sql
```

Depois, para desenvolvimento local:

```bash
npx supabase start
npx supabase db reset
npx supabase db seed --file supabase/seed/001_dev_corridors.sql
npx supabase db seed --file supabase/seed/002_dev_email_users.sql
```

O seed `002_dev_email_users.sql` só pode correr com `app.env = development` e contém uma guarda que bloqueia execução em produção.

Execute os testes SQL por ordem depois das migrations e dos seeds:

```text
001_rls_profiles.sql
002_profiles_rls_matching.sql
003_phone_rpc_removed.sql
004_fare_rules_rls.sql
005_email_verification.sql
```

Exemplo com pgTAP/Supabase local:

```bash
npx supabase db test
psql "$DATABASE_URL" -f supabase/tests/001_rls_profiles.sql
psql "$DATABASE_URL" -f supabase/tests/002_profiles_rls_matching.sql
psql "$DATABASE_URL" -f supabase/tests/003_phone_rpc_removed.sql
psql "$DATABASE_URL" -f supabase/tests/004_fare_rules_rls.sql
psql "$DATABASE_URL" -f supabase/tests/005_email_verification.sql
```

## Configuração manual do Supabase

1. Criar o projeto.
2. Ativar **Email Auth** em Authentication → Providers → Email.
3. Ativar **Confirm email**.
4. Configurar o template de e-mail com `{{ .Token }}` para o código de 6 dígitos.
5. Configurar SMTP próprio para ambientes de utilização real.
6. Promover o primeiro administrador manualmente no SQL Editor.

As políticas RLS devem impedir alterações pelo utilizador a `role`, `account_status`, `email_verified` e `phone_verified`.

## Build Android com EAS

Primeiro iniciar sessão no Expo/EAS:

```bash
npx eas-cli@latest whoami
npx eas-cli@latest login
npx eas-cli@latest init --non-interactive
```

Criar as variáveis públicas no ambiente `preview`:

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<URL_PUBLICA>" --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<ANON_KEY_PUBLICA>" --visibility sensitive
```

Gerar o APK:

```bash
npx eas-cli@latest build --platform android --profile preview --non-interactive
npx eas-cli@latest build:list --platform android --limit 1
```
