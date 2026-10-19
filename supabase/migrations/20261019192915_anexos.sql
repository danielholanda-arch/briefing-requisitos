-- =========================================================
-- Tipo de pergunta "arquivos": o usuário anexa documentos à resposta.
-- Arquivos ficam no bucket PRIVADO "anexos", no caminho
--   {projeto_id}/{question_id}/{nome-unico}
-- A resposta (answers.value) guarda a lista: [{ caminho, nome, tamanho, tipo }].
-- =========================================================

alter type public.tipo_pergunta add value if not exists 'arquivos';

-- Bucket privado: até 10 MB por arquivo, só formatos de documento e imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anexos',
  'anexos',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
    'text/plain'
  ]
);

-- O caminho é {projeto_id}/{question_id}/{arquivo} e o projeto é do usuário logado?
create function private.dono_do_anexo(_caminho text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  partes text[] := string_to_array(_caminho, '/');
begin
  if coalesce(array_length(partes, 1), 0) <> 3
     or partes[1] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.projetos
     where id = partes[1]::uuid and cliente_id = (select auth.uid())
  );
end;
$$;

-- Pode anexar/remover: pode responder a pergunta (dono, conta ativa, questionário anexado e
-- aberto, pergunta ativa) e a pergunta é do tipo "arquivos". Ao enviar, no máximo 5 por pergunta.
create function private.pode_anexar(_caminho text, _contar boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  partes text[] := string_to_array(_caminho, '/');
begin
  if not private.dono_do_anexo(_caminho) then
    return false;
  end if;
  if not private.pode_responder(partes[1]::uuid, partes[2]) then
    return false;
  end if;
  if not exists (select 1 from public.perguntas where id = partes[2] and tipo::text = 'arquivos') then
    return false;
  end if;
  if _contar and (
    select count(*) from storage.objects o
     where o.bucket_id = 'anexos' and o.name like partes[1] || '/' || partes[2] || '/%'
  ) >= 5 then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function private.dono_do_anexo(text) from public, anon;
revoke all on function private.pode_anexar(text, boolean) from public, anon;
grant execute on function private.dono_do_anexo(text) to authenticated;
grant execute on function private.pode_anexar(text, boolean) to authenticated;

-- RLS do Storage (bucket "anexos") ------------------------------
create policy "anexos: dono e admin leem"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'anexos'
    and ((select private.has_role('admin')) or private.dono_do_anexo(name))
  );

create policy "anexos: dono envia enquanto o questionário está aberto"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and private.pode_anexar(name, true));

-- Admin remove ao excluir projeto; dono remove enquanto o questionário está aberto
create policy "anexos: dono remove enquanto aberto, admin remove"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'anexos'
    and ((select private.has_role('admin')) or private.pode_anexar(name, false))
  );
