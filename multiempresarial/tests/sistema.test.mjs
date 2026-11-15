import test from 'node:test';import assert from 'node:assert/strict';
import {SYSTEM_TEMPLATES,makeSystemTemplate,validateSystemProject,getProjectStage} from '../sistema-core.mjs';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('modelos de sistemas produzem especificações declarativas válidas',()=>{
 for(const key of Object.keys(SYSTEM_TEMPLATES)){
  const input=makeSystemTemplate(key);
  const p=validateSystemProject(input);
  assert.ok(p.spec.modules.length>=1);
  assert.ok(p.spec.modules.every(m=>m.fields.length>=1));
  assert.equal(p.spec.hosting,'NUVEM_COMPARTILHADA');
 }
});
test('proteção contra módulos duplicados, campo SQL e excesso de campos',()=>{
 const a=makeSystemTemplate('assistencia');
 a.modules.push({...a.modules[0]});
 assert.throws(()=>validateSystemProject(a),/repetidos/);
 const b=makeSystemTemplate('personalizado');b.modules[0].fields[0].type='sql';
 assert.throws(()=>validateSystemProject(b),/não permitido/);
 const c=makeSystemTemplate('personalizado');c.modules[0].fields=Array(13).fill({label:'Nome',type:'text'});
 assert.throws(()=>validateSystemProject(c),/1 a 12/);
});
test('nenhuma função ativa hospedagem, ChatGPT ou implantação de código',()=>{
 assert.match(getProjectStage('APROVADO_HOMOLOGACAO'),/sem deploy/);
 const js=read('sistema.js'),html=read('criar-sistema.html'),home=read('index.html');
 assert.match(js,/sft_system_blueprint_create/);
 assert.match(js,/sft_system_blueprint_approve/);
 assert.match(js,/get_company_system_license_status/);
 assert.match(html,/apenas para homologação/);
 assert.match(home,/criar-sistema.html/);
 assert.doesNotMatch(js,/service_role|sb_secret_|eval\(/);
});
