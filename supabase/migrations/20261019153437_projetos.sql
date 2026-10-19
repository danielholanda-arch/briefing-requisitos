-- =========================================================
-- Um cliente pode ter vários projetos; cada projeto tem o seu briefing
-- (status, data de envio e respostas passam de profiles para projetos)
-- =========================================================

create table public.projetos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.profiles (id) on delete cascade,
  nome        text not null check (length(trim(nome)) > 0),
  status      public.briefing_status not null default 'nao_iniciado',
  enviado_em  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projetos_cliente_idx on public.projetos (cliente_id);

create trigger projetos_set_updated_at
  before update on public.projetos
  for each row execute function public.set_updated_at();

-- Migra: cada cliente atual ganha um projeto com o briefing que já tinha
insert into public.projetos (cliente_id, nome, status, enviado_em, created_at)
select p.id, coalesce(nullif(trim(p.projeto), ''), 'Projeto principal'), p.status, p.enviado_em, p.created_at
  from public.profiles p
  join public.user_roles r on r.user_id = p.id and r.role = 'cliente';

-- answers: chave passa a ser (projeto_id, question_id) ------------
drop policy "lê as próprias respostas ou admin lê todas" on public.answers;
drop policy "cliente cria respostas enquanto não enviou" on public.answers;
drop policy "cliente edita respostas enquanto não enviou" on public.answers;
drop trigger answers_marca_em_andamento on public.answers;

alter table public.answers
  add column projeto_id uuid references public.projetos (id) on delete cascade;

update public.answers a
   set projeto_id = pr.id
  from public.projetos pr
 where pr.cliente_id = a.user_id;

alter table public.answers drop constraint answers_pkey;
alter table public.answers alter column projeto_id set not null;
alter table public.answers drop column user_id;
alter table public.answers add primary key (projeto_id, question_id);

-- Permissões por projeto ------------------------------------
drop function private.pode_responder();

create function private.pode_responder(_projeto uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.projetos pr
      join public.profiles p on p.id = pr.cliente_id
     where pr.id = _projeto
       and pr.cliente_id = (select auth.uid())
       and p.ativo
       and not p.senha_provisoria
       and pr.status <> 'concluido'
  );
$$;

revoke all on function private.pode_responder(uuid) from public, anon;
grant execute on function private.pode_responder(uuid) to authenticated;

-- Primeira resposta muda o status DO PROJETO para "em_andamento"
create or replace function private.marcar_em_andamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projetos
     set status = 'em_andamento'
   where id = new.projeto_id and status = 'nao_iniciado';
  return new;
end;
$$;

create trigger answers_marca_em_andamento
  after insert on public.answers
  for each row execute function private.marcar_em_andamento();

-- Cliente envia o briefing de UM projeto (RPC)
drop function public.enviar_briefing();

create function public.enviar_briefing(_projeto uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projetos pr
     set status = 'concluido', enviado_em = now()
   where pr.id = _projeto
     and pr.cliente_id = (select auth.uid())
     and pr.status <> 'concluido'
     and exists (
       select 1 from public.profiles p
        where p.id = pr.cliente_id and p.ativo and not p.senha_provisoria
     );

  if not found then
    raise exception 'Este briefing não pode ser enviado.';
  end if;
end;
$$;

revoke all on function public.enviar_briefing(uuid) from public, anon;
grant execute on function public.enviar_briefing(uuid) to authenticated;

-- profiles não guarda mais projeto nem status
alter table public.profiles
  drop column projeto,
  drop column status,
  drop column enviado_em;

-- RLS -------------------------------------------------------
alter table public.projetos enable row level security;

create policy "cliente vê os próprios projetos, admin vê todos"
  on public.projetos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select private.has_role('admin')));

create policy "admin cria projetos"
  on public.projetos for insert to authenticated
  with check ((select private.has_role('admin')));

-- mudança de status pelo cliente é só via RPC enviar_briefing
create policy "admin edita projetos"
  on public.projetos for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admin apaga projetos"
  on public.projetos for delete to authenticated
  using ((select private.has_role('admin')));

-- answers: a subconsulta em projetos já respeita o RLS acima
create policy "lê respostas dos próprios projetos ou admin lê todas"
  on public.answers for select to authenticated
  using (
    projeto_id in (select id from public.projetos where cliente_id = (select auth.uid()))
    or (select private.has_role('admin'))
  );

create policy "cliente cria respostas enquanto não enviou"
  on public.answers for insert to authenticated
  with check (
    private.pode_responder(projeto_id)
    and exists (select 1 from public.perguntas p where p.id = question_id and p.ativa)
  );

create policy "cliente edita respostas enquanto não enviou"
  on public.answers for update to authenticated
  using (private.pode_responder(projeto_id))
  with check (
    private.pode_responder(projeto_id)
    and exists (select 1 from public.perguntas p where p.id = question_id and p.ativa)
  );

-- Grants explícitos -----------------------------------------
revoke all on public.projetos from anon;
grant select, insert, update, delete on public.projetos to authenticated;
