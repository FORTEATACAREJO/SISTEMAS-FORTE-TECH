// FORTE ATENDE — motor puro de preparação de campanhas.
// Não envia mensagens: envio exige backend autorizado, opt-out, filas e provedor habilitado.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9]\d{9,14}$/;
const clean = (v) => String(v ?? "").trim();
const low = (v) => clean(v).toLocaleLowerCase("pt-BR");

export function selecionarDestinatarios({ contatos, grupos, canal = "email", filtros = {} }) {
  if (!Array.isArray(contatos)) throw new TypeError("Contatos devem ser uma lista.");
  if (!Array.isArray(grupos) || !grupos.length) throw new Error("Selecione pelo menos um grupo.");
  if (!["email", "whatsapp"].includes(canal)) throw new Error("Canal não suportado.");
  const selecionados = new Set(grupos.map(low).filter(Boolean));
  if (!selecionados.size) throw new Error("Selecione um grupo válido.");
  const elegiveis = [], excluidos = { foraDosGrupos: 0, filtros: 0, inativo: 0, semPermissao: 0, descadastrado: 0, enderecoInvalido: 0, duplicado: 0 };
  const jaVistos = new Set();
  for (const cliente of contatos) {
    const gruposContato = (Array.isArray(cliente.grupos) ? cliente.grupos : []).map(low);
    if (!gruposContato.some(g => selecionados.has(g))) { excluidos.foraDosGrupos++; continue; }
    if (["cidade","uf","segmento"].some(campo => clean(filtros[campo]) && low(cliente[campo]) !== low(filtros[campo]))) { excluidos.filtros++; continue; }
    if (cliente.ativo !== true) { excluidos.inativo++; continue; }
    if (cliente.descadastrado === true || (canal === "email" ? cliente.descadastroEmail === true : cliente.descadastroWhatsApp === true)) { excluidos.descadastrado++; continue; }
    if (canal === "email" ? cliente.permitePromocoesEmail !== true : cliente.permitePromocoesWhatsApp !== true) { excluidos.semPermissao++; continue; }
    const destino = canal === "email" ? low(cliente.email) : clean(cliente.telefone);
    if (!(canal === "email" ? EMAIL.test(destino) : PHONE.test(destino))) { excluidos.enderecoInvalido++; continue; }
    if (jaVistos.has(destino)) { excluidos.duplicado++; continue; }
    jaVistos.add(destino);
    elegiveis.push({ id: clean(cliente.id), nome: clean(cliente.nome), destino, canal, cidade: clean(cliente.cidade), uf: clean(cliente.uf) });
  }
  return { elegiveis, excluidos, totalContatos: contatos.length, totalAptos: elegiveis.length };
}

const dinheiro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function prepararMensagem({ titulo, texto, produtos = [], validade, canal = "email" }, destinatario) {
  if (!["email","whatsapp"].includes(canal)) throw new Error("Canal não suportado.");
  if (!clean(titulo) || !clean(texto)) throw new Error("Informe título e mensagem da campanha.");
  if (!Array.isArray(produtos)) throw new TypeError("Produtos inválidos.");
  if (produtos.length > 50) throw new Error("Campanha acima do limite de 50 produtos.");
  const linhas = produtos.map(prod => {
    if (!clean(prod.nome) || !Number.isFinite(Number(prod.preco)) || Number(prod.preco) <= 0) throw new Error("Produto ou preço inválido.");
    return "- " + clean(prod.nome) + ": " + dinheiro.format(Number(prod.preco));
  });
  const corpo = [
    "FORTE ATACAREJO — " + clean(titulo),
    clean(destinatario?.nome) ? "Olá, " + clean(destinatario.nome) + "!" : "Olá!",
    clean(texto),
    linhas.length ? "Produtos em destaque:\n" + linhas.join("\n") : "",
    clean(validade) ? "Validade informada: " + clean(validade) : "",
    "Preços, disponibilidade, frete e condições sujeitos à confirmação comercial.",
    "Para não receber mais promoções, responda SAIR."
  ].filter(Boolean).join("\n\n");
  return { canal, destino: clean(destinatario?.destino), assunto: "Forte Atacarejo | " + clean(titulo), corpo };
}

// O envio real NÃO faz parte deste módulo. A futura API de disparo deverá exigir
// autenticação por perfil, aprovação humana, consentimento verificável por canal,
// lista de supressão, idempotência persistente, rate limit e log por destinatário.
