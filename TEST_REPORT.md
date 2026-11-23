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
- `npm test`: 25 testes passaram.
- `npx expo-doctor`: 20/20 checks passaram.
- Export Android: concluído em `/tmp/final`.
- `npx expo start --offline --clear` com `CI=1`: iniciado.
- Supabase local: migrations 001–012 aplicadas sem erro.
- Supabase SQL: 12 ficheiros, 43 testes, resultado PASS.

## Verificação de mock

- `grep mockAuth|Modo mock /tmp/final`: sem ocorrências.
- `grep 123456 /tmp/final`: sem strings textuais no bundle; não há código OTP de teste no cliente.

## Não executado

- Gitleaks: executado por binário temporário instalado fora do repositório; 31 commits analisados, nenhum vazamento encontrado.
- Opengrep: ferramenta indisponível.
- OWASP ZAP ativo: não executado por segurança.
