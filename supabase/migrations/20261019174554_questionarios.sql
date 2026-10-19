-- =========================================================
-- Questionários (grupos de perguntas) anexados aos projetos.
-- Cada questionário anexado a um projeto é respondido e enviado separadamente
-- (status e data de envio saem de projetos e vão para projeto_questionarios).
-- =========================================================

create table public.questionarios (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null check (length(trim(nome)) > 0),
  descricao   text,
  padrao      boolean not null default false,  -- anexado automaticamente a projetos novos
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger questionarios_set_updated_at
  before update on public.questionarios
  for each row execute function public.set_updated_at();

-- As seções atuais formam o questionário "Fase inicial"
insert into public.questionarios (nome, padrao) values ('Fase inicial', true);

alter table public.secoes
  add column questionario_id uuid references public.questionarios (id) on delete restrict;

update public.secoes
   set questionario_id = (select id from public.questionarios where nome = 'Fase inicial');

alter table public.secoes alter column questionario_id set not null;

create index secoes_questionario_ordem_idx on public.secoes (questionario_id, ordem);

-- Questionários anexados a cada projeto ------------------------
create table public.projeto_questionarios (
  projeto_id       uuid not null references public.projetos (id) on delete cascade,
  questionario_id  uuid not null references public.questionarios (id) on delete restrict,
  status           public.briefing_status not null default 'nao_iniciado',
  enviado_em       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (projeto_id, questionario_id)
);

create index projeto_questionarios_questionario_idx on public.projeto_questionarios (questionario_id);

create trigger projeto_questionarios_set_updated_at
  before update on public.projeto_questionarios
  for each row execute function public.set_updated_at();

-- Migra: os projetos atuais ficam com a "Fase inicial", mantendo status e envio
insert into public.projeto_questionarios (projeto_id, questionario_id, status, enviado_em, created_at)
select p.id, q.id, p.status, p.enviado_em, p.created_at
  from public.projetos p
 cross join public.questionarios q;

-- Projeto novo já nasce com os questionários marcados como padrão
create function private.anexar_questionarios_padrao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.projeto_questionarios (projeto_id, questionario_id)
  select new.id, q.id from public.questionarios q where q.padrao;
  return new;
end;
$$;

revoke all on function private.anexar_questionarios_padrao() from public, anon, authenticated;

create trigger projetos_anexa_questionarios_padrao
  after insert on public.projetos
  for each row execute function private.anexar_questionarios_padrao();

-- Seção não troca de questionário; pergunta respondida não muda de questionário
create function private.proteger_questionario_secao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.questionario_id <> old.questionario_id then
    raise exception 'A seção não pode mudar de questionário.';
  end if;
  return new;
end;
$$;

create function private.proteger_questionario_pergunta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.secao_id <> old.secao_id
     and (select questionario_id from public.secoes where id = new.secao_id)
         <> (select questionario_id from public.secoes where id = old.secao_id) then
    raise exception 'A pergunta não pode mudar de questionário.';
  end if;
  return new;
end;
$$;

revoke all on function private.proteger_questionario_secao() from public, anon, authenticated;
revoke all on function private.proteger_questionario_pergunta() from public, anon, authenticated;

create trigger secoes_protege_questionario
  before update on public.secoes
  for each row execute function private.proteger_questionario_secao();

create trigger perguntas_protege_questionario
  before update on public.perguntas
  for each row execute function private.proteger_questionario_pergunta();

-- Permissão de resposta passa a ser por (projeto, pergunta) ---------
drop policy "cliente cria respostas enquanto não enviou" on public.answers;
drop policy "cliente edita respostas enquanto não enviou" on public.answers;
drop function private.pode_responder(uuid);

-- Dono do projeto, conta ativa com senha própria, pergunta ativa de um
-- questionário anexado ao projeto e ainda não enviado
create function private.pode_responder(_projeto uuid, _pergunta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.projeto_questionarios pq
      join public.projetos pr on pr.id = pq.projeto_id
      join public.profiles pf on pf.id = pr.cliente_id
      join public.secoes s on s.questionario_id = pq.questionario_id
      join public.perguntas p on p.secao_id = s.id
     where pq.projeto_id = _projeto
       and p.id = _pergunta
       and p.ativa
       and pr.cliente_id = (select auth.uid())
       and pf.ativo
       and not pf.senha_provisoria
       and pq.status <> 'concluido'
  );
$$;

revoke all on function private.pode_responder(uuid, text) from public, anon;
grant execute on function private.pode_responder(uuid, text) to authenticated;

create policy "cliente cria respostas enquanto não enviou"
  on public.answers for insert to authenticated
  with check (private.pode_responder(projeto_id, question_id));

create policy "cliente edita respostas enquanto não enviou"
  on public.answers for update to authenticated
  using (private.pode_responder(projeto_id, question_id))
  with check (private.pode_responder(projeto_id, question_id));

-- Primeira resposta marca "em andamento" o questionário daquela pergunta
create or replace function private.marcar_em_andamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projeto_questionarios pq
     set status = 'em_andamento'
   where pq.projeto_id = new.projeto_id
     and pq.status = 'nao_iniciado'
     and pq.questionario_id = (
       select s.questionario_id
         from public.perguntas p
         join public.secoes s on s.id = p.secao_id
        where p.id = new.question_id
     );
  return new;
end;
$$;

-- Envio passa a ser por questionário do projeto
drop function public.enviar_briefing(uuid);

create function public.enviar_briefing(_projeto uuid, _questionario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projeto_questionarios pq
     set status = 'concluido', enviado_em = now()
   where pq.projeto_id = _projeto
     and pq.questionario_id = _questionario
     and pq.status <> 'concluido'
     and exists (
       select 1
         from public.projetos pr
         join public.profiles pf on pf.id = pr.cliente_id
        where pr.id = pq.projeto_id
          and pr.cliente_id = (select auth.uid())
          and pf.ativo
          and not pf.senha_provisoria
     );

  if not found then
    raise exception 'Este questionário não pode ser enviado.';
  end if;
end;
$$;

revoke all on function public.enviar_briefing(uuid, uuid) from public, anon;
grant execute on function public.enviar_briefing(uuid, uuid) to authenticated;

-- projetos não guarda mais status nem envio
alter table public.projetos
  drop column status,
  drop column enviado_em;

-- RLS -------------------------------------------------------
alter table public.questionarios         enable row level security;
alter table public.projeto_questionarios enable row level security;

create policy "logados leem os questionários"
  on public.questionarios for select to authenticated
  using (true);

create policy "admin cria questionários"
  on public.questionarios for insert to authenticated
  with check ((select private.has_role('admin')));

create policy "admin edita questionários"
  on public.questionarios for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admin apaga questionários"
  on public.questionarios for delete to authenticated
  using ((select private.has_role('admin')));

-- a subconsulta em projetos já respeita o RLS de projetos
create policy "cliente vê os questionários dos próprios projetos, admin vê todos"
  on public.projeto_questionarios for select to authenticated
  using (
    projeto_id in (select id from public.projetos where cliente_id = (select auth.uid()))
    or (select private.has_role('admin'))
  );

-- mudança de status pelo cliente é só via RPC enviar_briefing
create policy "admin anexa questionários"
  on public.projeto_questionarios for insert to authenticated
  with check ((select private.has_role('admin')));

create policy "admin edita anexos"
  on public.projeto_questionarios for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admin remove anexos"
  on public.projeto_questionarios for delete to authenticated
  using ((select private.has_role('admin')));

-- Grants explícitos -----------------------------------------
revoke all on public.questionarios, public.projeto_questionarios from anon;
grant select, insert, update, delete on public.questionarios, public.projeto_questionarios to authenticated;
