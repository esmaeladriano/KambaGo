# KambaGo — Regras de negócio

Documento de referência das regras que o sistema deve cumprir.
Cada regra tem um identificador (RN-xxx), a fonte no código e o estado de implementação.

Estados: **Implementada** (código e teste existem), **Parcial** (existe mas incompleta), **Pendente** (não existe no código).

Legenda de fontes: `M0xx` = migration em `supabase/migrations/`; `T0xx` = teste em `supabase/tests/`; `U/S/A` = ficheiros em `utils/`, `services/`, `app/`.

---

## 1. Papéis

| Papel | Como obtém | Pode |
|---|---|---|
| Visitante | sem sessão | registar-se, entrar, recuperar senha |
| Passageiro | registo com papel passenger | procurar viagens, pedir lugares, acompanhar pedidos, cancelar pedidos pendentes |
| Motorista | registo com papel driver + aprovação do admin | publicar viagens, aceitar/rejeitar pedidos, iniciar/concluir/cancelar as suas viagens, marcar pagamentos em dinheiro como pagos |
| Administrador | atribuição controlada no servidor | aprovar/rejeitar motoristas e veículos, suspender contas, cancelar qualquer viagem |

- **RN-001** O papel não pode ser alterado pelo cliente. Só o servidor o altera. — M008 (trigger de perfis). **Implementada**.
- **RN-002** O papel admin nunca é escolhido no formulário de registo. — M009 (`bootstrap_first_admin`, executável só fora do cliente). **Implementada**.

## 2. Conta e autenticação

- **RN-010** O registo cria apenas a conta de autenticação, não confirmada. O perfil operacional só existe após confirmação do e-mail. — M013, M017. **Implementada**.
- **RN-011** A confirmação é feita com código de 6 dígitos enviado por e-mail (Supabase Auth, `verifyOtp`). — `services/auth/authService.ts`, `config.toml` (`otp_length = 6`). **Implementada**.
- **RN-012** O código expira em **1 hora** (`otp_expiry = 3600`). Valor configurado, mas longo para OTP. **Decisão pendente**: recomendado 10 minutos.
- **RN-013** O reenvio do código só fica disponível após **60 segundos**. — `app/(auth)/verify-email.tsx`. **Implementada** no ecrã; o servidor do Supabase não impõe este limite. **Parcial**.
- **RN-014** Utilizador não confirmado que tenta entrar é encaminhado para a verificação com o e-mail da conta. — `app/(auth)/login.tsx`. **Implementada**.
- **RN-015** A senha tem no mínimo **8 caracteres** no formulário. O Supabase aceita 6 (`minimum_password_length = 6`). **Inconsistência**: alinhar `config.toml` com 8.
- **RN-016** A recuperação de senha é independente da verificação de conta. Usa link por e-mail que abre `kambago://reset-password`. A resposta é igual para e-mails existentes e inexistentes. — `services/auth/authService.ts`, `app/(auth)/reset-password.tsx`. **Implementada**; falta teste manual no Expo Go.
- **RN-017** O telefone é guardado no formato angolano `+244 9XX XXX XXX`. — `utils/validation.ts`. **Implementada**.
- **RN-018** Um utilizador só acede a funcionalidades protegidas com sessão válida e conta `ativa`. — `app/index.tsx`, RLS. **Implementada**.

## 3. Estados da conta

| Estado | Significado | Efeito |
|---|---|---|
| `pendente` | conta criada, ainda não aprovada | passageiro: entra após confirmar e-mail (ativa); motorista: não publica nem fica online |
| `ativa` | conta operacional | pode usar as funções do seu papel |
| `suspensa` | bloqueada por admin | não executa nenhuma operação de mobilidade |

