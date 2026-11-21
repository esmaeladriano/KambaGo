-- Remove a RPC histórica de verificação por telefone após o abandono do fluxo SMS.
-- Mantém phone_verified e o histórico das migrations 003/005/006 para compatibilidade.

drop function if exists public.confirm_phone_verification();
