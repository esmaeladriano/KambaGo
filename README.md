# KambaGo

**Vamos juntos.** — *Mais pessoas. Menos custos. Uma só rota.*

Aplicação móvel de partilha de táxi em Luanda, Angola (corredor inicial configurável na base de dados: **Zango → Mutamba**), concebida com prioridade para dispositivos Android modestos, ligações móveis fracas e regras de negócio no servidor.

---

## Arquitetura do Repositório

- **Raiz (`/`)**: Aplicação móvel principal em **React Native + Expo + Expo Router** (`app/`, `constants/`, `locales/`, `services/`, `store/`, `types/`, `utils/`, `supabase/`).

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
- Shell inicial de passageiro com mapa, localização, procura de viagens e solicitação via Supabase.
- Shell inicial de motorista com disponibilidade, viagens, ganhos e bloqueio administrativo enquanto `account_status = 'pendente'`.
- Migration `007_shared_mobility.sql` prepara veículos, viagens, paragens, pedidos, passageiros, pagamentos, notificações e locais guardados.

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

Mantém as variáveis públicas no `.env.local` (não versionado):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EXPO_PROJECT_ID` (opcional, para ativar registo de Expo Push Notifications)
- `EXPO_PUBLIC_MAPS_PROVIDER` (`google` ou `mapbox`)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ou `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`

Segredos de servidor (apenas em ambiente administrativo seguro, nunca no cliente):
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Comandos

### Aplicação Expo (Raiz `/`)
```bash
npm ci
npm run lint          # Verificação TypeScript (inclui app/ e módulos partilhados)
npm test              # Testes unitários TypeScript (node:test via tsx)
npx expo start        # Metro/Expo Go
npm run build         # Exportação Android (expo export --platform android)
```

Use o Expo Go no dispositivo Android para testar a aplicação principal. A pré-visualização web não faz parte deste projeto.

### Estimativa de Custos de Mapas por Viagem (Referência)
- **Autocompletar**: debounce de `500 ms` e mínimo de `3` caracteres (`TECHNICAL_CONFIG`).
- **Cálculo de rota**: `1` pedido por viagem criada, guardado em cache de rotas para reutilização no mesmo corredor.
- **Atualização de posição do motorista**: intervalo fixo de `12 s` (`TECHNICAL_CONFIG.driverLocationIntervalMs`).

### Aplicação móvel

- O projeto é testado no Expo Go para Android. Não existe pré-visualização web oficial.
- Sem configuração Supabase, todas as operações de autenticação ficam bloqueadas com estado `configuracao_pendente`.
- Não existe autenticação simulada ou código OTP de teste no cliente.

### Migrations novas

- `009_accounts_and_profiles.sql`: controlo administrativo de contas e bootstrap do primeiro administrador.
- `010_driver_vehicle_approval.sql`: aprovação e rejeição de motoristas e veículos.
- `011_trip_lifecycle.sql`: criação e ciclo seguro de viagens.
- `012_payments_storage.sql`: pagamentos em dinheiro e limites do bucket de avatars.

Não aplicar estas migrations automaticamente nem num Supabase remoto. Aplicar manualmente apenas no ambiente de desenvolvimento autorizado.

### Primeiro administrador

1. Criar ou usar uma conta válida no Supabase Auth.
2. Confirmar que ainda não existe perfil com `role = 'admin'`.
3. Executar `select public.bootstrap_first_admin('email@exemplo.ao');` pelo papel de serviço ou durante a migration segura.
4. `bootstrap_first_admin` não é executável pela API pública ou pelos papéis `anon`/`authenticated`.

---

## Passos Manuais para Ligar ao Supabase

1. No painel Supabase, em *Authentication → Providers → Email*, manter **"Confirm email"** ativo.
2. Em *Authentication → Email Templates*, configurar **"Confirm signup"** e **"Magic link"** com `{{ .Token }}` para o código de 6 dígitos.
3. Configurar **SMTP próprio** no Supabase, para não depender do limite do e-mail de teste padrão.
4. Aplicar as migrations `001` a `007` por ordem (`001_stage1_auth_profiles.sql` até `007_shared_mobility.sql`) e, apenas em desenvolvimento, `supabase/seed/001_dev_corridors.sql`.
5. Criar o primeiro administrador via SQL Editor (`role = 'admin'` e `account_status = 'ativa'`).
6. Configurar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no `.env` local (nunca versionar `.env`) e no **EAS** antes de gerar builds.

### Redirecionamento de recuperação de senha

O link de recuperação de palavra-passe usa o deep link `kambago://reset-password`, gerado em runtime com `Linking.createURL('reset-password')` (esquema `kambago` definido em `app.json`).

- No painel do Supabase, em *Authentication → URL Configuration*, adicione `kambago://reset-password` à lista de *Redirect URLs*.
- Para testes no Expo Go, o URL `exp://<IP-da-máquina>:8081/--/` muda com o IP da máquina. Acrescente esse URL à lista de *Redirect URLs* no painel do Supabase antes de testar a recuperação de senha localmente.
- O `site_url` de produção deve ser definido no painel do Supabase (não alterado nesta migration local).
