// Identificacao conservadora da caixa corporativa originalmente enderecada.
// Util para mensagens recebidas por encaminhamento no Gmail central.
// Nao concede permissao de envio nem acessa Gmail/Hostinger por conta propria.
export const CAIXAS_FORTE = Object.freeze([
  "gerencia@forteatacarejo.com.br",
  "contato@forteatacarejo.com.br",
  "orcamentos@forteatacarejo.com.br"
]);

function enderecos(value) {
  const raw = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return (raw.match(/[a-zA-Z0-9.!#$%&'*+/=?^`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).map(e => e.toLowerCase());
}
export function identificarCaixaOriginal({ to = [], cc = [], originalTo = [] } = {}) {
  const valores = [...new Set([...enderecos(to), ...enderecos(cc), ...enderecos(originalTo)])];
  const encontradas = CAIXAS_FORTE.filter(e => valores.includes(e));
  if (encontradas.length === 1) return { estado: "identificada", caixa: encontradas[0], candidatas: encontradas };
  if (encontradas.length > 1) return { estado: "revisao_humana", caixa: null, candidatas: encontradas };
  return { estado: "origem_desconhecida", caixa: null, candidatas: [] };
}
export function avaliarIdentidadeDeResposta(caixa, configuracaoEmail) {
  const acesso = configuracaoEmail?.mailboxes?.find(x => x.address === caixa);
  if (!acesso) return { liberado: false, motivo: "endereco_nao_reconhecido" };
  if (acesso.direct_hostinger_access_verified !== true || acesso.send_as_verified !== true)
    return { liberado: false, motivo: "identidade_de_envio_nao_validada" };
  return { liberado: true, motivo: "identidade_verificada_para_rascunho" };
}
// Retornar liberado aqui significa apenas que a identidade foi previamente verificada,
// NAO autoriza enviar mensagens: a API ainda exige aprovacao humana, sessao e auditoria.
