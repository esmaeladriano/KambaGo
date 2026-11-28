# Relatório de testes

## Linha de base

- `npm ci`: concluído; 566 pacotes instalados.
- `npm run lint`: passou.
- `npm test`: 25 testes passaram.
- `npx expo-doctor`: 20/20 checks passaram.
- Export Android: concluído em `/tmp/base`.
- `npx expo start --offline --clear` com `CI=1`: iniciou o Metro offline.

## Final

- `npm run lint`: passou.
- `npm test`: 26 testes passaram.
- `npx expo-doctor`: 19/20 checks passaram (1 mismatch de versão expo, pré-existente, não bloqueante).
- Export Android: concluído em `/tmp/final`.
- `npx expo start --offline --clear` com `CI=1`: iniciado.
- Supabase local: migrations 001–012 aplicadas sem erro.
- Supabase SQL: 12 ficheiros, 43 testes, resultado PASS.

## Alterações desta sessão (Fase 1)

- `app/(auth)/login.tsx`: removida ligação direta para `/(auth)/verify-email`.
- `app/(auth)/register.tsx`: removida ligação direta para `/(auth)/verify-email` (substituída por link para login).
- `app/(auth)/verify-email.tsx`: estado sem e-mail mostra "Não encontrámos o e-mail do registo" + botão "Voltar ao registo"; e-mail pendente persistido em `expo-secure-store` (chave `kambago_pending_verification_email`) e limpo após confirmação/logout.
- `app/(auth)/reset-password.tsx` (novo): ecrã de nova senha com validação Zod (mínimo 8 car.), suporte a deep link `kambago://reset-password`, evento `PASSWORD_RECOVERY`, `supabase.auth.updateUser({ password })`, redireciona para login após sucesso.
- `app/_layout.tsx`: registado ecrã `(auth)/reset-password`.
- `app/profile/index.tsx`: logout limpa a chave de e-mail pendente do secure-store.
- `supabase/migrations/014_suspended_account_mobility_block.sql` (novo): `start_trip`, `complete_trip` e `cancel_trip` rejeitam operações quando o motorista tem `account_status = 'suspensa'`.

## Verificação de mock

- `grep mockAuth|Modo mock /tmp/final`: sem ocorrências.
- `grep 123456 /tmp/final`: sem strings textuais no bundle; não há código OTP de teste no cliente.


## Não executado

- Gitleaks: executado por binário temporário instalado fora do repositório; 31 commits analisados, nenhum vazamento encontrado.
- Opengrep: ferramenta indisponível.
- OWASP ZAP ativo: não executado por segurança.
