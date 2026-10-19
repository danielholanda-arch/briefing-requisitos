-- =========================================================
-- Questionário começa vazio (os admins cadastram pelo painel)
-- + e-mail de contato no cadastro de usuários
-- =========================================================

-- Remove o rascunho inicial de seções e perguntas.
-- Se alguma pergunta já tiver resposta, a FK de answers impede e a migration falha (nada se perde).
delete from public.perguntas;
delete from public.secoes;

-- E-mail de contato (o login continua sendo pela matrícula)
alter table public.profiles
  add column email text
  constraint profiles_email_formato check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
