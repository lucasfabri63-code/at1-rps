import { adminContext,json,wrap } from './_auth.mjs'
export default req=>wrap(async()=>{if(req.method!=='GET')return json(405,{error:'Método não permitido.'});let {admin}=await adminContext(req),{data,error}=await admin.from('at1_usuarios').select('id,nome,email,perfil,ativo,cargo,estado').order('nome');if(error)throw error;return json(200,{usuarios:data})},req)
export const config={path:'/api/listar-usuarios'}
