import { createClient } from '@supabase/supabase-js'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const allowedSegments = new Set(['TOTAL','HFC','GPON','GPON PURO','REDE NEUTRA','HIBRIDO'])
const allowedStates = new Set(['PR','SC'])
const response = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
const monthPattern = /^\d{4}-\d{2}-01$/

export default async (req) => {
  if (req.method !== 'POST') return response(405, { error: 'Metodo nao permitido.' })

  const url = process.env.SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  const publishable = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !secret || !publishable) return response(500, { error: 'Configuracao Supabase incompleta no Netlify.' })

  const auth = req.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ')) return response(401, { error: 'Sessao ausente.' })
  const jwt = auth.slice(7)

  const userClient = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  })
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt)
  if (userError || !userData?.user) return response(401, { error: 'Sessao invalida ou expirada.' })

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profile, error: profileError } = await admin
    .from('at1_usuarios').select('id,perfil,ativo').eq('id', userData.user.id).maybeSingle()
  if (profileError) return response(500, { error: 'Falha ao validar perfil administrativo.', diagnostic_code: profileError.code || 'SEM_CODIGO' })
  if (!profile || profile.ativo !== true || profile.perfil !== 'ADMIN') return response(403, { error: 'Apenas ADMIN ativo pode importar bases.' })

  let payload
  try { payload = await req.json() } catch { return response(400, { error: 'JSON invalido.' }) }

  const defaultCompetencia = String(payload.competencia || '')
  const tipoApuracao = String(payload.tipo_apuracao || 'FECHAMENTO').toUpperCase()
  const nomeArquivo = String(payload.nome_arquivo || 'BASE_2026.xlsx').slice(0, 250)
  const rows = Array.isArray(payload.rows) ? payload.rows : []

  if (!['PARCIAL','FECHAMENTO'].includes(tipoApuracao)) return response(400, { error: 'Tipo de apuracao invalido.' })
  if (!rows.length) return response(400, { error: 'Nenhuma linha recebida.' })
  if (rows.length > 20000) return response(413, { error: 'Carga excede 20.000 registros normalizados.' })

  const normalized = []
  const seen = new Set()
  for (const r of rows) {
    const competencia = String(r.competencia || defaultCompetencia)
    const estado = String(r.estado || '').trim().toUpperCase()
    const municipio = String(r.municipio || '').trim()
    const segmento = String(r.segmento || '').trim().toUpperCase()
    const quantidade = Number(r.quantidade_clientes)

    if (!monthPattern.test(competencia)) return response(400, { error: `Competencia invalida: ${competencia}. Use YYYY-MM-01.` })
    if (!allowedStates.has(estado)) return response(400, { error: `Estado invalido: ${estado}` })
    if (!municipio) return response(400, { error: 'Municipio vazio na carga.' })
    if (!allowedSegments.has(segmento)) return response(400, { error: `Segmento invalido: ${segmento}` })
    if (!Number.isFinite(quantidade) || quantidade < 0 || !Number.isInteger(quantidade)) return response(400, { error: `Quantidade invalida em ${municipio}/${segmento}/${competencia}` })

    const key = `${competencia}|${estado}|${municipio.toLocaleUpperCase('pt-BR')}|${segmento}`
    if (seen.has(key)) continue // BASE_2026 possui colunas mensais duplicadas; conserva a primeira ocorrencia.
    seen.add(key)
    normalized.push({ competencia, estado, municipio, segmento, quantidade_clientes: quantidade })
  }

  const byMonth = new Map()
  for (const row of normalized) {
    if (!byMonth.has(row.competencia)) byMonth.set(row.competencia, [])
    byMonth.get(row.competencia).push(row)
  }

  for (const [competencia, monthRows] of byMonth) {
    for (const seg of allowedSegments) {
      if (!monthRows.some(r => r.segmento === seg)) return response(400, { error: `Segmento obrigatorio ausente em ${competencia}: ${seg}` })
    }
  }

  const results = []
  for (const [competencia, monthRows] of [...byMonth.entries()].sort(([a],[b]) => a.localeCompare(b))) {
    const { data: imp, error: impError } = await admin.from('at1_importacoes').insert({
      tipo_base: 'CLIENTES', competencia, tipo_apuracao: tipoApuracao,
      nome_arquivo: nomeArquivo, quantidade_registros: 0, status: 'PROCESSANDO',
      usuario_id: userData.user.id,
      mensagem: `Carga mensal desnormalizada recebida. ${monthRows.length} registros.`
    }).select('id').single()
    if (impError) return response(500, { error: `Falha ao iniciar importacao de ${competencia}.`, detail: impError.message })

    const importacaoId = imp.id
    try {
      const staging = monthRows.map(({ competencia, ...r }) => ({
        importacao_id: importacaoId, competencia, tipo_apuracao: tipoApuracao, ...r
      }))
      for (let i = 0; i < staging.length; i += 500) {
        const { error } = await admin.from('at1_staging_clientes').insert(staging.slice(i, i + 500))
        if (error) throw error
      }
      const { data: promoted, error: promoteError } = await userClient.rpc('promover_base_clientes', { p_importacao_id: importacaoId })
      if (promoteError) throw promoteError
      results.push({ competencia, importacao_id: importacaoId, registros: promoted })
    } catch (err) {
      await admin.from('at1_importacoes').update({ status: 'ERRO', concluido_em: new Date().toISOString(), mensagem: String(err?.message || err).slice(0, 1000) }).eq('id', importacaoId)
      await admin.from('at1_staging_clientes').delete().eq('importacao_id', importacaoId)
      return response(500, { error: `A importacao de ${competencia} nao foi promovida.`, detail: String(err?.message || err), concluidas: results })
    }
  }

  return response(200, {
    ok: true,
    competencias: results.length,
    registros: results.reduce((sum, x) => sum + Number(x.registros || 0), 0),
    resultados: results
  })
}

export const config = { path: '/api/importar-base' }
