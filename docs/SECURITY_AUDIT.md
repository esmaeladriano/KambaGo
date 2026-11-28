# KambaGo — Auditoria de Segurança

Data: 2026-11-28
Branch: `validation/final-release`
Âmbito: aplicação mobile (Expo SDK 58 + Expo Router + TypeScript), Android.

## Estado

| Item                                  | Estado    | Notas |
| ------------------------------------- | --------- | ----- |
| Login simulado (mock auth)            | Resolvido | Removido `mockAuth` / `isMockAuthActive`; grep no bundle exportado não encontra resíduos. |
| Recuperação de senha                  | Resolvido | `redirectTo` por parâmetro; sem imports nativos em `services/`; deep link `kambago://reset-password`. Ver TEST_REPORT. |
| Web removida                          | Resolvido | Removidos `maplibre-gl`, `react-map-gl`, `react-native-web`, `react-dom` (diretos) e componentes web. App é só Android/Expo Go. |
| Segredos em ficheiros versionados     | Resolvido | Sem `service_role`, tokens, `EXPO_TOKEN` ou senhas em `app.json`/`eas.json`/código. |
| RLS e RPCs de mobilidade              | Resolvido | 14/14 testes pgTAP passam (incl. bloqueio de contas suspensas, divergence de e-mail). |
| Cast `text → enum` no trigger 013     | Resolvido | Migration `017_fix_email_confirmation_profile_cast.sql`. |
| Divergência de e-mail na confirmação  | Resolvido | Verificação reintroduzida na migration 017 (regressão da 013 face à 005). |

## Verificações

- `npm run lint` → 0 erros.
- `npm test` → 30/30 passam.
- Testes pgTAP → 14/14 passam (local, Docker).
- Grep no bundle Android → sem `maplibre`, `react-map-gl`, `mockAuth`, `Modo mock`, `isMockAuthActive`.
- `expo-doctor` → 19/20 (1 falha de versão de SDK, não de segurança).

## Pendências de segurança (fora do código)

- Configurar SMTP próprio no Supabase (evitar e-mail de teste padrão).
- Configurar Redirect URLs e Site URL de produção no painel Supabase.
- Aplicar migrations 001 a 017 no projeto de desenvolvimento.