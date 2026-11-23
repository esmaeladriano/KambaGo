# Regras de negócio

- Passageiros ativos podem solicitar viagens disponíveis.
- Motoristas precisam de conta ativa e veículo aprovado para criar viagens.
- Lugares solicitados não podem exceder a capacidade legal do veículo.
- O preço criado pelo motorista deve estar dentro de `fare_rules` do corredor.
- Estados de viagem: solicitada, aceite, a_caminho, embarque, em_andamento, concluida, cancelada.
- `start_trip` só aceita aceite/a_caminho e muda para em_andamento.
- `complete_trip` só aceita em_andamento e gera pagamentos pendentes em dinheiro.
- Cancelamento aplica regras de `fare_rules` e notifica passageiros.
- Pagamento electrónico não está disponível nesta fase.
- Ganhos exibidos na app são calculados a partir de pagamentos com estado pago.
