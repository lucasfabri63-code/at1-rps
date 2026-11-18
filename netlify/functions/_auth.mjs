import { createClient } from '@supabase/supabase-js'
export function json(status, body){ return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}}) }
export async function adminContext(req){
 const url=process.env.SUPABASE_URL, secret=process.env.SUPABASE_SECRET_KEY, publishable=process.env.SUPABASE_PUBLISHABLE_KEY
 if(!url||!secret||!publishable) throw Object.assign(new Error('Configuracao Supabase incompleta.'),{status:500})
 const auth=req.headers.get('authorization')||''; if(!auth.startsWith('Bearer ')) throw Object.assign(new Error('Sessao ausente.'),{status:401}); const jwt=auth.slice(7)
 const userClient=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${jwt}`}}})
 const {data:u,error:ue}=await userClient.auth.getUser(jwt); if(ue||!u?.user) throw Object.assign(new Error('Sessao invalida.'),{status:401})
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:p,error:pe}=await admin.from('at1_usuarios').select('id,perfil,ativo').eq('id',u.user.id).maybeSingle(); if(pe) throw Object.assign(new Error(pe.message),{status:500}); if(!p||!p.ativo||p.perfil!=='ADMIN') throw Object.assign(new Error('Apenas ADMIN ativo.'),{status:403})
 return {admin,userClient,user:u.user}
}
