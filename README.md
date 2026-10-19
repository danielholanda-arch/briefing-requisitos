# Briefing de Projeto

Levantamento de requisitos da UniCatólica: o admin cadastra clientes e projetos, o cliente
responde um questionário por projeto antes da primeira reunião e o admin vê as respostas.
Regras do projeto em [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Rodar localmente

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha URL + publishable key do projeto de **desenvolvimento**.
3. `npm run dev`

## Supabase (uma vez por projeto)

1. Aplicar as migrations de `supabase/migrations/` em ordem.
2. Publicar a Edge Function `supabase/functions/admin-users`.
3. Regenerar `src/lib/database.types.ts` e rodar os advisors de segurança.
4. Criar o primeiro admin: em Authentication > Users, criar `<matricula>@briefing.local` (matrícula em
   minúsculas) com senha e "Auto Confirm User" marcado; depois inserir o perfil (essa matrícula,
   `senha_provisoria = false`) e o papel `admin`. O admin entra com essa matrícula.

## Questionário

As perguntas ficam no banco (tabelas `secoes` e `perguntas`) e os admins editam pelo painel, em
**Perguntas**. O `id` de cada pergunta nunca muda; pergunta já respondida é arquivada, não excluída.
