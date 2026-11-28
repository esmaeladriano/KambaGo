# KambaGo — Relatório de Testes

Data: 2026-11-28
Branch: `fix/remove-web-and-fixes`
Âmbito: aplicação mobile (Expo SDK 58 + Expo Router + TypeScript), Android (Expo Go e APK).

## Resumo

| Verificação                | Resultado                    |
| -------------------------- | ---------------------------- |
| `npm run lint` (tsc)       | 0 erros                      |
| `npm test` (node:test)     | 30 passam, 0 falham (30 total)|
| Teste SQL 014 (pgTAP)      | 5/5 `ok` (executado local)   |
| `expo export --platform android` | Sucesso (1 bundle .hbc 4.3MB) |
| Grep web/mock no bundle    | OK (0 resultados)            |
| `expo-doctor`              | 19/20 (1 falha de versão)    |
| `expo start` (CI=1, offline) | Metro arranca em :8081     |

## Tarefa 3 — Testes de recuperação de senha (antes vs. depois)

Antes da correção, dois testes falhavam porque `requestPasswordResetWithClient`
executava `await import('expo-linking')` (módulo nativo) em ambiente Node:

- `requestPasswordReset envia redirectTo gerado por Linking.createURL` — **falhava**
- `requestPasswordReset devolve resposta igual para e-mail existente e inexistente` — **falhava**

Correção: `redirectTo` passou a ser parâmetro explícito de
`requestPasswordReset(email, redirectTo)` e
`requestPasswordResetWithClient(client, email, redirectTo)`. O ecrã
`app/(auth)/forgot-password.tsx` calcula o `redirectTo` com
`Linking.createURL('reset-password')`. Os testes usam um `redirectTo` fixo
(`kambago://reset-password`).

Depois: **30/30 testes passam, 0 falham.**

## Tarefa 4 — Teste SQL da migration 014

Ficheiro: `supabase/tests/014_suspended_mobility_block.sql` (padrão pgTAP do 013).

Executado contra a stack local Supabase (Docker), com `pgtap` instalado:

```
1..5
ok 1 - Motorista suspenso não inicia viagem (start_trip bloqueado)
ok 2 - Motorista suspenso não conclui viagem (complete_trip bloqueado)
ok 3 - Motorista suspenso não cancela viagem (cancel_trip bloqueado)
ok 4 - Motorista ativo dono da viagem inicia viagem (start_trip aceite)
ok 5 - Admin cancela viagem de motorista suspenso (cancel_trip aceite)
```

Todos os testes decorrem dentro de `begin; ... rollback;` — não alteram dados
persistentes. Não foi executado contra produção.

Nota: o trigger `create_profile_after_email_confirmation` (migration 013) tem um
bug latente de cast `text → enum` ao confirmar e-mail; o teste 014 contorna-o
inserindo `auth.users` já confirmados e criando os `profiles` diretamente com
casts explícitos de enum. Não foram editadas migrations existentes.

## Tarefa 5 — Validação

- **Lint**: `tsc --noEmit` → 0 erros.
- **Testes**: `npm test` → 30 testes, 30 passam, 0 falham.
- **Export Android**: `npx expo export --platform android --output-dir /tmp/final`
  → sucesso; bundle `_expo/static/js/android/entry-*.hbc` (4.3MB).
- **Grep no bundle**: `grep -rl "maplibre\|react-map-gl\|mockAuth\|Modo mock" /tmp/final`
  → `OK` (0 resultados).
- **expo-doctor**: 19/20 verificações passam. 1 falha:
  *Check that packages match versions required by installed Expo SDK* —
  mismatches de versão minor/patch (expo 58.0.26 vs ~58.1.0; expo-location,
  expo-notifications, expo-router, expo-splash-screen). Não é falha de rede;
  resolver com `npx expo install --check`.
- **expo start**: `CI=1 npx expo start --offline` → Metro arranca em
  `http://localhost:8081` ("Metro is running in CI mode").

## Pendências

- **Supabase (remoto)**: configurar Redirect URLs para `kambago://reset-password`
  e o URL `exp://` do Expo Go.
- **Migrations 014 a 016**: aplicar no projeto de desenvolvimento (não aplicado
  neste trabalho; apenas testado localmente).