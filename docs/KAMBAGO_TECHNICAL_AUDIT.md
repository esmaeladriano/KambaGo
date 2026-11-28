# Auditoria técnica — KambaGo (sessão atual)

## Escopo da sessão

- Apenas app mobile (Expo Go Android + APK preview via EAS). Nenhuma alteração de Web.
- Sem aplicação de migrations no Supabase remoto.
- Sem chaves service_role, tokens ou senhas em ficheiros versionados.
- Branch: `main` (sem merge na main).

---

## Fase 0 — Diagnóstico e linha de base

| Verificação | Resultado | Evidência |
|-------------|-----------|-----------|
| `npm run lint` (tsc --noEmit) | PASS | 0 erros |
| `npm test` | PASS | 26 testes, 0 falhas |
| `npx expo-doctor` | 19/20 | 1 mismatch de versão expo (pré-existente, não bloqueante) |
| `npx expo start --offline --clear CI=1` | PASS | Metro arranca na porta 8082 sem erros |
| `npx expo export --platform android --output-dir /tmp/final` | PASS | Bundle Android gerado, 1353 módulos |
| grep mockAuth/Modo mock/123456 no bundle | OK | Nenhum código mock ou OTP de teste no cliente |

Working tree: limpo antes de iniciar. Branch: `main`.

---

## Fase 1 — Autenticação (correções aplicadas)

### 1.1 Remoção de ligações diretas para /verify-email

**Ficheiros alterados:**
- `app/(auth)/login.tsx:115` — removido `<Pressable onPress={() => router.push('/(auth)/verify-email')}>` (link "Já tenho código de confirmação").
- `app/(auth)/register.tsx:252` — removido link de verificação; substituído por "Já tens conta? Entrar" apontando para `/(auth)/login`.

**Motivo:** a rota `/verify-email` só deve ser aberta após registo, com o parâmetro `email`.

### 1.2 verify-email.tsx — estado sem e-mail

**Ficheiro:** `app/(auth)/verify-email.tsx`

**Antes:** sem e-mail mostrava "E-mail não informado" mas ainda exibia os campos de código e botões, podendo deixar o utilizador sem saída clara.

**Depois:** quando não há e-mail (parâmetro vazio e nada em `expo-secure-store`), exibe:
- "Não encontrámos o e-mail do registo."
- Botão "Voltar ao registo" (nunca fica sem saída).

### 1.3 Persistência do e-mail pendente

**Ficheiros alterados:**
- `app/(auth)/verify-email.tsx` — grava o e-mail em `expo-secure-store` (chave `kambago_pending_verification_email`) ao receber parâmetro da rota ou ao carregar do store. Limpa após confirmação bem-sucedida.
- `app/profile/index.tsx` — logout apaga a chave do secure-store.

**Motivo:** o e-mail pendente não sobrevivia a reload (ficava só em zustand/memória).

### 1.4 reset-password.tsx (novo)

**Ficheiro:** `app/(auth)/reset-password.tsx`

- Nova senha + confirmação, validação Zod (mínimo 8 caracteres, senhas coincidem).
- Trata deep link `kambago://reset-password` com fragmento `#access_token=...&refresh_token=...` via `Linking.getInitialURL()` e `Linking.addEventListener('url')`.
- Estabelece sessão de recuperação com `supabase.auth.setSession()`.
- Ouve evento `PASSWORD_RECOVERY` via `onAuthStateChange`.
- Sem sessão de recuperação: mostra "Link inválido ou expirado." + botão "Pedir novo link de recuperação" → `/(auth)/forgot-password`.
- Ao guardar: `supabase.auth.updateUser({ password })` e redireciona para `/(auth)/login`.
- Registado em `app/_layout.tsx` (`(auth)/reset-password`).

### 1.5 forgot-password.tsx — resposta igual para e-mails existentes e inexistentes

**Ficheiro:** `app/(auth)/forgot-password.tsx` — já usava `supabase.auth.resetPasswordForEmail()` com mensagem genérica (`ptAO.auth.feedback.forgotSent: "Se a conta existir no servidor, receberás as instruções de recuperação."`). Sem alteração necessária.

