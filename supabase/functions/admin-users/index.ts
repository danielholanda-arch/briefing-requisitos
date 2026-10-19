// Edge Function: admin-users
// Ações que exigem a service role (nunca expor essa chave no front).
// Chamada do front:
//   Admin (papel: 'cliente' | 'admin'; padrão 'cliente'):
//   supabase.functions.invoke('admin-users', { body: { action: 'create', papel, matricula, senha, nome, email, empresa, telefone, projeto } })
//     (cliente: `projeto` é o nome do primeiro projeto; outros projetos o admin cria direto na tabela)
//   supabase.functions.invoke('admin-users', { body: { action: 'reset_password', user_id, senha } })   // cliente ou outro admin
//   supabase.functions.invoke('admin-users', { body: { action: 'set_active', user_id, ativo } })       // cliente ou outro admin
//   supabase.functions.invoke('admin-users', { body: { action: 'delete', user_id } })                  // só cliente
//   Qualquer usuário logado (troca da senha provisória):
//   supabase.functions.invoke('admin-users', { body: { action: 'trocar_senha', senha } })

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Precisa ser o MESMO domínio usado no login do front (src/features/auth/matricula.ts)
const DOMINIO = 'briefing.local'

// Mesmo formato da constraint profiles_matricula_formato (ex.: abcd1234)
const MATRICULA = /^[a-z0-9]{3,30}$/

// Senha provisória (definida pelo admin) e senha própria (definida pelo usuário)
const MIN_SENHA_PROVISORIA = 6
const MIN_SENHA_PROPRIA = 8

const emailDe = (matricula: string) => `${matricula}@${DOMINIO}`

// E-mail de contato (opcional). Mesmo formato da constraint profiles_email_formato
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

