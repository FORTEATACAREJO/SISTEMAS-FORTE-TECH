import {criarServidorApi} from "./api.mjs";
import {CentralMulticanal} from "./central.mjs";

// Ambiente de homologacao: todas as rotas privadas negam acesso ate
// a configuracao de um provedor de identidade validado no servidor.
// Nao aceitar identidade, papel ou tenant vindos de headers do cliente.
const central=new CentralMulticanal();
const server=criarServidorApi({
 central,
 authenticate:async()=>null,
 allowedOrigins:["https://forte-atende-homologacao.onrender.com"]
});
const port=Number(process.env.PORT||10000);
server.listen(port,"0.0.0.0",()=>{
 console.log("FORTE ATENDE API em homologacao: porta "+port+"; operacoes privadas bloqueadas");
});
