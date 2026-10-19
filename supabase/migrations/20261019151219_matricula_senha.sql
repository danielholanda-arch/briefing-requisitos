-- =========================================================
-- Matrícula informada pelo admin + senha provisória
-- =========================================================

-- Matrícula passa a ser digitada pelo admin (ex.: fcrs2245): só letras minúsculas e números
alter table public.profiles
  add constraint profiles_matricula_formato check (matricula ~ '^[a-z0-9]{3,30}$');

-- O banco não gera mais matrícula
drop function public.next_matricula();
drop sequence public.matricula_seq;

-- Senha provisória (padrão ou resetada pelo admin): o usuário precisa trocar no primeiro acesso.
-- Só a Edge Function (service_role) muda esta coluna; o cliente não tem política de update.
alter table public.profiles
  add column senha_provisoria boolean not null default true;

-- Enquanto a senha for provisória, o cliente não grava respostas
create or replace function private.pode_responder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and ativo
      and not senha_provisoria
      and status <> 'concluido'
  );
$$;
