import test from "node:test";import assert from "node:assert/strict";
import {AtendimentoCompartilhado} from "./atendimento.mjs";
const juliana={tenantId:"forte",userId:"juliana",role:"atendente"};
const joao={tenantId:"forte",userId:"joao",role:"atendente"};
test("classificacao, dupla visibilidade e nao lidos individuais",()=>{
 const a=new AtendimentoCompartilhado();
 a.contato(juliana,{identidade:"+5534999209335",tipo:"fornecedor",nome:"Fornecedor"});
 const e=a.receber({tenantId:"forte",canal:"whatsapp",identidade:"+5534999209335",externalId:"wamid.1",text:"Pedido 1520 confirmado"});
 assert.equal(e.encaminharOperacional,true);
 assert.equal(a.receber({tenantId:"forte",canal:"whatsapp",identidade:"+5534999209335",externalId:"wamid.1"}).duplicate,true);
 assert.equal(a.listar(joao).length,1);
 a.marcarLida(juliana,e.conversaId);
 assert.equal(a.resumo(juliana).naoLidas,0);
 assert.equal(a.resumo(joao).naoLidas,1);
 assert.equal(a.resumo(juliana).pendentes,1);
 a.assumir(juliana,e.conversaId);
 assert.throws(()=>a.assumir(joao,e.conversaId));
 assert.equal(a.registrarResposta(juliana,e.conversaId,"Olá, sou Juliana").status,"rascunho_nao_enviado");
 a.resolver(juliana,e.conversaId);assert.equal(a.resumo(joao).pendentes,0);
});
test("isolamento de empresas e tipo desconhecido",()=>{
 const a=new AtendimentoCompartilhado();
 assert.throws(()=>a.contato(juliana,{identidade:"x",tipo:"invalido"}));
 const e=a.receber({tenantId:"forte",canal:"email",identidade:"cliente@example.com",externalId:"m1",text:"Olá"});
 assert.throws(()=>a.marcarLida({tenantId:"outra",userId:"x",role:"admin"},e.conversaId));
});
