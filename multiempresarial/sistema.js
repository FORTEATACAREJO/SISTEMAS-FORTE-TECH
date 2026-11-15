"use strict";
import {makeSystemTemplate,validateSystemProject,SECTORS,HOSTING,ROLES,getProjectStage} from './sistema-core.mjs';
import {fieldKey,FIELD_TYPES} from './construtor-core.mjs';
const ORIGIN='https://tusmlfhzwlzwnoxfhomt.supabase.co';
const KEY='sb_publishable_O99oIf3bXMIOkeh_XCpY6w_7OxD3FPI';
const SESSION_STORAGE_KEY='multiempresarial-protected-session';
const MASTER_EMAIL='sistemasfortetech@gmail.com';
const $=id=>document.getElementById(id);
const el=(tag,content,className)=>{
 const node=document.createElement(tag);
 if(content!==undefined)node.textContent=String(content);
 if(className)node.className=className;
 return node;
};
const show=(message,error=false)=>{
 $('system-status').textContent=message;
 $('system-status').classList.toggle('error',error);
};
let session=null,user=null,companyId=null,companyRoles=new Map(),companyLicensed=false,companyAdmin=false;
let design=makeSystemTemplate('assistencia'),currentBlueprint=null,projects=[],previewIndex=0;
async function request(path,options={}){
 const headers={'Content-Type':'application/json',apikey:KEY};
 if(options.auth!==false){
  if(!session?.access_token)throw Error('Sessão não encontrada. Entre no painel empresarial.');
  if(session.expires_at<Math.floor(Date.now()/1000)+90){
   const res=await fetch(ORIGIN+'/auth/v1/token?grant_type=refresh_token',{
    method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},cache:'no-store',
    referrerPolicy:'no-referrer',body:JSON.stringify({refresh_token:session.refresh_token})
   });
   const updated=await res.json();
   if(!res.ok||!updated.access_token)throw Error('Sessão expirada. Entre novamente.');
   session={access_token:updated.access_token,refresh_token:updated.refresh_token,
    expires_at:updated.expires_at||Math.floor(Date.now()/1000)+(updated.expires_in||3600)};
   sessionStorage.setItem(SESSION_STORAGE_KEY,JSON.stringify(session));
  }
  headers.Authorization='Bearer '+session.access_token;
 }
 const response=await fetch(ORIGIN+path,{method:options.method||'GET',
  body:options.body===undefined?undefined:JSON.stringify(options.body),
  headers,cache:'no-store',referrerPolicy:'no-referrer'});
 const raw=await response.text();let value;
 try{value=raw?JSON.parse(raw):null;}catch{value={message:raw.slice(0,150)};}
 if(!response.ok)throw Error(value?.message||value?.error_description||value?.error||'Erro de acesso '+response.status);
 return value;
}
const table=q=>request('/rest/v1/'+q);
const rpc=(method,body)=>request('/rest/v1/rpc/'+method,{method:'POST',body});
const option=(select,id,title)=>{const o=el('option',title);o.value=id;select.append(o);return o;};
function createInput(label,value,handler,{type='text',maxlength,required=false,placeholder=''}={}){
 const holder=el('label',label),input=el('input');
 input.type=type;if(maxlength)input.maxLength=maxlength;input.required=required;
 input.placeholder=placeholder;input.value=value||'';
 input.addEventListener('input',()=>handler(input.value));
 holder.append(input);return holder;
}
function newModule(){
 const n=design.modules.length+1;
 if(n>6)return show('Limite de 6 módulos por projeto.',true);
 const key='modulo_'+n+'_'+String(Math.floor(Math.random()*9999));
 design.modules.push({key,name:'Módulo '+n,roles:['ADMIN','OPERADOR'],
  fields:[{key:'descricao',label:'Descrição',type:'text',required:true,options:''}]});
 renderModules();renderPreview();
}
function newField(moduleIndex){
 const m=design.modules[moduleIndex];
 if(m.fields.length>=12)return show('Limite de 12 campos por módulo.',true);
 const index=m.fields.length+1;
 m.fields.push({key:'campo_'+index+'_'+String(Math.floor(Math.random()*9999)),
  label:'Novo campo '+index,type:'text',required:false,options:''});
 renderModules();renderPreview();
}
function renderModules(){
 const target=$('system-modules');target.replaceChildren();
 const locked=currentBlueprint?.status==='APROVADO_HOMOLOGACAO';
 design.modules.forEach((m,moduleIndex)=>{
  const card=el('div',undefined,'system-module');
  const head=el('div',undefined,'system-module-top');
  head.append(el('h3','Módulo '+(moduleIndex+1)));
  const remove=el('button','Remover módulo');remove.type='button';remove.disabled=locked;
  remove.addEventListener('click',()=>{
   if(design.modules.length<=1)return show('O projeto precisa de pelo menos um módulo.',true);
   design.modules.splice(moduleIndex,1);renderModules();renderPreview();
  });
  head.append(remove);card.append(head);
  const name=createInput('Nome do módulo',m.name,value=>{m.name=value;renderPreview();},{maxlength:70,required:true});
  card.append(name);
  const roles=el('div',undefined,'system-role-choices');
  roles.append(el('span','Perfis de acesso','system-role-label'));
  for(const role of Object.keys(ROLES)){
   const label=el('label',undefined);
   const c=el('input');c.type='checkbox';c.value=role;c.checked=m.roles.includes(role);
   c.addEventListener('change',()=>{
    m.roles=c.checked?[...new Set([...m.roles,role])]:m.roles.filter(v=>v!==role);
    renderPreview();
   });
   label.append(c,document.createTextNode(ROLES[role]));roles.append(label);
  }
  card.append(roles);
  const fields=el('div',undefined,'system-fields');
  fields.append(el('h4','Campos do cadastro'));
  m.fields.forEach((f,fieldIndex)=>{
   const row=el('div',undefined,'system-field');
   const pair=el('div',undefined,'system-field-pair');
   pair.append(createInput('Nome do campo',f.label,value=>{f.label=value;renderPreview();},{maxlength:70,required:true}));
   const typeLabel=el('label','Tipo do campo'),type=el('select');
   const typeNames={text:'Texto',number:'Número',date:'Data',boolean:'Sim / Não',select:'Seleção'};
   for(const kind of FIELD_TYPES)option(type,kind,typeNames[kind]);
   type.value=f.type;
   const optionsLabel=el('label',undefined,'system-field-options');
   const opts=el('input');opts.maxLength=1040;opts.placeholder='Pendente, Em andamento, Concluído';
   opts.value=Array.isArray(f.options)?f.options.join(', '):f.options||'';
   optionsLabel.append(document.createTextNode('Opções (separadas por vírgula)'),opts);
   optionsLabel.hidden=type.value!=='select';
   type.addEventListener('change',()=>{
    f.type=type.value;optionsLabel.hidden=type.value!=='select';renderPreview();
   });
   opts.addEventListener('input',()=>{f.options=opts.value;renderPreview();});
   typeLabel.append(type);pair.append(typeLabel);row.append(pair,optionsLabel);
   const footer=el('div',undefined,'system-field-settings');
   const reqLabel=el('label'),req=el('input');req.type='checkbox';req.checked=f.required===true;
   req.addEventListener('change',()=>{f.required=req.checked;renderPreview();});
   reqLabel.append(req,document.createTextNode('Campo obrigatório'));
   const del=el('button','Remover campo','system-field-remove');del.type='button';del.disabled=locked;
   del.addEventListener('click',()=>{
    if(m.fields.length<=1)return show('Cada módulo precisa de um campo.',true);
    m.fields.splice(fieldIndex,1);renderModules();renderPreview();
   });
   footer.append(reqLabel,del);row.append(footer);fields.append(row);
  });
  const add=el('button','Adicionar campo','small-button');add.type='button';add.disabled=locked;
  add.addEventListener('click',()=>newField(moduleIndex));fields.append(add);
  card.append(fields);target.append(card);
 });
 $('system-add-module').disabled=locked||design.modules.length>=6;
 $('system-save').disabled=!companyAdmin||locked;
 for(const x of target.querySelectorAll('input,select'))x.disabled=locked;
}
function readMainInputs(){
 design.title=$('system-name').value;
 design.summary=$('system-summary').value;
 design.objective=$('system-objective').value;
 design.sector=$('system-sector').value;
 design.hosting=$('system-hosting').value;
}
function fillMainInputs(){
 $('system-name').value=design.title;
 $('system-summary').value=design.summary||'';
 $('system-objective').value=design.objective;
 $('system-sector').value=design.sector;
 $('system-hosting').value=design.hosting;
}
function applyTemplate(name){
 currentBlueprint=null;design=makeSystemTemplate(name);previewIndex=0;
 fillMainInputs();renderModules();renderPreview();
}
function renderPreview(){
 readMainInputs();
 const target=$('system-preview');target.replaceChildren();
 let prepared;
 try{prepared=validateSystemProject(design);}
 catch(e){target.append(el('p','Complete o projeto para gerar a prévia: '+e.message,'muted'));return;}
 previewIndex=Math.min(previewIndex,prepared.spec.modules.length-1);
 const head=el('div',undefined,'preview-heading');
 head.append(el('strong',prepared.title),el('small','Protótipo visual · sem dados reais'));target.append(head);
 const shell=el('div',undefined,'preview-body'),menu=el('div',undefined,'preview-menu'),content=el('div',undefined,'preview-content');
 prepared.spec.modules.forEach((m,i)=>{
  const btn=el('button',m.name,i===previewIndex?'active':'');btn.type='button';
  btn.addEventListener('click',()=>{previewIndex=i;renderPreview();});menu.append(btn);
 });
 const module=prepared.spec.modules[previewIndex];
 content.append(el('h3',module.name),el('p','Prévia de cadastro · Perfis: '+module.roles.map(x=>ROLES[x]).join(', ')));
 for(const f of module.fields){
  const label=el('label',f.label+(f.required?' *':''));let input;
  if(f.type==='select'){input=el('select');option(input,'','Selecione');for(const val of f.options)option(input,val,val);}
  else{input=el('input');input.type=f.type==='number'?'number':f.type==='date'?'date':f.type==='boolean'?'checkbox':'text';}
  input.disabled=true;label.append(input);content.append(label);
 }
 content.append(el('p','Esta prévia não registra operações nem cria infraestrutura.'));
 shell.append(menu,content);target.append(shell);
}
function setReadonly(locked){
 for(const id of ['system-name','system-summary','system-objective','system-sector','system-hosting','system-template'])$(id).disabled=locked;
 renderModules();
}
function loadOne(project){
 currentBlueprint=project;
 design={title:project.title,summary:project.summary,sector:project.specification.sector,
  objective:project.specification.objective,hosting:project.specification.hosting,
  modules:project.specification.modules.map(m=>({...m,roles:[...m.roles],fields:m.fields.map(f=>({...f,
   options:Array.isArray(f.options)?f.options.join(', '):f.options||''}))}))};
 fillMainInputs();setReadonly(project.status==='APROVADO_HOMOLOGACAO');renderPreview();
 $('system-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function reset(){
 $('system-template').disabled=false;
 $('system-template').value='assistencia';
 applyTemplate('assistencia');
 setReadonly(false);
 show('Novo projeto. A prévia local não cria banco nem despesas.');
}
async function loadCompany(){
 const company=$('system-company').value;companyId=company;currentBlueprint=null;
 const license=await rpc('get_company_system_license_status',{p_company:company,p_system_code:'SFT_SETOR_FISCAL'});
 companyLicensed=license?.effective_active===true;
 const role=companyRoles.get(company)||'';
 companyAdmin=companyLicensed&&(role==='ADMIN'||user?.email?.toLowerCase()===MASTER_EMAIL);
 $('system-company-role').textContent=companyLicensed?'Licença ativa · '+(role||'Master'):'Sem licença ativa';
 $('system-save').disabled=!companyAdmin;
 projects=[];renderProjects();await loadProjects();
 setReadonly(false);
 if(companyLicensed)show(companyAdmin?'Empresa autorizada para salvar projetos e aprovar homologação.':'Você pode consultar projetos aprovados, sem alterar a estrutura.');
 else show('Empresa sem licença ativa. É possível visualizar a prévia local, mas não salvar.',true);
}
async function loadProjects(){
 if(!companyId||!companyLicensed)return;
 projects=await table('sft_system_blueprints?select=id,company_id,title,summary,specification,status,version,created_at&company_id=eq.'+
  encodeURIComponent(companyId)+'&order=created_at.desc&limit=20');
 renderProjects();
}
function renderProjects(){
 const target=$('system-project-list');target.replaceChildren();
 if(!companyLicensed){target.append(el('p','Entre com uma empresa licenciada para consultar seus projetos.','muted'));return;}
 if(!projects.length){target.append(el('p','Sua empresa ainda não tem projetos salvos.','muted'));return;}
 for(const p of projects){
  const wrapper=el('div',undefined,'system-project');
  wrapper.append(el('strong',p.title),el('small',getProjectStage(p.status)+' · versão '+p.version),
   el('p',(p.summary||'')+' · '+p.specification.modules.length+' módulo(s)'));
  const buttons=el('div',undefined,'buttons'),open=el('button','Visualizar projeto');open.type='button';
  open.addEventListener('click',()=>{loadOne(p);show('Projeto carregado para prévia.');});buttons.append(open);
  if(p.status==='RASCUNHO'&&companyAdmin){
   const approve=el('button','Aprovar para homologação');approve.type='button';
   approve.addEventListener('click',async()=>{
    if(!confirm('Aprovar este projeto apenas para HOMOLOGAÇÃO? Nenhum aplicativo ou servidor será criado.'))return;
    approve.disabled=true;
    try{await rpc('sft_system_blueprint_approve',{p_blueprint:p.id,p_version:p.version});
      await loadProjects();show('Projeto aprovado para homologação, sem publicação ou cobrança.');}
    catch(e){show(e.message,true);}
    finally{approve.disabled=false;}
   });buttons.append(approve);
  }
  wrapper.append(buttons);target.append(wrapper);
 }
}
async function initSession(){
 let raw=null;try{raw=sessionStorage.getItem(SESSION_STORAGE_KEY);session=raw?JSON.parse(raw):null;}
 catch{session=null;}
 if(!session?.access_token||!session?.refresh_token)return;
 try{
  user=await request('/auth/v1/user');
  if(!user?.id)throw Error('Sessão inválida');
  const [companies,memberships]=await Promise.all([
   table('companies?select=id,legal_name,cnpj_root&order=legal_name.asc&limit=100'),
   table('company_memberships?select=company_id,role&user_id=eq.'+encodeURIComponent(user.id))
  ]);
  companyRoles=new Map(memberships.map(x=>[x.company_id,x.role]));
  if(!companies.length){show('Sua conta não possui empresa autorizada para salvar projetos.',true);return;}
  $('system-login').hidden=true;$('system-company-box').hidden=false;
  $('system-company').replaceChildren();
  companies.forEach(c=>option($('system-company'),c.id,c.legal_name+' · '+c.cnpj_root));
  const wanted=new URLSearchParams(location.search).get('empresa');
  companyId=companies.find(c=>c.id===wanted)?.id||companies[0].id;
  $('system-company').value=companyId;
  await loadCompany();
 }catch(e){
  $('system-company-box').hidden=true;
  $('system-login').hidden=false;
  $('system-save').disabled=true;
  show('Não foi possível validar a sessão. Entre novamente pelo painel. '+e.message,true);
 }
}
$('system-template').addEventListener('change',ev=>{
 if(currentBlueprint && !confirm('Descartar a edição atual e utilizar outro modelo?')){ev.target.value='personalizado';return;}
 applyTemplate(ev.target.value);
});
for(const id of ['system-name','system-summary','system-objective','system-sector','system-hosting']){
 $(id).addEventListener('input',renderPreview);
 $(id).addEventListener('change',renderPreview);
}
$('system-add-module').addEventListener('click',newModule);
$('system-show-preview').addEventListener('click',()=>{
 renderPreview();$('system-preview-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('system-new').addEventListener('click',reset);
$('system-company').addEventListener('change',()=>loadCompany().catch(e=>show(e.message,true)));
$('system-save').addEventListener('click',async()=>{
 if(!companyAdmin||!companyLicensed||!companyId)return show('Somente administradores de empresa licenciada podem salvar.',true);
 if(currentBlueprint?.status==='APROVADO_HOMOLOGACAO')return show('Projeto aprovado não pode ser editado. Crie um novo projeto.',true);
 let prepared;
 try{readMainInputs();prepared=validateSystemProject(design);}catch(e){show(e.message,true);return;}
 const button=$('system-save');button.disabled=true;
 try{
  if(currentBlueprint){
   const version=await rpc('sft_system_blueprint_update',{p_blueprint:currentBlueprint.id,
    p_title:prepared.title,p_summary:prepared.summary,p_spec:prepared.spec,p_version:currentBlueprint.version});
   show('Rascunho atualizado para versão '+version+'.');
  }else{
   await rpc('sft_system_blueprint_create',{p_company:companyId,
    p_title:prepared.title,p_summary:prepared.summary,p_spec:prepared.spec});
   show('Projeto salvo como rascunho. Revise e aprove apenas quando estiver pronto.');
  }
  await loadProjects();reset();
 }catch(e){show('Projeto não salvo: '+e.message,true);}
 finally{button.disabled=!companyAdmin;}
});
applyTemplate('assistencia');initSession();
