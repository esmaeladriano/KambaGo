# Arquitetura

## Cliente

- Expo + React Native + Expo Router.
- Configuração pública em `EXPO_PUBLIC_*` ou compatibilidade `REACT_APP_*` local.
- Supabase Auth persistido em SecureStore.
- Serviços isolam chamadas RPC e consultas RLS.

## Servidor

- PostgreSQL/Supabase com RLS.
- Migrations 001–008 existentes permanecem intactas.
- Migrations 009–012 adicionam contas, aprovações, ciclo de viagem e pagamentos.
- Operações sensíveis usam RPCs SECURITY DEFINER com validação explícita.

## Fluxos

- Passageiro descobre viagens e solicita lugares.
- Motorista aceita/rejeita pedidos e gere o ciclo da viagem.
- Administrador aprova/rejeita motoristas e veículos.
- Pagamentos em dinheiro são confirmados pelo motorista proprietário.
