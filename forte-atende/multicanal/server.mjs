import { criarServidorApi } from "./api.mjs";
import { CentralMulticanal } from "./central.mjs";
import { criarIntegracaoOperacional } from "../plugins/operacional.mjs";

const registryEnabled = process.env.FORTE_ATENDE_PLUGIN_REGISTRY === "on";
const hospedagem = registryEnabled
  ? criarIntegracaoOperacional({
      url:process.env.FORTE_ATENDE_SUPABASE_URL,
      publishableKey:process.env.FORTE_ATENDE_SUPABASE_PUBLISHABLE_KEY
    })
  : {central:new CentralMulticanal(),authenticate:async()=>null};

const server = criarServidorApi({
  ...hospedagem,
  pluginsOnly:true,
  registryEnabled,
  allowedOrigins:["https://forte-atende-homologacao.onrender.com"]
});
const port = Number(process.env.PORT || 10000);
server.listen(port,"0.0.0.0",()=>{
  console.log("FORTE ATENDE API em homologação");
});
