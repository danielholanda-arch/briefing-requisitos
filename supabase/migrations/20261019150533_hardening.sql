-- =========================================================
-- Ajustes apontados pelos advisors do Supabase
-- =========================================================

-- Funções auxiliares saem do schema exposto pela API (deixam de existir em /rest/v1/rpc/*).
-- As políticas de RLS guardam a referência à função, então continuam funcionando.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter function public.has_role(public.app_role) set schema private;
alter function public.pode_responder() set schema private;
alter function public.marcar_em_andamento() set schema private;

revoke all on function private.has_role(public.app_role) from public, anon;
revoke all on function private.pode_responder() from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;
grant execute on function private.pode_responder() to authenticated;
-- Função de trigger: ninguém precisa chamá-la diretamente
revoke all on function private.marcar_em_andamento() from public, anon, authenticated;

-- Uma única política de leitura por tabela (performance) -------------
drop policy "admin vê todos os perfis" on public.profiles;
drop policy "cliente vê o próprio perfil" on public.profiles;
create policy "lê o próprio perfil ou admin lê todos"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_role('admin')));

drop policy "admin lê todas as respostas" on public.answers;
drop policy "cliente lê as próprias respostas" on public.answers;
create policy "lê as próprias respostas ou admin lê todas"
  on public.answers for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

-- Mesmo cache por consulta (select ...) nas demais políticas
drop policy "admin atualiza perfis" on public.profiles;
create policy "admin atualiza perfis"
  on public.profiles for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

drop policy "lê os próprios papéis ou admin lê todos" on public.user_roles;
create policy "lê os próprios papéis ou admin lê todos"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

drop policy "cliente cria respostas enquanto não enviou" on public.answers;
create policy "cliente cria respostas enquanto não enviou"
  on public.answers for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.pode_responder()));

drop policy "cliente edita respostas enquanto não enviou" on public.answers;
create policy "cliente edita respostas enquanto não enviou"
  on public.answers for update to authenticated
  using (user_id = (select auth.uid()) and (select private.pode_responder()))
  with check (user_id = (select auth.uid()) and (select private.pode_responder()));
