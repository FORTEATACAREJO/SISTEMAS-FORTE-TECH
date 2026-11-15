"use strict";
import {prepareFields,fieldKey,recordPayload,EXAMPLE_FIELDS,FIELD_TYPES} from './construtor-core.mjs';
const ORIGIN='https://tusmlfhzwlzwnoxfhomt.supabase.co';
const KEY='sb_publishable_O99oIf3bXMIOkeh_XCpY6w_7OxD3FPI';
const STORAGE='multiempresarial-protected-session';
const MASTER='sistemasfortetech@gmail.com';
const $=id=>document.getElementById(id);
let session=null,user=null,companyId=null,companyRole='',licensed=false,canAdmin=false,canWrite=false,modules=[],openedModule=null,editingModule=null;
const notice=(msg,bad=false)=>{const box=$('builder-status');box.textContent=msg;box.classList.toggle('error',bad);};
async function request(path,{method='GET',body,auth=true}={}){
 const headers={apikey:KEY,'Content-Type':'application/json'};
 if(auth){
  if(!session)throw Error('Entre pelo painel empresarial.');
  if(session.expires_at<Math.floor(Date.now()/1000)+90){
   const response=await fetch(ORIGIN+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),cache:'no-store',referrerPolicy:'no-referrer'});
   const renewed=await response.json();
   if(!response.ok||!renewed.access_token)throw Error('Sessão expirada. Entre novamente pelo painel.');
   session={access_token:renewed.access_token,refresh_token:renewed.refresh_token,expires_at:renewed.expires_at||Math.floor(Date.now()/1000)+(renewed.expires_in||3600)};
   sessionStorage.setItem(STORAGE,JSON.stringify(session));
  }
  headers.Authorization='Bearer '+session.access_token;
 }
 const res=await fetch(ORIGIN+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',referrerPolicy:'no-referrer'});
 const raw=await res.text();let data;
 try{data=raw?JSON.parse(raw):null;}catch{data={message:raw.slice(0,180)};}
 if(!res.ok)throw Error(data?.message||data?.error_description||data?.error||'Acesso não autorizado ('+res.status+')');
 return data;
}
const table=query=>request('/rest/v1/'+query);
const rpc=(name,payload)=>request('/rest/v1/rpc/'+name,{method:'POST',body:payload});
const make=(tag,text,classes)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(classes)e.className=classes;return e;};
const setOption=(select,value,label)=>{const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);};
function fieldRow(d={}){
 const wrap=make('div',undefined,'field-row');
 const grid=make('div',undefined,'field-grid');
 const labelBox=make('div');const label=make('label','Nome do campo');const name=make('input');
 name.maxLength=70;name.placeholder='Ex.: Número do equipamento';name.value=d.label||'';name.dataset.fieldLabel='';labelBox.append(label,name);
 const typeBox=make('div');const typeLabel=make('label','Tipo');const type=make('select');
 const types={text:'Texto',number:'Número',date:'Data',boolean:'Sim / Não',select:'Lista de opções'};
 for(const kind of FIELD_TYPES)setOption(type,kind,types[kind]);type.value=d.type||'text';
 typeBox.append(typeLabel,type);grid.append(labelBox,typeBox);
 const extras=make('div',undefined,'extras');const requiredLabel=make('label');const required=make('input');
 required.type='checkbox';required.checked=d.required===true;
 requiredLabel.append(required,document.createTextNode('Obrigatório'));
 const remove=make('button','Excluir campo','remove');remove.type='button';remove.addEventListener('click',()=>{wrap.remove();refreshPreview();});
 extras.append(requiredLabel,remove);
 const optionBox=make('div');const optionLabel=make('label','Opções (separadas por vírgula)');const options=make('textarea');
 options.rows=2;options.maxLength=1050;options.placeholder='Aberto, Em andamento, Concluído';options.value=Array.isArray(d.options)?d.options.join(', '):d.options||'';
 optionBox.append(optionLabel,options);
 const adjust=()=>{optionBox.hidden=type.value!=='select';refreshPreview();};
 type.addEventListener('change',adjust);name.addEventListener('input',refreshPreview);
 required.addEventListener('change',refreshPreview);options.addEventListener('input',refreshPreview);
 wrap.append(grid,extras,optionBox);wrap._get=()=>({key:d.key||fieldKey(name.value),label:name.value,type:type.value,required:required.checked,options:options.value});adjust();
 $('builder-fields').append(wrap);
 return wrap;
}
function drafts(){return [...$('builder-fields').children].map(node=>node._get());}
function resetDesigner(){
 editingModule=null;
 $('builder-module-form').reset();
 $('builder-fields').replaceChildren();
 $('builder-edit-state').textContent='Novo rascunho';
 $('builder-save').textContent='Salvar rascunho';
 for(const f of EXAMPLE_FIELDS)fieldRow(f);
 refreshPreview();
}
function drawFields(host,fields,preview=false){
 host.replaceChildren();
 for(const field of fields){
  const label=make('label',field.label+(field.required?' *':''));
  const input=field.type==='select'?make('select'):make('input');
  input.name=field.key;
  if(field.type==='select'){
   setOption(input,'','Selecione uma opção');
   for(const option of field.options)setOption(input,option,option);
  }else if(field.type==='boolean'){input.type='checkbox';}
  else if(field.type==='number'){input.type='number';input.step='any';}
  else if(field.type==='date'){input.type='date';}
  else{input.type='text';input.maxLength=500;}
  if(preview)input.disabled=true;
  else input.required=field.required===true&&field.type!=='boolean';
  label.append(input);host.append(label);
 }
}
function refreshPreview(){
 const box=$('builder-preview-box');box.replaceChildren();
 try{
  const fields=prepareFields(drafts());
  const h=make('h3',$('builder-title').value.trim()||'Prévia do módulo');
  const p=make('p',$('builder-description').value.trim()||'Formulário de cadastro.');
  const form=make('div');drawFields(form,fields,true);
  box.append(h,p,form);
 }catch(e){box.append(make('p','Configure pelo menos um campo válido. '+e.message));}
}
function toggleDesigner(){
 for(const el of $('builder-designer').querySelectorAll('input,select,textarea,button'))el.disabled=!canAdmin;
}
async function loadCompanies(){
 const [companies,memberships]=await Promise.all([
  table('companies?select=id,legal_name,cnpj_root&order=legal_name.asc&limit=100'),
  table('company_memberships?select=company_id,role&user_id=eq.'+encodeURIComponent(user.id))
 ]);
 const roles=new Map(memberships.map(m=>[m.company_id,m.role]));
 $('builder-company').replaceChildren();
 for(const c of companies)setOption($('builder-company'),c.id,c.legal_name+' · '+c.cnpj_root);
 $('builder-company').onchange=async()=>{companyId=$('builder-company').value;companyRole=roles.get(companyId)||'';await loadCurrentCompany();};
 companyId=companies.find(c=>c.id===new URLSearchParams(location.search).get('empresa'))?.id||companies[0]?.id||null;
 if(companyId)$('builder-company').value=companyId;
 if(!companyId){
  notice('Nenhuma empresa autorizada para esta conta. Solicite vínculo pelo painel Multiempresarial.',true);
  $('builder-app').hidden=false;$('builder-designer').hidden=true;
  return;
 }
 companyRole=roles.get(companyId)||'';
 $('builder-app').hidden=false;
 await loadCurrentCompany();
}
async function loadCurrentCompany(){
 openedModule=null;editingModule=null;
 $('builder-runtime').hidden=true;
 const state=await rpc('get_company_system_license_status',{p_company:companyId,p_system_code:'SFT_SETOR_FISCAL'});
 licensed=state?.effective_active===true;
 const claimedMaster=user.email?.toLowerCase()===MASTER;
 canAdmin=licensed&&(companyRole==='ADMIN'||claimedMaster);
 canWrite=licensed&&(companyRole==='ADMIN'||companyRole==='OPERADOR'||claimedMaster);
 $('builder-designer').hidden=!canAdmin;
 $('builder-access').textContent=licensed?'Licença ativa · '+(companyRole||'Master'):'Licença não ativa';
 resetDesigner();toggleDesigner();
 if(!licensed){modules=[];$('builder-modules').replaceChildren(make('p','Esta empresa precisa de licença ativa para consultar ou publicar módulos.','muted'));notice('Acesso empresarial bloqueado. Regularize a licença no painel.',true);return;}
 await loadModules();
 notice('Empresa selecionada. Módulos isolados por CNPJ e sujeitos às permissões de acesso.');
}
async function loadModules(){
 modules=await table('sft_builder_modules?select=id,company_id,title,description,fields,status,version,published_at&company_id=eq.'+encodeURIComponent(companyId)+'&order=created_at.desc&limit=30');
 renderModules();
 const wanted=new URLSearchParams(location.search).get('modulo');
 const match=modules.find(m=>m.id===wanted && m.status==='PUBLICADO');
 if(match)await openModule(match);
}
function renderModules(){
 const box=$('builder-modules');box.replaceChildren();
 if(!modules.length){box.append(make('p','Nenhum módulo cadastrado para esta empresa.','muted'));return;}
 for(const m of modules){
  const item=make('div',undefined,'module-item');item.append(make('strong',m.title));
  item.append(make('span',m.status==='PUBLICADO'?'Publicado · versão '+m.version:'Rascunho · versão '+m.version,'tag'));
  const description=make('p',m.description||'Sem descrição','muted');item.append(description);
  const actions=make('div',undefined,'actions');
  const open=make('button',m.status==='PUBLICADO'?'Abrir registros':'Ver prévia');
  open.addEventListener('click',()=>openModule(m).catch(e=>notice(e.message,true)));actions.append(open);
  if(m.status==='RASCUNHO'&&canAdmin){
   const edit=make('button','Editar rascunho');edit.addEventListener('click',()=>loadDraft(m));actions.append(edit);
   const publish=make('button','Publicar na empresa');publish.addEventListener('click',async()=>{
    if(!confirm('Publicar "'+m.title+'" somente para a empresa selecionada? Após publicar, os campos ficam bloqueados nesta versão.'))return;
    publish.disabled=true;
    try{await rpc('sft_builder_publish',{p_module:m.id,p_expected_version:m.version});await loadModules();const latest=modules.find(x=>x.id===m.id);if(latest)await openModule(latest);notice('Módulo publicado no ambiente desta empresa.');}
    catch(e){notice('Não foi possível publicar: '+e.message,true);}finally{publish.disabled=false;}
   });actions.append(publish);
  }
  item.append(actions);box.append(item);
 }
}
function loadDraft(m){
 if(!canAdmin)return notice('Somente administradores podem editar rascunhos.',true);
 editingModule=m;
 $('builder-title').value=m.title;
 $('builder-description').value=m.description;
 $('builder-fields').replaceChildren();
 for(const f of m.fields)fieldRow(f);
 $('builder-edit-state').textContent='Editando rascunho, versão '+m.version;
 $('builder-save').textContent='Salvar alterações';
 refreshPreview();$('builder-designer').scrollIntoView({behavior:'smooth',block:'start'});
}
async function openModule(m){
 openedModule=m;
 if(m.status!=='PUBLICADO'){
  $('builder-title').value=m.title;
  $('builder-description').value=m.description;
  $('builder-fields').replaceChildren();for(const f of m.fields)fieldRow(f);
  refreshPreview();$('builder-runtime').hidden=true;return;
 }
 $('builder-runtime').hidden=false;
 $('builder-runtime-name').textContent=m.title;
 $('builder-runtime-desc').textContent=m.description||'Módulo próprio da empresa.';
 $('builder-record-form').hidden=!canWrite;
 $('builder-record-notice').textContent=canWrite?'Cadastre os dados autorizados somente desta empresa.':'Seu perfil permite consulta, sem novos registros.';
 if(canWrite)drawFields($('builder-record-fields'),m.fields,false);
 await loadRecords(m);
 $('builder-runtime').scrollIntoView({behavior:'smooth',block:'start'});
}
async function loadRecords(m){
 const rows=await table('sft_builder_records?select=id,data,created_at&company_id=eq.'+encodeURIComponent(companyId)+'&module_id=eq.'+encodeURIComponent(m.id)+'&order=created_at.desc&limit=50');
 const target=$('builder-records');target.replaceChildren();
 if(!rows.length){target.append(make('p','Nenhum registro neste módulo.','muted'));return;}
 const wrapper=make('div',undefined,'records-wrapper'),tbl=make('table',undefined,'records-table'),thead=make('thead'),tr=make('tr');
 for(const f of m.fields)tr.append(make('th',f.label));tr.append(make('th','Criado em'));thead.append(tr);tbl.append(thead);
 const tbody=make('tbody');
 for(const row of rows){
  const tr=make('tr');
  for(const f of m.fields){
   const v=row.data?.[f.key];
   tr.append(make('td',v===true?'Sim':v===false?'Não':v===undefined||v===null?'—':String(v)));
  }
  tr.append(make('td',new Date(row.created_at).toLocaleString('pt-BR')));tbody.append(tr);
 }
 tbl.append(tbody);wrapper.append(tbl);target.append(wrapper);
}
$('builder-add-field').addEventListener('click',()=>{
 if($('builder-fields').children.length>=12)return notice('Limite de 12 campos por módulo.',true);
 fieldRow({label:'Novo campo',type:'text'});refreshPreview();
});
$('builder-title').addEventListener('input',refreshPreview);
$('builder-description').addEventListener('input',refreshPreview);
$('builder-preview').addEventListener('click',()=>{refreshPreview();$('builder-preview-box').scrollIntoView({behavior:'smooth',block:'nearest'});});
$('builder-reset').addEventListener('click',resetDesigner);
$('builder-module-form').addEventListener('submit',async ev=>{
 ev.preventDefault();if(!canAdmin)return notice('É necessário ser ADMIN e possuir licença ativa.',true);
 const button=$('builder-save');button.disabled=true;
 try{
  const fields=prepareFields(drafts()),title=$('builder-title').value.trim(),description=$('builder-description').value.trim();
  if(title.length<3||title.length>90)throw Error('Informe um título de 3 a 90 caracteres.');
  if(editingModule){
   const version=await rpc('sft_builder_edit',{p_module:editingModule.id,p_title:title,p_description:description,p_fields:fields,p_expected_version:editingModule.version});
   notice('Rascunho atualizado, versão '+version+'.');
  }else{
   await rpc('sft_builder_create',{p_company:companyId,p_title:title,p_description:description,p_fields:fields});
   notice('Módulo salvo como rascunho. Confira a prévia e publique quando estiver pronto.');
  }
  resetDesigner();await loadModules();
 }catch(e){notice(e.message,true);}
 finally{button.disabled=false;}
});
$('builder-record-form').addEventListener('submit',async ev=>{
 ev.preventDefault();if(!openedModule||!canWrite)return notice('Sem permissão para gravar.',true);
 const button=ev.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 try{
  const values={};
  for(const field of openedModule.fields){
   const input=ev.currentTarget.elements.namedItem(field.key);
   values[field.key]=field.type==='boolean'?input.checked:input.value;
  }
  const payload=recordPayload(openedModule.fields,values);
  await rpc('sft_builder_add_record',{p_module:openedModule.id,p_data:payload});
  ev.currentTarget.reset();await loadRecords(openedModule);
  notice('Registro salvo com sucesso na empresa selecionada.');
 }catch(e){notice('Registro não salvo: '+e.message,true);}
 finally{button.disabled=false;}
});
async function init(){
 const raw=sessionStorage.getItem(STORAGE);
 try{session=raw?JSON.parse(raw):null;}catch{session=null;}
 if(!session?.access_token||!session?.refresh_token){$('builder-auth').hidden=false;return;}
 try{user=await request('/auth/v1/user');if(!user?.id)throw Error('Sessão inválida.');await loadCompanies();}
 catch(e){session=null;sessionStorage.removeItem(STORAGE);$('builder-app').hidden=true;$('builder-auth').hidden=false;notice('Acesse novamente pelo painel. '+e.message,true);}
}
init();