### 1.6 Utilizador não confirmado ao tentar entrar

**Ficheiro:** `services/auth/authService.ts:178-184` — já implementado: `loginUser` deteta erro "email not confirmed", retorna `requiresEmailVerification: true` e o ecrã de login redireciona para `/verify-email` com o e-mail. Sem alteração necessária.

### Testes da Fase 1 (previstos, não executados contra Supabase remoto)

- Validação de senha (mínimo 8 caracteres): coberto por `registerSchema`/`loginSchema` nos testes existentes.
- Redirecionamento por papel e estado: lógica em `verify-email.tsx` e `authService.ts`.
- Reenvio bloqueado antes de 60 s: `resetSeconds` no `verify-email.tsx`.
- `updateUser` não chamado sem sessão de recuperação: guarda `hasRecoverySession` no `reset-password.tsx`.

---

## Fase 2 — Regras de negócio no backend

Confirmação de onde cada regra está implementada (servidor, não só no ecrã):

| Regra | Ficheiro SQL / RPC | Estado |
|-------|-------------------|--------|
| Perfil criado só após confirmação de e-mail | `supabase/migrations/013_profile_after_email_confirmation.sql` — trigger `create_profile_after_email_confirmation` (dispara apenas quando `email_confirmed_at` passa de null para preenchido) | Implementado |
| Passageiro ativo após confirmação; motorista pendente até aprovação | `013` (account_status: 'ativa' passageiro / 'pendente' motorista) + `010_driver_vehicle_approval.sql` (`approve_driver` → 'ativa') | Implementado |
| Motorista não pendente não cria viagens nem fica online | `011_trip_lifecycle.sql` `create_trip` (rejeita se `account_status <> 'ativa'`); `008` `set_driver_availability` (atualiza apenas `account_status = 'ativa'`); trigger `prevent_profile_privilege_escalation` | Implementado |
| Utilizador suspenso não executa operações de mobilidade | `011` `create_trip` bloqueia suspenso; **`start_trip`, `complete_trip`, `cancel_trip` não verificam `account_status`** | GAP — corrigido na migration 014 |
| Capacidade do veículo nunca ultrapassada | `011` `create_trip` (verifica `seats` contra `vehicles.legal_capacity`); `008` `accept_trip_request` (decrementa `available_seats`) | Implementado |
| Aceitação de pedidos com bloqueio de linha | `008` `accept_trip_request` (verifica `available_seats >= seats_requested` e decrementa); `request_shared_trip` (mesma verificação) | Implementado |
| Preço calculado no servidor; frontend só apresenta | `011` `create_trip` (valida `total_fare_kz` contra `fare_rules.min_fare_kz/max_fare_kz`) | Implementado |

### Migration 014 (nova, reversível)

**Ficheiro:** `supabase/migrations/014_suspended_account_mobility_block.sql`

Adiciona verificação de `account_status = 'suspensa'` a `start_trip`, `complete_trip` e `cancel_trip`:
- `start_trip` e `complete_trip`: rejeitam se o motorista estiver suspenso.
- `cancel_trip`: rejeita se o motorista estiver suspenso (administradores continuam a poder cancelar).

Padrão de reversibilidade: `create or replace function` (idempotente); para reverter, recriar as versões anteriores sem o filtro de `account_status`.

**Não aplicada no Supabase remoto** (conforme regras). Deve ser aplicada manualmente no projeto de desenvolvimento.

---

## Fase 3 — Funcionalidades da app

