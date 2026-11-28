# KambaGo — Arquitetura

## Âmbito

Aplicação **mobile** construída com Expo SDK 58 + Expo Router + TypeScript.
O alvo é **Android** (Expo Go e APK). A versão **Web foi removida** do projeto.

## Remoção da Web

- `package.json`: removidos os scripts `web` e `build:web`; removidas as
  dependências `maplibre-gl`, `react-map-gl`, `react-dom` e `react-native-web`.
- `app.json`: removido o bloco `web` dentro de `expo`.
- Removidos `components/PassengerMapWebMap.tsx` e `components/PassengerMap.web.tsx`.
- `react-native-web` e `react-dom` já não são dependências diretas (podem
  persistir em `node_modules` apenas como dependências transitivas de terceiros).
- O mapa usa `components/PassengerMap.native.tsx` (react-native-maps) no Android;
  `components/PassengerMap.tsx` é o fallback neutro.

## Tema (paleta padrão)

Ficheiro: `constants/theme.ts`.

Paleta: vermelho `#E53935` / `#C62828`, branco, preto `#191919`.

Chaves disponíveis:

- Cores: `primary`, `primaryDark`, `primaryLight`, `background`, `surface`,
  `surfaceMuted`, `border`, `textPrimary`, `textSecondary`, `success`,
  `successSurface`, `danger`, `dangerSurface`, `warning`, `warningSurface`,
  `accent`.
- `KAMBAGO_RADIUS`: `sm`, `md`, `lg`, `xl`.
- `KAMBAGO_SPACING`: `xs`, `sm`, `md`, `lg`, `xl`.

Os aliases antigos (`navy`, `teal`, `amber`, `textMuted`, etc.) foram removidos;
todos os usos em `app/` e `components/` foram migrados para as chaves novas.

## Serviços

- `services/auth/authService.ts`: autenticação Supabase. As funções de
  recuperação de senha recebem `redirectTo` por parâmetro (sem imports nativos).
- `services/supabase/`: cliente Supabase e armazenamento de dispositivo.
  `deviceStorage.native.ts` usa `expo-secure-store` (Android Keystore) para
  cifrar a sessão; `deviceStorage.ts` é o fallback em memória/localStorage.

## Base de dados

Migrations `001` a `016` em `supabase/migrations/` (não editadas neste trabalho).
Testes pgTAP em `supabase/tests/`.