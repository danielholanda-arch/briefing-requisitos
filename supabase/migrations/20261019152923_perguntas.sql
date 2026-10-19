-- =========================================================
-- Perguntas no banco: os admins editam pelo painel
-- =========================================================

create type public.tipo_pergunta as enum
  ('texto', 'texto_longo', 'escolha_unica', 'multipla_escolha', 'escala');

create table public.secoes (
  id          text primary key check (id ~ '^[a-z0-9_]{2,60}$'),
  titulo      text not null check (length(trim(titulo)) > 0),
  descricao   text,
  ordem       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.perguntas (
  id             text primary key check (id ~ '^[a-z0-9_]{2,60}$'),  -- = answers.question_id, nunca muda
  secao_id       text not null references public.secoes (id) on delete restrict,
  tipo           public.tipo_pergunta not null,
  titulo         text not null check (length(trim(titulo)) > 0),
  ajuda          text,
  placeholder    text,
  obrigatoria    boolean not null default false,
  opcoes         text[] not null default '{}',
  permite_outro  boolean not null default false,
  escala_min     integer,
  escala_max     integer,
  rotulo_min     text,
  rotulo_max     text,
  ordem          integer not null default 0,
  ativa          boolean not null default true,  -- arquivada = false (mantém as respostas antigas)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint perguntas_opcoes check (
    tipo not in ('escolha_unica', 'multipla_escolha') or cardinality(opcoes) >= 1),
  constraint perguntas_escala check (
    tipo <> 'escala'
    or (escala_min is not null and escala_max is not null
        and escala_max > escala_min and escala_max - escala_min <= 10))
);

create index perguntas_secao_ordem_idx on public.perguntas (secao_id, ordem);

create trigger secoes_set_updated_at
  before update on public.secoes
  for each row execute function public.set_updated_at();

create trigger perguntas_set_updated_at
  before update on public.perguntas
  for each row execute function public.set_updated_at();

-- id nunca muda; tipo só muda enquanto ninguém respondeu --------
create function private.proteger_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id then
    raise exception 'O id não pode ser alterado.';
  end if;
  return new;
end;
$$;

create function private.proteger_tipo_pergunta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo <> old.tipo
     and exists (select 1 from public.answers where question_id = old.id) then
    raise exception 'Esta pergunta já tem respostas: o tipo não pode mudar. Arquive e crie outra.';
  end if;
  return new;
end;
$$;

revoke all on function private.proteger_id() from public, anon, authenticated;
revoke all on function private.proteger_tipo_pergunta() from public, anon, authenticated;

create trigger secoes_protege_id
  before update on public.secoes
  for each row execute function private.proteger_id();

create trigger perguntas_protege_id
  before update on public.perguntas
  for each row execute function private.proteger_id();

create trigger perguntas_protege_tipo
  before update on public.perguntas
  for each row execute function private.proteger_tipo_pergunta();

-- Seed: as perguntas que estavam em src/data/questions.ts (mesmos ids) ----
insert into public.secoes (id, titulo, descricao, ordem) values
  ('empresa', 'Sobre a sua empresa', 'Para entendermos o contexto do negócio.', 10),
  ('objetivo', 'Objetivo do projeto', 'O problema que o sistema precisa resolver.', 20),
  ('usuarios', 'Quem vai usar', null, 30),
  ('funcionalidades', 'Funcionalidades', 'Não precisa ser completo: detalhamos juntos na reunião.', 40),
  ('visual', 'Identidade visual', null, 50),
  ('prazo_orcamento', 'Prazo e orçamento', null, 60),
  ('operacao', 'Depois de pronto', null, 70),
  ('final', 'Para fechar', null, 80);

insert into public.perguntas
  (id, secao_id, tipo, titulo, ajuda, placeholder, obrigatoria, opcoes, permite_outro,
   escala_min, escala_max, rotulo_min, rotulo_max, ordem) values
  ('empresa_descricao', 'empresa', 'texto_longo', 'O que a sua empresa faz?', 'Em poucas linhas: produtos ou serviços, e há quanto tempo atua.', null, true, '{}'::text[], false,
   null, null, null, null, 10),
  ('empresa_publico', 'empresa', 'texto_longo', 'Quem são os seus clientes?', null, 'Ex.: pequenas clínicas da região, que hoje agendam por WhatsApp', false, '{}'::text[], false,
   null, null, null, null, 20),
  ('empresa_tamanho', 'empresa', 'escolha_unica', 'Quantas pessoas trabalham na empresa?', null, null, false, array['Só eu', '2 a 10', '11 a 50', '51 a 200', 'Mais de 200']::text[], false,
   null, null, null, null, 30),
  ('objetivo_problema', 'objetivo', 'texto_longo', 'Qual problema você quer resolver com este projeto?', 'Conte como isso é feito hoje e o que incomoda.', null, true, '{}'::text[], false,
   null, null, null, null, 10),
  ('objetivo_tipo', 'objetivo', 'escolha_unica', 'Que tipo de solução você imagina?', null, null, false, array['Site institucional', 'Loja virtual', 'Sistema web (uso interno)', 'Sistema web (para os meus clientes)', 'Aplicativo de celular', 'Ainda não sei']::text[], true,
   null, null, null, null, 20),
  ('objetivo_sucesso', 'objetivo', 'texto_longo', 'Como você vai saber que o projeto deu certo?', null, 'Ex.: reduzir pela metade o tempo para emitir um orçamento', false, '{}'::text[], false,
   null, null, null, null, 30),
  ('usuarios_perfis', 'usuarios', 'texto_longo', 'Quais tipos de pessoa vão usar o sistema e o que cada uma faz nele?', null, 'Ex.: atendente cadastra pedidos; gerente vê relatórios; cliente acompanha o status', true, '{}'::text[], false,
   null, null, null, null, 10),
  ('usuarios_quantidade', 'usuarios', 'escolha_unica', 'Quantas pessoas devem usar no primeiro ano?', null, null, false, array['Até 10', '11 a 100', '101 a 1.000', 'Mais de 1.000', 'Não sei estimar']::text[], false,
   null, null, null, null, 20),
  ('usuarios_dispositivos', 'usuarios', 'multipla_escolha', 'Em quais dispositivos vão usar?', null, null, false, array['Computador', 'Celular', 'Tablet']::text[], false,
   null, null, null, null, 30),
  ('func_principais', 'funcionalidades', 'texto_longo', 'Liste as funcionalidades que não podem faltar na primeira versão.', 'Uma por linha ajuda bastante.', null, true, '{}'::text[], false,
   null, null, null, null, 10),
  ('func_desejaveis', 'funcionalidades', 'texto_longo', 'E o que seria bom ter, mas pode ficar para depois?', null, null, false, '{}'::text[], false,
   null, null, null, null, 20),
  ('func_recursos', 'funcionalidades', 'multipla_escolha', 'Quais destes recursos o sistema precisa ter?', null, null, false, array['Login de usuários', 'Pagamentos on-line', 'Envio de e-mails ou notificações', 'Relatórios e gráficos', 'Upload de arquivos', 'Agenda ou calendário', 'Área administrativa']::text[], true,
   null, null, null, null, 30),
  ('func_integracoes', 'funcionalidades', 'texto_longo', 'Precisa se integrar com algum sistema que você já usa?', null, 'Ex.: ERP, planilhas, WhatsApp, emissor de nota fiscal', false, '{}'::text[], false,
   null, null, null, null, 40),
  ('func_referencias', 'funcionalidades', 'texto_longo', 'Conhece algum sistema ou site parecido com o que você quer?', 'Links e o que você gosta (ou não gosta) em cada um.', null, false, '{}'::text[], false,
   null, null, null, null, 50),
  ('visual_identidade', 'visual', 'escolha_unica', 'A empresa já tem identidade visual?', null, null, false, array['Sim, com manual de marca', 'Tenho logo e cores, sem manual', 'Não tenho']::text[], false,
   null, null, null, null, 10),
  ('visual_estilo', 'visual', 'texto_longo', 'Como você gostaria que o sistema "parecesse"?', null, 'Ex.: sério e corporativo, leve e colorido, minimalista', false, '{}'::text[], false,
   null, null, null, null, 20),
  ('prazo_desejado', 'prazo_orcamento', 'escolha_unica', 'Para quando você precisa da primeira versão?', null, null, false, array['Até 1 mês', '1 a 3 meses', '3 a 6 meses', 'Mais de 6 meses', 'Sem data definida']::text[], false,
   null, null, null, null, 10),
  ('prazo_motivo', 'prazo_orcamento', 'texto', 'Existe alguma data que não pode ser perdida? Qual e por quê?', null, null, false, '{}'::text[], false,
   null, null, null, null, 20),
  ('orcamento_faixa', 'prazo_orcamento', 'escolha_unica', 'Qual a faixa de investimento prevista?', 'Ajuda a propor uma solução do tamanho certo.', null, false, array['Até R$ 5 mil', 'R$ 5 mil a R$ 15 mil', 'R$ 15 mil a R$ 50 mil', 'Acima de R$ 50 mil', 'Ainda não defini']::text[], false,
   null, null, null, null, 30),
  ('urgencia', 'prazo_orcamento', 'escala', 'Qual a urgência deste projeto para a empresa?', null, null, false, '{}'::text[], false,
   1, 5, 'Pode esperar', 'Muito urgente', 40),
  ('operacao_responsavel', 'operacao', 'texto', 'Quem vai ser o responsável pelo sistema na empresa?', null, 'Nome e cargo', false, '{}'::text[], false,
   null, null, null, null, 10),
  ('operacao_manutencao', 'operacao', 'escolha_unica', 'Você vai precisar de suporte e manutenção depois da entrega?', null, null, false, array['Sim, contínuo', 'Só nos primeiros meses', 'Não', 'Ainda não sei']::text[], false,
   null, null, null, null, 20),
  ('operacao_dominio', 'operacao', 'multipla_escolha', 'O que vocês já têm?', null, null, false, array['Domínio (ex.: suaempresa.com.br)', 'Hospedagem', 'E-mail corporativo', 'Nada disso']::text[], false,
   null, null, null, null, 30),
  ('final_observacoes', 'final', 'texto_longo', 'Tem mais alguma coisa que devemos saber antes da reunião?', null, null, false, '{}'::text[], false,
   null, null, null, null, 10);

-- Toda resposta aponta para uma pergunta existente (não dá para apagar pergunta respondida)
alter table public.answers
  add constraint answers_question_id_fkey
  foreign key (question_id) references public.perguntas (id) on delete restrict;

create index answers_question_id_idx on public.answers (question_id);

-- RLS -------------------------------------------------------
alter table public.secoes    enable row level security;
alter table public.perguntas enable row level security;

create policy "logados leem as seções"
  on public.secoes for select to authenticated
  using (true);

create policy "admin cria seções"
  on public.secoes for insert to authenticated
  with check ((select private.has_role('admin')));

create policy "admin edita seções"
  on public.secoes for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admin apaga seções"
  on public.secoes for delete to authenticated
  using ((select private.has_role('admin')));

create policy "cliente lê perguntas ativas, admin lê todas"
  on public.perguntas for select to authenticated
  using (ativa or (select private.has_role('admin')));

create policy "admin cria perguntas"
  on public.perguntas for insert to authenticated
  with check ((select private.has_role('admin')));

create policy "admin edita perguntas"
  on public.perguntas for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

create policy "admin apaga perguntas"
  on public.perguntas for delete to authenticated
  using ((select private.has_role('admin')));

-- Cliente só responde perguntas ativas
drop policy "cliente cria respostas enquanto não enviou" on public.answers;
create policy "cliente cria respostas enquanto não enviou"
  on public.answers for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.pode_responder())
    and exists (select 1 from public.perguntas p where p.id = question_id and p.ativa)
  );

drop policy "cliente edita respostas enquanto não enviou" on public.answers;
create policy "cliente edita respostas enquanto não enviou"
  on public.answers for update to authenticated
  using (user_id = (select auth.uid()) and (select private.pode_responder()))
  with check (
    user_id = (select auth.uid())
    and (select private.pode_responder())
    and exists (select 1 from public.perguntas p where p.id = question_id and p.ativa)
  );

-- Grants explícitos -----------------------------------------
revoke all on public.secoes, public.perguntas from anon;
grant select, insert, update, delete on public.secoes, public.perguntas to authenticated;