function senhaValida(senha: unknown, minimo: number): senha is string {
  return typeof senha === 'string' && senha.length >= minimo && senha.length <= 72
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1) Quem está chamando? (usa o JWT de quem está logado)
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const {
    data: { user },
  } = await caller.auth.getUser()
  if (!user) return json({ error: 'Não autenticado' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Ação não informada' }, 400)

  // 2) Troca da própria senha: vale para qualquer usuário logado
  if (body.action === 'trocar_senha') {
    if (!senhaValida(body.senha, MIN_SENHA_PROPRIA)) {
      return json({ error: `A senha precisa ter pelo menos ${MIN_SENHA_PROPRIA} caracteres.` }, 400)
    }
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: body.senha })
    if (error) return json({ error: error.message }, 400)

    const { error: ePerfil } = await admin
      .from('profiles')
      .update({ senha_provisoria: false })
      .eq('id', user.id)
    if (ePerfil) return json({ error: 'Senha alterada, mas falhou ao atualizar o perfil' }, 500)

    return json({ ok: true })
  }

  // 3) Demais ações: só admin
  const { data: papel } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!papel) return json({ error: 'Acesso negado' }, 403)

  // Usuário alvo de uma ação: precisa ter perfil e um papel conhecido.
  // `permitirAdmin` libera agir sobre OUTRO admin; nunca sobre a própria conta.
  async function garantirAlvo(userId: unknown, permitirAdmin: boolean) {
    if (typeof userId !== 'string' || userId === user!.id) return null
    const { data: papeis } = await admin.from('user_roles').select('role').eq('user_id', userId)
    const roles = (papeis ?? []).map((p) => p.role)
    const permitido = roles.includes('admin') ? permitirAdmin : roles.includes('cliente')
    if (!permitido) return null
    const { data } = await admin
      .from('profiles')
      .select('id, matricula')
      .eq('id', userId)
      .maybeSingle()
    return data
  }

  switch (body.action) {
    case 'create': {
      const papelNovo = body.papel === 'admin' ? 'admin' : 'cliente'
      const nome = String(body.nome ?? '').trim()
      if (!nome) return json({ error: 'Nome é obrigatório' }, 400)

      const matricula = String(body.matricula ?? '').trim().toLowerCase()
      if (!MATRICULA.test(matricula)) {
        return json({ error: 'Matrícula inválida: use de 3 a 30 letras e números, sem espaços.' }, 400)
      }
      if (!senhaValida(body.senha, MIN_SENHA_PROVISORIA)) {
        return json({ error: `A senha precisa ter pelo menos ${MIN_SENHA_PROVISORIA} caracteres.` }, 400)
      }
      const email = String(body.email ?? '').trim().toLowerCase()
      if (email && !EMAIL.test(email)) return json({ error: 'E-mail inválido.' }, 400)

      const { data: existente } = await admin
        .from('profiles')
        .select('id')
        .eq('matricula', matricula)
        .maybeSingle()
      if (existente) return json({ error: `A matrícula ${matricula} já está cadastrada.` }, 409)

      const { data: criado, error: eAuth } = await admin.auth.admin.createUser({
        email: emailDe(matricula),
        password: body.senha,
        email_confirm: true,
      })
      if (eAuth?.code === 'email_exists') {
        return json({ error: `A matrícula ${matricula} já está cadastrada.` }, 409)
      }
      if (eAuth || !criado.user) return json({ error: eAuth?.message ?? 'Falha ao criar usuário' }, 500)

      const uid = criado.user.id
      const { error: ePerfil } = await admin.from('profiles').insert({
        id: uid,
        matricula,
        nome,
        email: email || null,
        empresa: papelNovo === 'cliente' ? body.empresa || null : null,
        telefone: body.telefone || null,
        senha_provisoria: true,
      })
      const { error: ePapel } = ePerfil
        ? { error: ePerfil }
        : await admin.from('user_roles').insert({ user_id: uid, role: papelNovo })

      // Cliente já nasce com o primeiro projeto
      const nomeProjeto = String(body.projeto ?? '').trim() || 'Projeto principal'
      const { error: eProjeto } =
        ePerfil || ePapel || papelNovo !== 'cliente'
          ? { error: null }
          : await admin.from('projetos').insert({ cliente_id: uid, nome: nomeProjeto })

      if (ePerfil || ePapel || eProjeto) {
        await admin.auth.admin.deleteUser(uid) // desfaz para não deixar usuário órfão
        return json({ error: 'Falha ao salvar o usuário' }, 500)
      }

      return json({ user_id: uid, matricula, senha: body.senha })
    }

    case 'reset_password': {
      const alvo = await garantirAlvo(body.user_id, true)
      if (!alvo) return json({ error: 'Usuário não encontrado' }, 404)
      if (!senhaValida(body.senha, MIN_SENHA_PROVISORIA)) {
        return json({ error: `A senha precisa ter pelo menos ${MIN_SENHA_PROVISORIA} caracteres.` }, 400)
      }

      const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: body.senha })
      if (error) return json({ error: error.message }, 500)

      // Volta a ser provisória: a pessoa troca no próximo acesso
      const { error: ePerfil } = await admin
        .from('profiles')
        .update({ senha_provisoria: true })
        .eq('id', alvo.id)
      if (ePerfil) return json({ error: ePerfil.message }, 500)

      return json({ matricula: alvo.matricula, senha: body.senha })
    }

    case 'set_active': {
      const alvo = await garantirAlvo(body.user_id, true)
      if (!alvo) return json({ error: 'Usuário não encontrado' }, 404)

      const ativo = Boolean(body.ativo)
      // Bloqueia o login no Auth também, não só a flag no perfil
      const { error: eBan } = await admin.auth.admin.updateUserById(alvo.id, {
        ban_duration: ativo ? 'none' : '876000h',
      })
      if (eBan) return json({ error: eBan.message }, 500)

      const { error } = await admin.from('profiles').update({ ativo }).eq('id', alvo.id)
      if (error) return json({ error: error.message }, 500)

      return json({ ok: true })
    }

    case 'delete': {
      const alvo = await garantirAlvo(body.user_id, false)
      if (!alvo) return json({ error: 'Cliente não encontrado' }, 404)

      // Arquivos anexados não têm cascade: apaga do Storage antes ({projeto}/{pergunta}/{arquivo})
      const { data: projetos } = await admin.from('projetos').select('id').eq('cliente_id', alvo.id)
      for (const { id: projetoId } of projetos ?? []) {
        const { data: pastas } = await admin.storage.from('anexos').list(projetoId)
        const caminhos: string[] = []
        for (const pasta of pastas ?? []) {
          const { data: arquivos } = await admin.storage.from('anexos').list(`${projetoId}/${pasta.name}`)
          for (const a of arquivos ?? []) caminhos.push(`${projetoId}/${pasta.name}/${a.name}`)
        }
        if (caminhos.length) await admin.storage.from('anexos').remove(caminhos)
      }

      // on delete cascade remove perfil, papel, projetos e respostas
      const { error } = await admin.auth.admin.deleteUser(alvo.id)
      if (error) return json({ error: error.message }, 500)

      return json({ ok: true })
    }

    default:
      return json({ error: 'Ação desconhecida' }, 400)
  }
})
