# Auditoria de segurança

## Estado

- A autenticação simulada foi removida. Sem Supabase, nenhuma operação cria sessão.
- As migrations 009 a 012 estão preparadas, mas não foram aplicadas num Supabase remoto.
- Migrations 001 a 008 não foram substituídas nem modificadas; apenas o teste SQL 004 foi corrigido.

## Controlo de privilégios

- Operações administrativas usam RPCs `SECURITY DEFINER` com `auth.uid()` e `public.is_admin()`.
- `bootstrap_first_admin` foi revogado de `public`, `anon` e `authenticated` e concedido apenas a `service_role`.
- A eliminação direta em `profiles` foi removida; a conta passa pela RPC `request_account_deletion()`.
- Motoristas não podem verificar veículos diretamente; a migração mantém o trigger existente.
- Mutação direta em `trips` foi revogada para `authenticated`.

## Pagamentos e mapas

- Pagamentos electrónicos não foram implementados; a estrutura mantém estado `nao_disponivel`.
- Pagamentos em dinheiro só passam de `pendente` para `pago` pela RPC do motorista proprietário.
- Sem chave de mapas, a app mostra configuração pendente e não gera rotas simuladas.

## Riscos residuais

- Migrations devem ser aplicadas manualmente no Supabase de desenvolvimento.
- O primeiro administrador deve ser criado pelo procedimento documentado.
- Limites de Auth devem ser configurados no painel Supabase.
- Chaves de mapas, SMTP e notificações continuam fora do repositório.
- OWASP ZAP ativo não foi executado.