- **RN-020** Passageiro fica `ativa` imediatamente após confirmar o e-mail. — M013. **Implementada**.
- **RN-021** Motorista fica `pendente` até aprovação do administrador. Confirmar o e-mail não basta. — M013, M010. **Implementada**.
- **RN-022** Conta `suspensa` bloqueia `start_trip`, `complete_trip` e `cancel_trip` do próprio motorista. — M014, T014. **Implementada**.
- **RN-023** Admin pode cancelar uma viagem mesmo com o motorista suspenso. — M014. **Implementada**.
- **RN-024** Eliminação de conta é feita só por `request_account_deletion()`, que apaga o utilizador de autenticação e, em cascata, o perfil. — M001, M008. **Implementada**.

## 4. Motorista e veículo

- **RN-030** Motorista só publica viagens se a conta estiver `ativa` e tiver um veículo verificado. — M011 (`create_trip`). **Implementada**.
- **RN-031** O veículo é aprovado por admin (`approve_vehicle`). Um motorista nunca verifica o próprio veículo. — M010. **Implementada**.
- **RN-032** Motorista rejeitado ou com veículo rejeitado não pode criar viagens. — M010, M011. **Implementada**.
- **RN-033** Motorista só fica online (`set_driver_availability`) se estiver `ativa`. — M008. **Implementada**.
- **RN-034** Capacidade legal do veículo é o limite máximo de lugares por viagem (`legal_capacity`). — M011, linha 78. **Implementada**.

## 5. Viagens

### 5.1 Estados

`solicitada` → `aceite` → `a_caminho` → `embarque` → `em_andamento` → `concluida`
Qualquer estado antes de `concluida` pode ir para `cancelada` (ver secção 7).

- **RN-040** Uma viagem nasce `solicitada`, com `available_seats` igual ao número de lugares publicados. — M011. **Implementada**.
- **RN-041** Ao aceitar o primeiro pedido, a viagem passa a `aceite`. — M011 (`accept_trip_request`). **Implementada**.
- **RN-042** As transições `a_caminho` e `embarque` **não têm função que as execute**. Só existem no enum. **Pendente**.
- **RN-043** `start_trip` aceita apenas `aceite` ou `a_caminho` e leva a `em_andamento`. — M011, M014. **Implementada** (sem os passos intermédios, ver RN-042).
- **RN-044** `complete_trip` aceita apenas `em_andamento`. — M011. **Implementada**.
- **RN-045** Não são permitidos saltos de estado nem reabertura de viagens concluídas ou canceladas. — M011, M014. **Implementada**.

### 5.2 Publicação

- **RN-050** Origem, destino e preço total são obrigatórios. — M011. **Implementada**.
- **RN-051** O preço total tem de estar dentro de `min_fare_kz` e `max_fare_kz` da tarifa do corredor. Se o corredor não tiver tarifa, a viagem não é criada. — M011. **Implementada**.
- **RN-052** O número de lugares publicado está entre 1 e a capacidade legal do veículo. — M011. **Implementada**.
- **RN-053** Os corredores e as tarifas vivem na base de dados (`routes`, `fare_rules`), não no código. — M004, `supabase/seed/001_dev_corridors.sql`. **Implementada**.

### 5.3 Descoberta

- **RN-060** Só aparecem viagens com estado `solicitada`, lugares disponíveis, motorista `ativa` e veículo verificado. — M015. **Implementada**.
- **RN-061** A correspondência de origem e destino é feita por **nome normalizado** do corredor. — M015. **Parcial**.
- **RN-062** A descoberta não usa proximidade geográfica nem raio de pesquisa. — M015. **Pendente**.
- **RN-063** Não há limite de desvio de rota para recolher ou deixar passageiros. **Pendente** (decisão de produto: raio e desvio máximos em metros).
- **RN-064** Os resultados são ordenados por data de criação, mais recentes primeiro. Não há ordenação por desvio, lugares ou avaliação. — M015. **Parcial**.

## 6. Pedidos de lugar e preço partilhado

