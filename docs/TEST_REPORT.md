# KambaGo — Relatório de Testes

Data: 2026-11-28
Branch: `validation/final-release`
Âmbito: aplicação mobile (Expo SDK 58 + Expo Router + TypeScript), Android (Expo Go e APK).

## Resumo

| Verificação                          | Resultado                              |
| ------------------------------------ | -------------------------------------- |
| `npm ci`                             | OK                                     |
| `npm run lint` (tsc)                 | 0 erros                                |
| `npm test` (node:test)               | 30 passam, 0 falham (30 total)         |
| Testes SQL (pgTAP, 14 ficheiros)     | 14/14 passam, 0 falham                 |
| `expo export --platform android`     | Sucesso (1 bundle .hbc 4.3MB)          |
| Grep web/mock no bundle              | OK (0 resultados)                      |
| `expo-doctor`                        | 19/20 (1 falha de versão, não de rede) |
| `expo start` (CI=1, offline)         | Metro arranca em :8081                 |

## Tarefa 1 — Testes SQL (pgTAP)

Ambiente: Docker disponível; Supabase CLI 3.4.0; stack local arrancada com
`npx supabase start`; migrations 001 a 017 aplicadas; extensão `pgtap` instalada.

Execução: cada ficheiro em `supabase/tests/` corrido dentro de `begin; ... rollback;`
(não altera dados persistentes). Resultado por ficheiro:

| Ficheiro                                   | Resultado          |
| ------------------------------------------ | ------------------ |
| 001_rls_profiles.sql                       | PASS (6 asserções) |
| 002_profiles_rls_matching.sql              | PASS (11)          |
| 003_phone_verification.sql                 | PASS (3)           |
| 004_fare_rules_rls.sql                     | PASS (6)           |
| 005_email_verification.sql                 | PASS (10)          |
| 008_security_hardening.sql                 | PASS (1)           |
| 009_accounts_profiles.sql                  | PASS (1)           |
| 010_driver_vehicle_approval.sql            | PASS (1)           |
| 011_trip_lifecycle.sql                     | PASS (1)           |
| 012_payments_storage.sql                   | PASS (1)           |
| 013_concurrency_accept_trip_request.sql    | PASS (1)           |
| 013_profile_after_email_confirmation.sql   | PASS (4)           |
| 014_suspended_mobility_block.sql           | PASS (5)           |
| seed_email_verification.sql                | PASS (1)           |

**Total: 14/14 ficheiros, 0 falhas.**

### Falhas encontradas e resolução

Na primeira execução (antes de qualquer correção) falharam 4 ficheiros:

1. **005_email_verification.sql e 013_profile_after_email_confirmation.sql** —
   causa: bug de cast `text → enum` no trigger `create_profile_after_email_confirmation`
   (migration 013). As expressões `case ... account_status` devolviam `text` mas a
   coluna é `public.account_status`. **Corrigido** com a migration
   `017_fix_email_confirmation_profile_cast.sql` (casts explícitos).
2. **005 (teste 6)** — a migration 013 reescreveu `confirm_email_verification` e
   removeu a verificação de divergência de e-mail que existia na migration 005
   (regressão de segurança). **Corrigido** na migration 017 (verificação restaurada).
3. **002 e 004** — setup de teste desatualizado face à migration 013 (que passou a
   criar perfil só após confirmação de e-mail). Os testes inseriam utilizadores com
   `phone_confirmed_at` e o `update profiles` afetava 0 linhas. **Corrigido** o setup
   (inserir com e-mail nulo e disparar o trigger com `update email_confirmed_at`),
   sem alterar as asserções.

Nenhuma migration 001 a 016 foi editada. A correção é a nova migration 017.

## Tarefa 2 — Validação automática

- **npm ci**: OK.
- **Lint**: `tsc --noEmit` → 0 erros.
- **Testes**: `npm test` → 30 testes, 30 passam, 0 falham.
- **Export Android**: `npx expo export --platform android --output-dir /tmp/final`
  → sucesso; bundle `_expo/static/js/android/entry-*.hbc` (4.3MB).
- **Grep no bundle**: `grep -rl "maplibre\|react-map-gl\|mockAuth\|Modo mock\|isMockAuthActive" /tmp/final`
  → `OK` (0 resultados).
- **expo-doctor**: 19/20. 1 falha:
  *Check that packages match versions required by installed Expo SDK* — mismatches
  de versão minor/patch (expo 58.0.26 vs ~58.1.0; expo-location, expo-notifications,
  expo-router, expo-splash-screen). Não é falha de rede; resolver com
  `npx expo install --check`.
- **expo start**: `CI=1 npx expo start --offline` → Metro arranca em
  `http://localhost:8081` ("Metro is running in CI mode").

## Tarefa 3 — Preparação do APK (não executado)

- `eas.json`: perfil `preview` com `android.buildType = "apk"` — confirmado.
- `app.json`: `android.package = ao.kambago.app` — confirmado; sem chaves reais.
- `extra.eas.projectId` ausente — exige `eas init`.

Comandos a correr pelo utilizador (por ordem):

```bash
npx eas-cli@latest login
npx eas-cli@latest init            # se app.json ainda não tiver extra.eas.projectId
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<valor>" --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<valor>" --visibility sensitive
npx eas-cli@latest build --platform android --profile preview
```

## Tarefa 4 — Testes manuais no Expo Go (por fazer)

- [ ] Registo → código por e-mail → entrada na conta.
- [ ] Recarregar `/verify-email` com o e-mail guardado; abrir a verificação sem e-mail mostra "Voltar ao registo".
- [ ] Esqueci a senha → e-mail → link `kambago://` (APK) ou `exp://` (Expo Go) → nova senha → login.
- [ ] Link inválido ou expirado mostra mensagem e botão para pedir outro.
- [ ] Motorista pendente não publica viagens nem fica online.
- [ ] Passageiro procura viagens e solicita lugar.
- [ ] Motorista aceita pedido, inicia e conclui viagem.
- [ ] Conta suspensa não executa operações de mobilidade.

## Pendências do utilizador

- **Supabase (remoto)**: configurar Redirect URLs (`kambago://reset-password` e o
  `exp://` do Expo Go), Site URL de produção e SMTP próprio.
- **Aplicar migrations 001 a 017** no projeto de desenvolvimento.
- **Login EAS** e variáveis `EXPO_PUBLIC_*` antes de gerar o APK.
- **Confirmar a paleta de cores** (vermelho atual `#E53935` ou azul-marinho original).