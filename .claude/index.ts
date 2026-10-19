// Edge Function: admin-users
// Ações de admin que exigem a service role (nunca expor essa chave no front).
// Chamada do front:
//   supabase.functions.invoke('admin-users', { body: { action: 'create', nome, empresa, telefone, projeto } })
//   supabase.functions.invoke('admin-users', { body: { action: 'reset_password', user_id } })
//   supabase.functions.invoke('admin-users', { body: { action: 'set_active', user_id, ativo } })
//   supabase.functions.invoke('admin-users', { body: { action: 'delete', user_id } })

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Precisa ser o MESMO domínio usado no login do front (src/features/auth/matricula.ts)
const DOMINIO = 'briefing.local'

// Sem caracteres confusos: 0/O, 1/l/I
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function gerarSenha(tamanho = 8): string {
  const limite = 256 - (256 % ALFABETO.length) // evita viés do módulo
  const out: string[] = []
  while (out.length < tamanho) {
    for (const b of crypto.getRandomValues(new Uint8Array(tamanho * 2))) {
      if (b < limite && out.length < tamanho) out.push(ALFABETO[b % ALFABETO.length])
    }
  }
  return out.join('')
}

const emailDe = (matricula: string) => `${matricula.trim().toLowerCase()}@${DOMINIO}`

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

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

  // 2) É admin?
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: papel } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!papel) return json({ error: 'Acesso negado' }, 403)

  const body = await req.json().catch(() => null)
  if (!body?.action) return json({ error: 'Ação não informada' }, 400)

  // Ações sobre um usuário existente só valem para clientes (nunca para outro admin)
  async function garantirCliente(userId: unknown) {
    if (typeof userId !== 'string') return null
    const { data: ehCliente } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('role', 'cliente')
      .maybeSingle()
    if (!ehCliente) return null
    const { data } = await admin
      .from('profiles')
      .select('id, matricula')
      .eq('id', userId)
      .maybeSingle()
    return data
  }

  switch (body.action) {
    case 'create': {
      const nome = String(body.nome ?? '').trim()
      if (!nome) return json({ error: 'Nome é obrigatório' }, 400)

      const { data: matricula, error: eSeq } = await admin.rpc('next_matricula')
      if (eSeq || !matricula) return json({ error: 'Falha ao gerar matrícula' }, 500)

      const senha = gerarSenha()
      const { data: criado, error: eAuth } = await admin.auth.admin.createUser({
        email: emailDe(matricula),
        password: senha,
        email_confirm: true,
      })
      if (eAuth || !criado.user) return json({ error: eAuth?.message ?? 'Falha ao criar usuário' }, 500)

      const uid = criado.user.id
      const { error: ePerfil } = await admin.from('profiles').insert({
        id: uid,
        matricula,
        nome,
        empresa: body.empresa || null,
        telefone: body.telefone || null,
        projeto: body.projeto || null,
      })
      const { error: ePapel } = ePerfil
        ? { error: ePerfil }
        : await admin.from('user_roles').insert({ user_id: uid, role: 'cliente' })

      if (ePerfil || ePapel) {
        await admin.auth.admin.deleteUser(uid) // desfaz para não deixar usuário órfão
        return json({ error: 'Falha ao salvar o cliente' }, 500)
      }

      return json({ user_id: uid, matricula, senha })
    }

    case 'reset_password': {
      const alvo = await garantirCliente(body.user_id)
      if (!alvo) return json({ error: 'Cliente não encontrado' }, 404)

      const senha = gerarSenha()
      const { error } = await admin.auth.admin.updateUserById(alvo.id, { password: senha })
      if (error) return json({ error: error.message }, 500)

      return json({ matricula: alvo.matricula, senha })
    }

    case 'set_active': {
      const alvo = await garantirCliente(body.user_id)
      if (!alvo) return json({ error: 'Cliente não encontrado' }, 404)

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
      const alvo = await garantirCliente(body.user_id)
      if (!alvo) return json({ error: 'Cliente não encontrado' }, 404)

      // on delete cascade remove perfil, papel e respostas
      const { error } = await admin.auth.admin.deleteUser(alvo.id)
      if (error) return json({ error: error.message }, 500)

      return json({ ok: true })
    }

    default:
      return json({ error: 'Ação desconhecida' }, 400)
  }
})
