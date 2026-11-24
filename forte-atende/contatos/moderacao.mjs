// Regras puras: nenhuma chamada à Meta, exclusão de mensagens ou escrita no banco.
export function normalizarTelefone(valor) {
 const digits = String(valor ?? "").replace(/\D/g, "");
 const full = digits.startsWith("55") ? digits : (digits.length === 10 || digits.length === 11 ? "55"+digits : digits);
 if (!/^[1-9][0-9]{7,14}$/.test(full)) throw Error("Telefone inválido");
 return "+"+full;
}
export function decisaoContato({status,telefone,clienteExistente=false}) {
 const e164 = normalizarTelefone(telefone);
 if (!["ativo","descartado","bloqueado"].includes(status)) throw Error("Situação inválida");
 return Object.freeze({telefone_e164:e164,status,exibirCaixaPrincipal:status!=="bloqueado" && status!=="descartado",receberEArmazenar:true,notificar:status==="ativo",requerConfirmacao:status!=="ativo",verificarDuplicidade:clienteExistente});
}
