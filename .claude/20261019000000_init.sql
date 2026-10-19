-- =========================================================
-- Briefing de Projeto: schema inicial
-- =========================================================

-- Tipos -----------------------------------------------------
create type public.app_role as enum ('admin', 'cliente');
create type public.briefing_status as enum ('nao_iniciado', 'em_andamento', 'concluido');

-- Tabelas ---------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  matricula   text not null unique,
  nome        text not null,
  empresa     text,
  telefone    text,
  projeto     text,
  ativo       boolean not null default true,
  status      public.briefing_status not null default 'nao_iniciado',
  enviado_em  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Papéis ficam numa tabela separada (nunca no perfil)
create table public.user_roles (
  user_id  uuid not null references auth.users (id) on delete cascade,
  role     public.app_role not null,
  primary key (user_id, role)
);

create table public.answers (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  question_id  text not null,           -- id estável vindo de questions.ts
  value        jsonb,                   -- string | string[] | number | { opcoes: [], outro: '' }
  skipped      boolean not null default false,  -- "prefiro conversar na reunião"
  updated_at   timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Matrícula sequencial: REQ-2026-0001 ------------------------
create sequence public.matricula_seq;

create function public.next_matricula()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'REQ-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.matricula_seq')::text, 4, '0');
$$;

-- Só a Edge Function (service_role) gera matrícula
revoke all on function public.next_matricula() from public, anon, authenticated;
grant execute on function public.next_matricula() to service_role;

-- Helpers de permissão --------------------------------------
create function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = _role
  );
$$;

create function public.pode_responder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and ativo and status <> 'concluido'
  );
$$;

-- updated_at automático -------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger answers_set_updated_at
  before update on public.answers
  for each row execute function public.set_updated_at();

-- Primeira resposta muda o status para "em_andamento" --------
create function public.marcar_em_andamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set status = 'em_andamento'
   where id = new.user_id and status = 'nao_iniciado';
  return new;
end;
$$;

create trigger answers_marca_em_andamento
  after insert on public.answers
  for each row execute function public.marcar_em_andamento();

-- Cliente envia o briefing (RPC) ----------------------------
create function public.enviar_briefing()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set status = 'concluido', enviado_em = now()
   where id = (select auth.uid()) and ativo and status <> 'concluido';

  if not found then
    raise exception 'Este briefing não pode ser enviado.';
  end if;
end;
$$;

revoke all on function public.enviar_briefing() from public, anon;
grant execute on function public.enviar_briefing() to authenticated;

-- RLS -------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;
alter table public.answers    enable row level security;

-- profiles
create policy "admin vê todos os perfis"
  on public.profiles for select to authenticated
  using (public.has_role('admin'));

create policy "cliente vê o próprio perfil"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- cliente NÃO atualiza o próprio perfil direto (mudança de status é via RPC)
create policy "admin atualiza perfis"
  on public.profiles for update to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- user_roles (escrita só pela service_role, na Edge Function)
create policy "lê os próprios papéis ou admin lê todos"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role('admin'));

-- answers
create policy "admin lê todas as respostas"
  on public.answers for select to authenticated
  using (public.has_role('admin'));

create policy "cliente lê as próprias respostas"
  on public.answers for select to authenticated
  using (user_id = (select auth.uid()));

create policy "cliente cria respostas enquanto não enviou"
  on public.answers for insert to authenticated
  with check (user_id = (select auth.uid()) and public.pode_responder());

create policy "cliente edita respostas enquanto não enviou"
  on public.answers for update to authenticated
  using (user_id = (select auth.uid()) and public.pode_responder())
  with check (user_id = (select auth.uid()) and public.pode_responder());

-- Grants explícitos -----------------------------------------
revoke all on public.profiles, public.user_roles, public.answers from anon;
grant select, update         on public.profiles   to authenticated;
grant select                 on public.user_roles to authenticated;
grant select, insert, update on public.answers    to authenticated;

-- =========================================================
-- Primeiro admin (rodar UMA vez, à mão, depois de criar o usuário
-- admin@briefing.local em Authentication > Users no painel):
--
-- insert into public.profiles (id, matricula, nome)
--   values ('<uuid-do-usuario>', 'ADMIN', 'Seu nome');
-- insert into public.user_roles (user_id, role)
--   values ('<uuid-do-usuario>', 'admin');
-- =========================================================