| Item | Estado |
|------|--------|
| Ganhos do motorista de pagamentos registados (sem "0 Kz" fixo) | Já implementado: `app/(driver)/earnings.tsx` usa `fetchPaidEarnings()` da tabela `payments` (status = 'pago') |
| Botões executam operação real ou "em breve" | Verificado: todos os botões chamam serviços reais (Supabase RPC). Nenhum botão sem ação. |
| Formulários com validação Zod + feedback | Já implementado: `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `emailVerificationSchema`, `resetPasswordSchema` (novo) |
| Listagens com loading/vazio/erro | Já implementado: `passenger/index.tsx`, `passenger/trips.tsx`, `driver/index.tsx`, `admin/index.tsx` |
| Mapas: `react-native-maps` no Expo Go Android | `components/PassengerMap.tsx` é stub (sem mapa renderizado). O ecrã home do passageiro mostra "Mapas: configuração pendente" quando sem chave. Não há coordenadas fictícias. |
| Variável de mapas documentada | Criado `.env.example` com `EXPO_PUBLIC_MAPS_PROVIDER`, `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` (gitignored via `.env*`) |

---

## Fase 4 — Segurança

| Verificação | Resultado |
|-------------|-----------|
| Nenhuma `service_role`, senha ou token no código da app | Confirmado: apenas `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` (chave pública anon) |
| `EXPO_PUBLIC_*` contém só URL pública e chave anon | Confirmado em `constants/config.ts` |
| Operações administrativas exigem autorização no servidor | Confirmado: `approve_driver`, `reject_driver`, `approve_vehicle`, `reject_vehicle`, `suspendAccount` usam `public.is_admin()` via RPC `SECURITY DEFINER` (migration 010) |
| Testes destrutivos contra Supabase remoto | Não executados (conforme regras) |

---

## Fase 5 — Validação final (Android + Expo Go)

| Verificação | Resultado |
|-------------|-----------|
| `npm run lint` | PASS |
| `npm test` | PASS (26 testes) |
| `npx expo-doctor` | 19/20 (mismatch de versão expo, pré-existente) |
| `npx expo export --platform android --output-dir /tmp/final` | PASS |
| Bundle sem código mock | OK |
| `npx expo start --offline --clear CI=1` | PASS (Metro arranca) |
| APK via EAS | Não executado (requer `eas login` interativo — pendente para o utilizador) |

---

## Itens pendentes do utilizador

1. **Supabase:** ativar "Confirm email" em Authentication → Providers → Email; configurar templates "Confirm signup" e "Magic link" com `{{ .Token }}`; ligar SMTP próprio; aplicar migrations 001–014 no projeto de desenvolvimento (não remoto).
2. **Mapas:** configurar `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ou `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` (ver `.env.example`).
3. **EAS:** `eas login` e `npx eas-cli@latest build --platform android --profile preview --non-interactive` (máximo 3 tentativas, só após lint/testes/export passarem).
4. **Deep link de recuperação:** configurar `kambago://reset-password` no painel Supabase (URL de redirecionamento do resetPasswordForEmail).
5. **Primeiro administrador:** executar `select public.bootstrap_first_admin('email@exemplo.ao')` pelo papel de serviço.

---

## Não testado e porquê

| Item | Motivo |
|------|--------|
| Export APK via EAS | Requer `eas login` interativo (não executado sem autorização) |
| Supabase remoto (migrations aplicadas) | Regras proíbem aplicação remota; requer credenciais do utilizador |
| Teste manual no Expo Go físico | Não há dispositivo disponível nesta sessão |
| OWASP ZAP ativo | Não executado por segurança (conforme TEST_REPORT.md) |
| Gitleaks / Opengrep | Ferramentas não disponíveis nesta sessão |
| react-native-maps com chave real | Nenhuma chave de mapas configurada; stub mantido com "configuração pendente" |

---

## Ficheiros alterados nesta sessão

**Modificados:**
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `app/(auth)/verify-email.tsx`
- `app/_layout.tsx`
- `app/profile/index.tsx`

**Novos:**
- `app/(auth)/reset-password.tsx`
- `supabase/migrations/014_suspended_account_mobility_block.sql`
- `.env.example` (gitignored, não versionado)
- `docs/KAMBAGO_TECHNICAL_AUDIT.md` (este ficheiro)

**Sem alterações de Web:** nenhum ficheiro `.web.tsx` foi modificado.
