import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CAIXAS_FORTE, identificarCaixaOriginal, avaliarIdentidadeDeResposta } from "./roteamento.mjs";
const config=JSON.parse(await readFile(new URL("../config/canais-homologacao.json", import.meta.url),"utf8"));
test("mapeia as 3 caixas a partir do destinatario original",()=>{
 for(const conta of CAIXAS_FORTE) {
  const r=identificarCaixaOriginal({to:[conta]});
  assert.equal(r.estado,"identificada");
  assert.equal(r.caixa,conta);
 }
});
test("extrai emails em cabeçalhos formatados",()=>{
 const r=identificarCaixaOriginal({to:'Equipe <Orcamentos@ForteAtacarejo.com.br>'});
 assert.equal(r.caixa,"orcamentos@forteatacarejo.com.br");
});
test("para em caso de destinatarios corporativos multiplos",()=>{
 const r=identificarCaixaOriginal({to:CAIXAS_FORTE.slice(0,2)});
 assert.equal(r.estado,"revisao_humana");
 assert.equal(r.caixa,null);
});
test("nao adivinha identidade se so Gmail central consta no cabecalho",()=>{
 const r=identificarCaixaOriginal({to:"entradasforteatacarejo@gmail.com"});
 assert.equal(r.estado,"origem_desconhecida");
 assert.equal(r.caixa,null);
});
test("bloqueia envio de gerencia e orcamentos ate credenciais independentes",()=>{
 for(const caixa of [CAIXAS_FORTE[0],CAIXAS_FORTE[2]]) {
  const r=avaliarIdentidadeDeResposta(caixa,config.email);
  assert.equal(r.liberado,false);
 }
 assert.equal(avaliarIdentidadeDeResposta("contato@forteatacarejo.com.br",config.email).liberado,true);
});
test("bloqueia identidade desconhecida",()=>{
 assert.equal(avaliarIdentidadeDeResposta("emails@forteatacarejo.com.br",config.email).liberado,false);
});
