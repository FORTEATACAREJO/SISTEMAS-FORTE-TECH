// Declarative-only system project planner. No code execution, SQL generation or provisioning.
import {prepareFields,fieldKey} from './construtor-core.mjs';
export const SECTORS=Object.freeze({COMERCIO:'Comércio',INDUSTRIA:'Indústria',SERVICOS:'Serviços',CONSTRUCAO:'Construção',OUTRO:'Outro'});
export const HOSTING=Object.freeze({NUVEM_COMPARTILHADA:'Nuvem compartilhada (atual)',NUVEM_DEDICADA:'Nuvem dedicada (futuro)',SERVIDOR_PROPRIO:'Servidor próprio (futuro)'});
export const ROLES=Object.freeze({ADMIN:'Administrador',OPERADOR:'Operador',CONTADOR:'Contador',CONSULTA:'Consulta'});
const f=(label,type='text',required=false,options)=>({key:fieldKey(label),label,type,required,...(options?{options}: {})});
export const SYSTEM_TEMPLATES=Object.freeze({
 assistencia:{
  title:'Sistema de Assistência Técnica',sector:'SERVICOS',
  objective:'Organizar clientes, equipamentos e chamados de assistência técnica com responsáveis e etapas de atendimento.',
  modules:[
   {name:'Clientes',fields:[f('Nome do cliente','text',true),f('Telefone')]},
   {name:'Equipamentos',fields:[f('Descrição do equipamento','text',true),f('Número de série')]},
   {name:'Chamados',fields:[f('Resumo do chamado','text',true),f('Data de abertura','date'),f('Situação','select',true,['Aberto','Em andamento','Concluído'])]}
  ]
 },
 obras:{
  title:'Gestão de Obras',sector:'CONSTRUCAO',
  objective:'Acompanhar obras, equipes e solicitações de materiais com controles próprios e acesso por empresa.',
  modules:[
   {name:'Obras',fields:[f('Nome da obra','text',true),f('Endereço')]},
   {name:'Equipes',fields:[f('Responsável','text',true),f('Especialidade')]},
   {name:'Solicitações',fields:[f('Descrição','text',true),f('Quantidade','number'),f('Situação','select',true,['Pendente','Aprovada','Entregue'])]}
  ]
 },
 comercio:{
  title:'Gestão Comercial Personalizada',sector:'COMERCIO',
  objective:'Organizar clientes, produtos e solicitações comerciais sem interferir no faturamento fiscal do Multiempresarial.',
  modules:[
   {name:'Clientes',fields:[f('Razão social','text',true),f('Telefone')]},
   {name:'Produtos',fields:[f('Descrição','text',true),f('Código interno')]},
   {name:'Solicitações',fields:[f('Cliente','text',true),f('Detalhes','text',true),f('Valor previsto','number')]}
  ]
 },
 personalizado:{
  title:'Meu Sistema Personalizado',sector:'OUTRO',
  objective:'Criar um sistema específico para as rotinas da empresa, com módulos, cadastros e formulários próprios.',
  modules:[{name:'Cadastros',fields:[f('Descrição','text',true)]}]
 }
});
export function makeSystemTemplate(name){
 const t=SYSTEM_TEMPLATES[name]||SYSTEM_TEMPLATES.personalizado;
 return {title:t.title,summary:'Projeto guiado sem publicação automática',sector:t.sector,
  objective:t.objective,hosting:'NUVEM_COMPARTILHADA',
  modules:t.modules.map(x=>({name:x.name,key:fieldKey(x.name),roles:['ADMIN','OPERADOR'],
   fields:x.fields.map(y=>({...y,options:y.options?y.options.join(', '):''}))}))};
}
export function validateSystemProject(project){
 const title=String(project?.title||'').trim();
 const summary=String(project?.summary||'').trim();
 const objective=String(project?.objective||'').trim();
 if(title.length<3||title.length>90)throw Error('O nome do sistema precisa ter de 3 a 90 caracteres.');
 if(summary.length>500)throw Error('Descrição curta excede 500 caracteres.');
 if(objective.length<10||objective.length>1000)throw Error('Explique a finalidade do sistema em 10 a 1000 caracteres.');
 if(!Object.hasOwn(SECTORS,project.sector))throw Error('Escolha uma atividade válida.');
 if(!Object.hasOwn(HOSTING,project.hosting))throw Error('Escolha a hospedagem desejada.');
 if(!Array.isArray(project.modules)||!project.modules.length||project.modules.length>6)throw Error('Configure de 1 a 6 módulos.');
 const keys=new Set();
 const modules=project.modules.map((m,i)=>{
  const name=String(m.name||'').trim(),key=fieldKey(m.key||name);
  if(name.length<3||name.length>70)throw Error('O módulo '+(i+1)+' precisa ter um nome de 3 a 70 caracteres.');
  if(keys.has(key))throw Error('Há módulos com nomes repetidos.');
  keys.add(key);
  const roles=[...new Set(m.roles||[])];
  if(roles.length<1||roles.length>4||roles.some(role=>!Object.hasOwn(ROLES,role)))throw Error('Permissões inválidas no módulo '+name);
  const fields=prepareFields(m.fields||[]);
  return {key,name,roles,fields};
 });
 const spec={sector:project.sector,objective,hosting:project.hosting,modules};
 if(JSON.stringify(spec).length>26000)throw Error('Projeto excede o limite de campos desta versão.');
 return {title,summary,spec};
}
export function getProjectStage(status){
 return status==='APROVADO_HOMOLOGACAO'?'Projeto aprovado para homologação (sem deploy)':'Rascunho de projeto';
}
