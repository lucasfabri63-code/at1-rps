import { adminContext,json,wrap } from './_auth.mjs'
export default req=>wrap(async()=>{if(req.method!=='GET')return json(405,{error:'Método não permitido.'});let {admin}=await adminContext(req),{data,error}=await admin.from('at1_solicitacoes_acesso').select('id,nome,email,cargo,estado,status,solicitado_em,analisado_em').order('solicitado_em',{ascending:false});if(error)throw error;return json(200,{solicitacoes:data})},req)
export const config={path:'/api/listar-solicitacoes'}