- **RN-070** Só passageiros `ativa` podem pedir lugar. — M007 (`request_shared_trip`). **Implementada**.
- **RN-071** O pedido deve ter entre 1 e 20 lugares e não pode exceder os lugares disponíveis. — M007. **Implementada**.
- **RN-072** Um passageiro não pode ter dois pedidos ativos (`pendente` ou `aceite`) para a mesma viagem. — M007. **Implementada**.
- **RN-073** Um pedido só é aceite se a viagem ainda estiver `solicitada` e tiver lugares suficientes. A aceitação é feita com bloqueio de linha, para impedir sobrelotação em pedidos simultâneos. — M008, M011, T013. **Implementada**.
- **RN-074** Só o motorista dono da viagem aceita ou rejeita pedidos. — M011. **Implementada**.
- **RN-075** Um passageiro não altera o preço, o estado, nem o motorista do pedido. Escritas diretas em `trip_requests` estão bloqueadas. — M008. **Implementada**.

### 6.1 Preço partilhado

Fórmula definitiva: **valor por passageiro = preço total ÷ passageiros confirmados**, arredondado.

- **RN-080** Ao pedir lugar, o passageiro vê um valor estimado. O cálculo atual usa `preço total ÷ lugares pedidos`. **Inconsistência**: deve usar `preço total ÷ (lugares já ocupados + lugares pedidos)`, que é o valor "até X Kz" da regra de preço máximo garantido. **Parcial**.
- **RN-081** O valor final é calculado no servidor, no fecho da viagem, com os lugares confirmados. — M011, M014 (`complete_trip`). **Implementada**.
- **RN-082** Se o valor final for inferior ao mostrado na reserva, a diferença deve ser devolvida. **Pendente** (não existe fluxo de devolução).
- **RN-083** O servidor nunca cobra acima do valor mostrado na reserva. **Pendente** (depende de RN-080 e RN-082).
- **RN-084** O histórico de alterações de preço é imutável. **Pendente** (não existe tabela de histórico de preços).

## 7. Cancelamentos

- **RN-090** Passageiro pode cancelar um pedido **pendente**. Pedido já aceite não pode ser cancelado por esta via. — M008. **Parcial** (não existe cancelamento de lugar já aceite).
- **RN-091** Motorista ou admin pode cancelar uma viagem que não esteja concluída nem cancelada. Motivo é obrigatório. — M011, M014. **Implementada**.
- **RN-092** Ao cancelar, os passageiros recebem notificação. — M014. **Implementada**.
- **RN-093** Cada cancelamento fica registado em `cancellation_records` com o motivo e a taxa aplicada. — M014. **Implementada**.
- **RN-094** Taxa de cancelamento: `driver_cancel_passenger_fee_kz` se a viagem estiver `solicitada` ou `aceite`; `late_cancel_fee_kz` nos outros estados. — M014. **Implementada** para o cálculo; a taxa não é cobrada nem registada em pagamento.
- **RN-095** Janelas de cancelamento gratuito (`free_cancel_minutes_after_booking` e `free_cancel_minutes_before_pickup`) existem na tabela mas **não são usadas em nenhuma função**. **Pendente**.
- **RN-096** Motorista que cancela após aceitação não tem penalização definida. **Decisão pendente**.

## 8. Pagamentos e ganhos

- **RN-100** Nesta fase, o único método é **dinheiro, pago ao motorista no fim da viagem**. Pagamento eletrónico (Multicaixa Express e outros) está fora do âmbito. — M012.
- **RN-101** Ao concluir a viagem, o servidor cria um pagamento `pendente` por passageiro confirmado. — M011, M014. **Implementada**.
- **RN-102** Só o motorista da viagem marca como `pago` um pagamento em dinheiro. Pagamentos não em dinheiro não podem ser marcados por esta via. — M012 (`mark_payment_paid`). **Implementada**.
- **RN-103** Estados de pagamento: `pendente`, `pago`, `falhado`, `reembolsado`. A coluna `status` é `text` sem restrição. — M007. **Parcial**: falta constraint e fluxo para `falhado` e `reembolsado`.
- **RN-104** Os ganhos do motorista são calculados a partir de pagamentos `pago`, nunca de valores fixos. — M016 (`fetch_driver_earnings`). **Implementada**.
- **RN-105** Pagamentos e ganhos só são visíveis ao passageiro e ao motorista envolvidos. — RLS, M008. **Implementada**.

