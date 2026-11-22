import { criarServidorApi } from "./api.mjs";
import { CentralMulticanal } from "./central.mjs";
import { criarIntegracaoOperacional } from "../plugins/operacional.mjs";
import { criarOAuth } from "../plugins/oauth.mjs";
import { GerenciadorPlugins } from "../plugins/gerenciador.mjs";

const site = "https://forte-atende-homologacao.onrender.com";

const registryEnabled = process.env.FORTE_ATENDE_PLUGIN_REGISTRY === "on";
const registryAuth = registryEnabled ? {
  url:process.env.FORTE_ATENDE_SUPABASE_URL,
  publishableKey:process.env.FORTE_ATENDE_SUPABASE_PUBLISHABLE_KEY
} : undefined;
const vaultGuard = process.env.FORTE_ATENDE_VAULT_GUARD;
const vaultConfigured = registryEnabled && /^[a-f0-9]{64}$/.test(vaultGuard ?? "");
const hospedagem = registryEnabled
  ? criarIntegracaoOperacional({...registryAuth,vaultGuard})
  : {central:new CentralMulticanal(),authenticate:async()=>null};

const oauthBroker = vaultConfigured ? criarOAuth({
  redirectUri:site+"/integracoes.html",
  cofre:hospedagem.cofre,
  config:{
    "gmail-api":{clientId:process.env.FORTE_ATENDE_GOOGLE_CLIENT_ID,clientSecret:process.env.FORTE_ATENDE_GOOGLE_CLIENT_SECRET},
    "microsoft-graph":{clientId:process.env.FORTE_ATENDE_MICROSOFT_CLIENT_ID,clientSecret:process.env.FORTE_ATENDE_MICROSOFT_CLIENT_SECRET}
  }
}) : null;
const pluginManager = new GerenciadorPlugins({central:hospedagem.central,oauthBroker});
const server = criarServidorApi({
  ...hospedagem,
  pluginsOnly:true,
  registryEnabled,
  registryAuth,
  pluginManager,
  vaultConfigured,
  providerAuthorization:oauthBroker?.disponiveis,
  allowedOrigins:[site]
});
const port = Number(process.env.PORT || 10000);
server.listen(port,"0.0.0.0",()=>{
  console.log("FORTE ATENDE API em homologação");
});
