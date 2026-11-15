// Pure, dependency-free module configuration helpers. Never generates executable SQL/JS.
export const FIELD_TYPES=Object.freeze(['text','number','date','boolean','select']);
export function fieldKey(label){
 let key=String(label||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,30).replace(/_+$/g,'');
 if(!/^[a-z]/.test(key) || key.length<2) key='campo_'+key;
 return key.slice(0,30);
}
export function prepareFields(drafts){
 if(!Array.isArray(drafts)||drafts.length<1||drafts.length>12)throw Error('Informe de 1 a 12 campos.');
 const used=new Set();
 return drafts.map((d,i)=>{
  const label=String(d.label||'').trim();
  if(label.length<2||label.length>70)throw Error('O campo '+(i+1)+' precisa de um nome de 2 a 70 caracteres.');
  const key=fieldKey(d.key||label);
  if(used.has(key))throw Error('Há campos com nomes repetidos: '+label);
  used.add(key);
  const type=String(d.type||'text');
  if(!FIELD_TYPES.includes(type))throw Error('Tipo de campo não permitido.');
  const f={key,label,type,required:d.required===true};
  if(type==='select'){
   const options=String(d.options||'').split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);
   if(options.length<2||options.length>12||options.some(s=>s.length>80)||new Set(options).size!==options.length)throw Error('O campo '+label+' precisa de 2 a 12 opções diferentes.');
   f.options=options;
  }
  return f;
 });
}
export function recordPayload(fields,values){
 const out={};
 for(const field of fields){
  let value=values[field.key];
  if(field.type==='boolean'){
   out[field.key]=Boolean(value);
   continue;
  }
  if(value===undefined||value===null||String(value).trim()===''){
   if(field.required)throw Error('Preencha '+field.label+'.');
   continue;
  }
  if(field.type==='number'){
   const n=Number(value);
   if(!Number.isFinite(n))throw Error('Número inválido em '+field.label+'.');
   out[field.key]=n;
  }else if(field.type==='date'){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||Number.isNaN(Date.parse(value+'T12:00:00Z')))throw Error('Data inválida em '+field.label+'.');
   out[field.key]=String(value);
  }else if(field.type==='select'){
   if(!field.options.includes(String(value)))throw Error('Opção inválida em '+field.label+'.');
   out[field.key]=String(value);
  }else{
   if(String(value).length>500)throw Error('Texto acima de 500 caracteres: '+field.label+'.');
   out[field.key]=String(value);
  }
 }
 return out;
}
export const EXAMPLE_FIELDS=Object.freeze([
 {key:'equipamento',label:'Equipamento',type:'text',required:true},
 {key:'responsavel',label:'Responsável',type:'text',required:true},
 {key:'data_abertura',label:'Data de abertura',type:'date',required:false},
 {key:'situacao',label:'Situação',type:'select',required:true,options:['Aberto','Em andamento','Concluído']}
]);
