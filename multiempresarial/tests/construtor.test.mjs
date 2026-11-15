import test from 'node:test';import assert from 'node:assert/strict';
import {prepareFields,fieldKey,recordPayload,EXAMPLE_FIELDS} from '../construtor-core.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('exemplo cria quatro campos declarativos e chaves normalizadas',()=>{
 assert.equal(fieldKey('Data de Instalação'),'data_de_instalacao');
 const fields=prepareFields(EXAMPLE_FIELDS.map(x=>({...x,options:x.options?.join(',')})));
 assert.equal(fields.length,4);
 assert.equal(fields[3].options.length,3);
});
test('não aceita nomes de campos duplicados, tipos arbitrários ou opções ausentes',()=>{
 assert.throws(()=>prepareFields([{label:'Pessoa',type:'text'},{label:'Pessoa',type:'text'}]),/repetidos/);
 assert.throws(()=>prepareFields([{label:'Comando',type:'sql'}]),/não permitido/);
 assert.throws(()=>prepareFields([{label:'Estado',type:'select',options:'Somente um'}]),/2 a 12/);
});
test('registros respeitam número, data, texto e seleção',()=>{
 const fields=prepareFields([{label:'Preço unitário',type:'number',required:true},{label:'Data de entrega',type:'date'},{label:'Status',type:'select',options:'Pendente,Concluído'}]);
 const row=recordPayload(fields,{preco_unitario:'125.50',data_de_entrega:'2026-11-15',status:'Pendente'});
 assert.equal(row.preco_unitario,125.5);
 assert.equal(row.status,'Pendente');
 assert.throws(()=>recordPayload(fields,{preco_unitario:'NaN',status:'Pendente'}),/inválido/);
 assert.throws(()=>recordPayload(fields,{preco_unitario:1,status:'Desconhecido'}),/Opção inválida/);
});
test('página exige autenticação, menu empresa e não expõe service_role',()=>{
 const html=read('construtor.html'),js=read('construtor.js');
 assert.match(html,/Acesso protegido/);
 assert.match(html,/builder-company/);
 assert.match(js,/get_company_system_license_status/);
 assert.match(js,/sft_builder_create/);
 assert.match(js,/sft_builder_publish/);
 assert.match(js,/sft_builder_add_record/);
 assert.doesNotMatch(js,/service_role|sb_secret_/);
});

test('menu da empresa aponta apenas para módulos publicados, dentro do CNPJ',()=>{const admin=read('admin.js');const page=read('admin.html');const builder=read('construtor.js');assert.match(page,/builder-menu-list/);assert.match(admin,/status=eq.PUBLICADO/);assert.match(admin,/encodeURIComponent\(company.id\)/);assert.match(builder,/new URLSearchParams\(location.search\).get\('modulo'\)/);});
