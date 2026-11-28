# KambaGo — Pendências

Data: 2026-11-28
Branch: `validation/evidence`

## Supabase (remoto)

- [ ] **Redirect URLs** (Authentication → URL Configuration):
  - `kambago://reset-password` (deep link da app).
  - O URL `exp://<IP-da-máquina>:8081/--/` do Expo Go (muda com o IP; acrescentar antes de testar localmente).
- [ ] **Site URL** de produção definido no painel Supabase.
- [ ] **SMTP próprio** configurado (evitar o limite do e-mail de teste padrão).

## Migrations

- [ ] Aplicar as migrations **001 a 017** no projeto de desenvolvimento
  (inclui a `017_fix_email_confirmation_profile_cast.sql`).

## Testes manuais no Expo Go

- [ ] Registo → código por e-mail → entrada na conta.
- [ ] Recarregar `/verify-email` com o e-mail guardado; abrir a verificação sem e-mail mostra "Voltar ao registo".
- [ ] Esqueci a senha → e-mail → link `kambago://` (APK) ou `exp://` (Expo Go) → nova senha → login.
- [ ] Link inválido ou expirado mostra mensagem e botão para pedir outro.
- [ ] Motorista pendente não publica viagens nem fica online.
- [ ] Passageiro procura viagens e solicita lugar.
- [ ] Motorista aceita pedido, inicia e conclui viagem.
- [ ] Conta suspensa não executa operações de mobilidade.

## EAS (gerar APK)

- [ ] `npx eas-cli@latest login`
- [ ] `npx eas-cli@latest init` (se `app.json` ainda não tiver `extra.eas.projectId`).
- [ ] Criar variáveis de ambiente do perfil `preview`:
  ```bash
  npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<valor>" --visibility plaintext
  npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<valor>" --visibility sensitive
  ```
- [ ] Build do APK:
  ```bash
  npx eas-cli@latest build --platform android --profile preview
  ```

## Decisão de paleta

- [ ] Confirmar a paleta de cores: **vermelho atual** (`#E53935` / `#C62828`) ou **azul-marinho original**.