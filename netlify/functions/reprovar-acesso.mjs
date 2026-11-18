import { adminContext,json,wrap } from './_auth.mjs'
export default req=>wrap(async()=>{if(req.method!=='POST')return json(405,{error:'Método não permitido.'});let {admin,user}=await adminContext(req),{id}=await req.json(),{error}=await admin.from('at1_solicitacoes_acesso').update({status:'REPROVADO',analisado_em:new Date().toISOString(),analisado_por:user.id}).eq('id',id).eq('status','PENDENTE');if(error)throw error;return json(200,{ok:true})},req)
export const config={path:'/api/reprovar-acesso'}
