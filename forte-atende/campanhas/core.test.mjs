import test from "node:test";
import assert from "node:assert/strict";
import { selecionarDestinatarios, prepararMensagem } from "./core.mjs";

const base = {
  grupos: ["clientes-mg"], ativo: true, cidade: "Monte Carmelo", uf: "MG", segmento: "revenda",
  permitePromocoesEmail: true, permitePromocoesWhatsApp: false
};
const contatos = [
  { ...base, id: "1", nome: "Cliente A", email: "ClienteA@EXEMPLO.COM", telefone: "+5534999991111" },
  { ...base, id: "2", nome: "Cliente B", email: "clientea@exemplo.com", telefone: "+5534999992222" },
  { ...base, id: "3", nome: "Cliente C", email: "clienteC@exemplo.com", descadastrado: true },
  { ...base, id: "4", nome: "Cliente D", email: "clienteD@exemplo.com", permitePromocoesEmail: false },
  { ...base, id: "5", nome: "Cliente E", email: "clienteE@exemplo.com", grupos: ["clientes-go"] },
  { ...base, id: "6", nome: "Cliente F", email: "inválido" }
];
test("seleciona grupo, respeita autorização, descadastro, endereço e duplicidade", () => {
  const r = selecionarDestinatarios({ contatos, grupos: ["clientes-mg"] });
  assert.equal(r.totalAptos, 1);
  assert.equal(r.elegiveis[0].destino, "clientea@exemplo.com");
  assert.deepEqual(r.excluidos, { foraDosGrupos: 1, filtros: 0, inativo: 0, semPermissao: 1, descadastrado: 1, enderecoInvalido: 1, duplicado: 1 });
});
test("não inicia campanha sem grupo nem autorizações válidas", () => {
  assert.throws(() => selecionarDestinatarios({ contatos, grupos: [] }), /grupo/);
  assert.equal(selecionarDestinatarios({ contatos, grupos: ["clientes-mg"], canal: "whatsapp" }).totalAptos, 0);
});
test("filtra cidade sem incluir contato fora do público", () => {
  assert.equal(selecionarDestinatarios({ contatos, grupos: ["clientes-mg"], filtros: { cidade: "Caldas Novas" } }).totalAptos, 0);
});
test("cria texto individual, sem destinatários de outras pessoas", () => {
  const [destinatario] = selecionarDestinatarios({ contatos, grupos: ["clientes-mg"] }).elegiveis;
  const msg = prepararMensagem({ titulo: "Oferta de cimento", texto: "Confira a promoção da semana.", produtos: [{ nome: "Cimento 50 kg", preco: 34.50 }], canal: "email" }, destinatario);
  assert.match(msg.corpo, /Cliente A/);
  assert.match(msg.corpo, /R\$\s?34,50/);
  assert.match(msg.corpo, /SAIR/);
  assert.doesNotMatch(msg.corpo, /Cliente B/);
  assert.equal(msg.destino, "clientea@exemplo.com");
});
test("rejeita preço inválido", () => {
  assert.throws(() => prepararMensagem({ titulo: "Oferta", texto: "Veja", produtos: [{ nome: "Produto", preco: 0 }] }), /preço inválido/);
});
