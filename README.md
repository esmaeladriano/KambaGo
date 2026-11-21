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
- Validação Zod (`utils/validation.ts`) para telefone `+244 9XX XXX XXX`, registo, login, OTP de 6 dígitos, recuperação por e-mail, atualização de perfil e eliminação de conta.
- Máquina de estados de conta (`pendente`, `ativa`, `suspensa`) em `utils/accountState.ts`.
- Fluxo único de OTP via Supabase Auth (`signUp` + `auth.resend` + `auth.verifyOtp`) ligado à RPC `confirm_phone_verification()` (`003_phone_verification_rpc.sql`), que ativa apenas passageiros após confirmação real no servidor e mantém motoristas em `pendente` até aprovação administrativa.
- Migrations SQL consolidadas (`001` a `004`) com RLS rigorosa em `profiles`, `audit_logs`, `routes` e `fare_rules`, armazenamento de fotos em bucket privado `profile-avatars` (`avatar_path` + URL assinada), e exclusão de conta (`request_account_deletion()`).
- Persistência local segura no dispositivo: `expo-secure-store` para tokens de sessão do Supabase Auth (`services/supabase/deviceStorage.native.ts`) e `@react-native-async-storage/async-storage` para a preferência não sensível `dataSaverEnabled`.

### Pendente de configuração externa
- **Supabase (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)**: enquanto não configurados em `.env`, as ações de servidor devolvem estado `pending_configuration` e a UI mostra **"Configuração pendente"**.
- **Notificações Push (`EXPO_PUBLIC_EXPO_PROJECT_ID`)**: permanecem desativadas enquanto sem ID de projeto EAS/Expo configurado.
- **Mapas (`EXPO_PUBLIC_MAPS_PROVIDER`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` / `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`)**: camada de abstração pronta (`services/maps/mapsProvider.ts`), implementação concreta pendente da Etapa 3.
- **Registo regulatório INTT e textos legais**: marcados como `"Pendente de confirmação"` / `"Rascunho a validar por advogado"`.
- **Email Auth no Supabase**: ativar em *Authentication → Providers → Email* e configurar variáveis de ambiente correspondentes.

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

1. Criar projeto Supabase (ambiente de desenvolvimento) e ativar **Email Auth** em *Authentication → Providers → Email*.
2. Aplicar as migrations por ordem (`001_stage1_auth_profiles.sql` até `004_fare_rules.sql`) e, em desenvolvimento, `supabase/seed/001_dev_corridors.sql`.
3. Promover o primeiro administrador via SQL Editor com `role = 'admin'` e `account_status = 'ativa'`.
4. Criar `.env` local a partir de `.env.example` (nunca versionar `.env`).
