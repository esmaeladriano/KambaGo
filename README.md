# KambaGo

**Vamos juntos.** — *Mais pessoas. Menos custos. Uma só rota.*

Aplicação móvel de partilha de táxi em Luanda, Angola (corredor inicial configurável na base de dados: **Zango → Mutamba**), concebida com prioridade para dispositivos Android modestos, ligações móveis fracas e regras de negócio no servidor.

---

## Arquitetura do Repositório

- **Raiz (`/`)**: Aplicação móvel principal em **React Native + Expo + Expo Router** (`app/`, `constants/`, `locales/`, `services/`, `store/`, `types/`, `utils/`, `supabase/`).
- **`web-preview/`**: Pré-visualização web interativa em Vite + React (`web-preview/package.json`) para inspeção rápida no navegador (não faz parte do build nativo Android).

---

## Matriz de Estado da Etapa 1 (Autenticação, Perfis e Fundação)

### O que funciona de facto
- Estrutura Expo + Expo Router na raiz com verificação TypeScript estrita (`npm run lint`) sobre `app/` e módulos partilhados.
- Traduções centralizadas em português adaptado a Angola (`locales/pt-AO.ts`).
- Validação Zod (`utils/validation.ts`) para formato de telefone angolano `+244 9XX XXX XXX`, registo por e-mail, login, código de verificação por e-mail de 6 dígitos, recuperação de palavra-passe, atualização de perfil e eliminação de conta.
- Máquina de estados de conta (`pendente`, `ativa`, `suspensa`) em `utils/accountState.ts`.
- Fluxo principal de verificação por código enviado por e-mail (`registo → código de 6 dígitos por e-mail → confirm_email_verification() → passageiro ativo`): após `signUp` / `auth.resend` e `auth.verifyOtp({ type: 'email' })`, a RPC `confirm_email_verification()` (`005_email_verification_rpc.sql`) ativa apenas passageiros confirmados no servidor. Motoristas mantêm-se em `pendente` até aprovação administrativa. A RPC histórica de telefone foi removida em `006_remove_unused_phone_rpc.sql`.
- Migrations SQL consolidadas (`001` a `004`) com RLS rigorosa em `profiles`, `audit_logs`, `routes` e `fare_rules`, armazenamento de fotos em bucket privado `profile-avatars` (`avatar_path` + URL assinada), e exclusão de conta (`request_account_deletion()`).
- Persistência local segura no dispositivo: `expo-secure-store` para tokens de sessão do Supabase Auth (`services/supabase/deviceStorage.native.ts`) e `@react-native-async-storage/async-storage` para a preferência não sensível `dataSaverEnabled`.

### Pendente de configuração externa
- **Supabase (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)**: enquanto não configurados em `.env`, as ações de servidor devolvem estado `pending_configuration` e a UI mostra **"Configuração pendente"**.
- **Notificações Push (`EXPO_PUBLIC_EXPO_PROJECT_ID`)**: permanecem desativadas enquanto sem ID de projeto EAS/Expo configurado.
- **Mapas (`EXPO_PUBLIC_MAPS_PROVIDER`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`)**: camada de abstração pronta (`services/maps/mapsProvider.ts`), implementação concreta pendente da Etapa 3.
- **Registo regulatório INTT e textos legais**: marcados como `"Pendente de confirmação"` / `"Rascunho a validar por advogado"`.
- **Email Auth e SMTP no Supabase**: ativar **"Confirm email"** em *Authentication → Providers → Email*, configurar os templates **"Confirm signup"** e **"Magic link"** com `{{ .Token }}` para envio do código de 6 dígitos e ligar **SMTP próprio** para evitar o limite do e-mail de teste do Supabase.

### Por fazer (etapas seguintes)
- **Etapa 2 em diante**: pesquisa/correspondência de viagens, cálculo de preço partilhado, pagamentos, chat/notificações em tempo real e aprovação administrativa de motoristas no painel.

---

## Variáveis de Ambiente

Copia `.env.example` para `.env` e preenche apenas as chaves públicas no cliente:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EXPO_PROJECT_ID` (opcional, para ativar registo de Expo Push Notifications)
- `EXPO_PUBLIC_MAPS_PROVIDER` (`google` ou `mapbox`)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ou `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`

Segredos de servidor (apenas em ambiente administrativo seguro, nunca no cliente):
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Comandos

### Aplicação Expo (Raiz `/`)
```bash
npm install
npm run lint          # Verificação TypeScript (inclui app/ e módulos partilhados)
npm test              # Testes unitários TypeScript (node:test via tsx)
npm run start         # Expo dev server
npm run build         # Exportação Android (expo export --platform android)
```

### Pré-visualização Web (`web-preview/`)
```bash
npm --prefix web-preview install
npm --prefix web-preview run dev     # Arranque na porta 3000
npm --prefix web-preview run lint    # Verificação TypeScript da pré-visualização web
npm --prefix web-preview run build   # Build Vite da pré-visualização web
```

### Estimativa de Custos de Mapas por Viagem (Referência)
- **Autocompletar**: debounce de `500 ms` e mínimo de `3` caracteres (`TECHNICAL_CONFIG`).
- **Cálculo de rota**: `1` pedido por viagem criada, guardado em cache de rotas para reutilização no mesmo corredor.
- **Atualização de posição do motorista**: intervalo fixo de `12 s` (`TECHNICAL_CONFIG.driverLocationIntervalMs`).

---

## Passos Manuais para Ligar ao Supabase

1. No painel Supabase, em *Authentication → Providers → Email*, manter **"Confirm email"** ativo.
2. Em *Authentication → Email Templates*, configurar **"Confirm signup"** e **"Magic link"** com `{{ .Token }}` para o código de 6 dígitos.
3. Configurar **SMTP próprio** no Supabase, para não depender do limite do e-mail de teste padrão.
4. Aplicar as migrations `001` a `006` por ordem (`001_stage1_auth_profiles.sql` até `006_remove_unused_phone_rpc.sql`) e, apenas em desenvolvimento, `supabase/seed/001_dev_corridors.sql`.
5. Criar o primeiro administrador via SQL Editor (`role = 'admin'` e `account_status = 'ativa'`).
6. Configurar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no `.env` local (nunca versionar `.env`) e no **EAS** antes de gerar builds.
