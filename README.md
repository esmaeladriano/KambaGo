# KambaGo

**Vamos juntos.** — *Mais pessoas. Menos custos. Uma só rota.*

Aplicação de partilha de táxi em Luanda, Angola (corredor inicial configurável: **Zango → Mutamba**), concebida com prioridade para dispositivos Android modestos, ligações móveis fracas e regras de negócio no servidor.

---

## Estado Atual: Etapa 1 (Autenticação, Perfis e Fundação)

Implementado nesta etapa:
- Identidade visual KambaGo (`#102A43`, `#16B8A6`, `#FFB547`, `#F7FAFC`, `#F1F5F9`) e logótipo SVG em `assets/images/kambago-logo.svg`.
- Ficheiro único de traduções em português adaptado a Angola (`locales/pt-AO.ts`).
- Esquemas de validação Zod para telefone `+244 9XX XXX XXX`, registo, login, OTP, recuperação de palavra-passe, perfil e exclusão de conta (`utils/validation.ts`).
- Máquina de estados de conta (`pendente`, `ativa`, `suspensa`) em `utils/accountState.ts`.
- Camadas de abstração:
  - `services/supabase/client.ts` (sem chaves fixas; mostra **"Configuração pendente"** quando faltam variáveis).
  - `services/sms/smsProvider.ts` (provedor SMS configurável para OTP).
  - `services/maps/mapsProvider.ts` (abstração pronta para trocar Google Maps por Mapbox na Etapa 3).
  - `services/notifications/notificationsService.ts` (Expo Notifications desativadas enquanto sem chaves).
- Base de dados Supabase (`supabase/migrations/001_stage1_auth_profiles.sql`): tabelas `profiles`, `audit_logs`, `routes`, RLS, bucket privado `profile-avatars`, função `request_account_deletion()`, seed de desenvolvimento (`supabase/seed/001_dev_corridors.sql`), Edge Function `send-otp` e testes SQL (`supabase/tests/001_rls_profiles.sql`).
- Pré-visualização web interativa da Etapa 1 (Vite + React) e rotas Expo Router (`app/`) prontas para o build Android.

---

## Variáveis de Ambiente

Copia `.env.example` para `.env` e preenche apenas as chaves públicas no cliente:

```bash
cp .env.example .env
```

- `EXPO_PUBLIC_SUPABASE_URL` / `VITE_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MAPS_PROVIDER` (`google` ou `mapbox`)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` ou `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`

Segredos de servidor (apenas nas Supabase Edge Functions, nunca no cliente):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMS_PROVIDER`, `SMS_PROVIDER_API_KEY`, `SMS_PROVIDER_API_SECRET`, `SMS_SENDER_ID`

---

## Comandos

### Pré-visualização Web & Testes Unitários (Ambiente Atual)
```bash
npm install
npm run dev           # Arranque na porta 3000
npm run build         # Verificação de build
npm run lint          # Verificação TypeScript
npx --yes tsx --test utils/*.test.ts services/**/*.test.ts
```

### Projeto Nativo Android (Expo / EAS Build local)
```bash
npx expo install expo-router expo-status-bar expo-constants expo-linking \
  react-native-safe-area-context react-native-screens react-native-reanimated \
  react-native-gesture-handler expo-notifications expo-image-picker expo-location \
  react-native-maps react-native-svg
```

### Estimativa de Custos de Mapas por Viagem (Referência)
- **Autocompletar**: debounce de `500 ms` e mínimo de `3` caracteres (máximo ~2–4 pedidos por pesquisa de origem/destino).
- **Cálculo de rota**: `1` pedido por viagem criada, guardado em cache de rotas para reutilização no mesmo corredor.
- **Atualização de posição do motorista**: intervalo fixo de `12 s` (nunca contínuo); numa viagem de `40 min`, equivale a ~`200` atualizações de coordenadas na base de dados/Realtime sem chamadas de API de mapas pagas.