## 9. Administração

- **RN-110** Admin consulta e aprova ou rejeita motoristas e veículos. Rejeição exige motivo. — M010, `app/admin/`. **Implementada**.
- **RN-111** Admin suspende e reativa contas (`set_account_status_admin`). Cada alteração fica em `audit_logs`. — M009. **Implementada**.
- **RN-112** Admin cancela viagens (RN-091). **Implementada**.
- **RN-113** Admin consulta indicadores e relatórios. **Pendente**.
- **RN-114** Admin gere tarifas e corredores. Não há ecrã nem RPC de escrita; só são editáveis via SQL. **Pendente**.

## 10. Notificações

- **RN-120** Passageiro recebe notificação ao ser cancelado (RN-092). **Implementada**.
- **RN-121** Notificações de pedido aceite, viagem iniciada, alteração de preço, pagamento registado e viagem concluída. **Pendente** (só existe o caso de cancelamento).
- **RN-122** Notificações push remotas (Expo Notifications) não funcionam no Expo Go para Android. Precisam de development build. **Limitação técnica**.

## 11. Privacidade e dados

- **RN-130** Coordenadas exatas, dados pessoais e identificadores internos não são expostos na descoberta. A descoberta devolve só o necessário. — M015. **Implementada**.
- **RN-131** Localização do motorista é enviada em intervalos de 10 a 15 segundos, nunca continuamente. **Pendente** (acompanhamento em tempo real não implementado).
- **RN-132** Localização do passageiro só é partilhada durante a viagem. **Pendente** (mesma razão).
- **RN-133** Fotografias de perfil ficam num bucket privado, com URL assinada de curta duração, até 2 MB, em JPEG, PNG ou WebP. — M012. **Implementada**.
- **RN-134** Consentimentos legais (termos e privacidade) são registados com data no perfil. — M013. **Implementada**; os textos ainda são rascunho a validar por advogado.
- **RN-135** Eliminação de conta é feita pela própria pessoa, através de operação controlada (RN-024). **Implementada**.

## 12. Limites e configuração

| Parâmetro | Valor atual | Onde | Estado |
|---|---|---|---|
| Lugares por pedido | 1 a 20 | M007 | Implementada |
| Lugares por viagem | 1 até capacidade legal | M011 | Implementada |
| Pedidos ativos por viagem e passageiro | 1 | M007 | Implementada |
| Reenvio de código | 60 s | ecrã | Parcial |
| Validade do código | 1 hora | config.toml | Decisão pendente |
| Senha mínima | 8 (cliente), 6 (servidor) | validation.ts, config.toml | Inconsistente |
| Tarifa mínima e máxima | por corredor | fare_rules | Implementada |
| Taxa de cancelamento tardio | 200 Kz (seed) | fare_rules | Implementada |
| Raio de pesquisa | não definido | — | Pendente |
| Desvio máximo | não definido | — | Pendente |

## 13. Resumo de pendências

Decisões de produto necessárias antes de implementar:
1. Raio de pesquisa e desvio máximo de rota (RN-062, RN-063).
2. Validade do código OTP (RN-012).
3. Senha mínima oficial (RN-015).
4. Janelas de cancelamento gratuito e penalização de motorista (RN-095, RN-096).
5. Fórmula do valor mostrado na reserva (RN-080).
6. Regra de devolução de diferença (RN-082, RN-083).

Implementação pendente (técnica):
- RN-042 — transições `a_caminho` e `embarque`.
- RN-082, RN-083, RN-084 — devolução, limite de cobrança e histórico de preços.
- RN-103 — constraint de estados de pagamento, `falhado` e `reembolsado`.
- RN-062, RN-064 — matching geográfico e ordenação.
- RN-090 — cancelamento de lugar já aceite.
- RN-113, RN-114 — relatórios e gestão de tarifas no admin.
- RN-121 — notificações de viagem.
- RN-131, RN-132 — acompanhamento em tempo real.
