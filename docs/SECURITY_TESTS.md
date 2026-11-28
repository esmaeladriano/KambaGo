# Plano e resultados de testes de segurança

## Matrizes

Testar explicitamente visitante, passageiro A, passageiro B, motorista pendente, motorista ativo, motorista suspenso e administrador nas operações:

- Login, registo, reenvio OTP e verificação de e-mail.
- Alteração de papel e estado de conta.
- Aprovação/rejeição de motorista e veículo.
- Criação, início, conclusão e cancelamento de viagem.
- Aceite/rejeição/cancelamento de pedido.
- Alteração direta de `trips`, `trip_requests`, `payments` e `profiles`.

## Testes locais

- Resultado local: **All tests successful**, 12 ficheiros e 43 testes no Supabase local.
- Concorrência: executar `supabase/tests/concurrency_accept_trip_request.sh` com `CONNECTION_URL` e `REQUEST_ID`.
- A proteção depende do `FOR UPDATE` na viagem e no pedido dentro de `accept_trip_request`.
- Só uma das duas ligações simultâneas pode aceitar; a segunda deve encontrar o pedido já processado.

## Ferramentas

- Gitleaks: não disponível no ambiente.
- Opengrep: não disponível no ambiente.
- OWASP ZAP: apenas plano para staging; nenhum scan ativo foi executado.
