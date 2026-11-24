import test from "node:test";
import assert from "node:assert/strict";
import {normalizarTelefone,decisaoContato} from "./moderacao.mjs";
test("normaliza telefone nacional",()=>assert.equal(normalizarTelefone("(64) 99917-2700"),"+5564999172700"));
test("bloqueio conserva recebimento e armazenamento",()=>{const r=decisaoContato({status:"bloqueado",telefone:"+5564999172700"});assert.equal(r.receberEArmazenar,true);assert.equal(r.exibirCaixaPrincipal,false);assert.equal(r.notificar,false)});
test("descarte não apaga mensagens",()=>assert.equal(decisaoContato({status:"descartado",telefone:"+5564999172700"}).receberEArmazenar,true));
test("contato ativo volta a aparecer",()=>assert.equal(decisaoContato({status:"ativo",telefone:"+5564999172700"}).exibirCaixaPrincipal,true));
test("rejeita status inesperado",()=>assert.throws(()=>decisaoContato({status:"excluido",telefone:"+5564999172700"})));
