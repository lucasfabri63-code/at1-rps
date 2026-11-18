import { adminContext,json,wrap } from './_auth.mjs'
export default req=>wrap(async()=>{if(req.method!=='POST')return json(405,{error:'Método não permitido.'});let {admin,user}=await adminContext(req),b=await req.json();if(!b.id||typeof b.ativo!=='boolean')return json(400,{error:'Parâmetros inválidos.'});if(b.id===user.id&&!b.ativo)return json(400,{error:'O ADMIN não pode desativar a própria conta.'});let {error}=await admin.from('at1_usuarios').update({ativo:b.ativo}).eq('id',b.id);if(error)throw error;return json(200,{ok:true})},req)
export const config={path:'/api/alterar-status-usuario'}
