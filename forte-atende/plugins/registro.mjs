/**
 * Catalogo de plugins nativos do FORTE ATENDE.
 * Os manifests descrevem capacidades implementadas NO CODIGO.
 * "disponivel" nao significa que a conta do usuario esteja conectada.
 */
import { PROVEDORES } from "../multicanal/catalogo.mjs";

export const PLUGINS = Object.freeze([
  Object.freeze({
    id:"gmail", nome:"Gmail / Google Workspace", provider:"gmail-api", canal:"email",
    familia:"Google", autenticacao:"oauth2", icone:"mail",
    descricao:"Ler a caixa autorizada, criar respostas e enviar pela API Gmail.",
    recursos:["receber","responder","enviar","pesquisar"],
    escopos:["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send"],
    situacaoCodigo:"adaptador_implementado",
    dependencias:["Google Cloud OAuth client","consentimento do titular","cofre de tokens","OAuth callback no servidor"],
    referencia:"https://developers.google.com/workspace/gmail/api/auth/web-server"
  }),
  Object.freeze({
    id:"whatsapp-business", nome:"WhatsApp Business — Meta Cloud API", provider:"whatsapp-cloud", canal:"whatsapp",
    familia:"Meta", autenticacao:"meta-business", icone:"message-circle",
    descricao:"Números Business oficiais, webhooks assinados, mensagens e templates homologados.",
    recursos:["receber","responder","enviar","templates"],
    escopos:["whatsapp_business_messaging","whatsapp_business_management"],
    situacaoCodigo:"adaptador_implementado",
    dependencias:["Meta Business Account","Phone Number ID","app autorizado","token em cofre","webhook HMAC"],
    referencia:"https://developers.facebook.com/documentation/business-messaging/whatsapp/overview"
  }),
  Object.freeze({
    id:"microsoft365", nome:"Outlook / Microsoft 365", provider:"microsoft-graph", canal:"email",
    familia:"Microsoft", autenticacao:"oauth2", icone:"mail",
    descricao:"Conectar caixas Microsoft 365 ou Outlook via Microsoft Graph.",
    recursos:["receber","responder","enviar"],
    escopos:["Mail.Read","Mail.Send","offline_access"],
    situacaoCodigo:"adaptador_implementado",
    dependencias:["App Registration Entra ID","consentimento OAuth","cofre de tokens"],
    referencia:"https://learn.microsoft.com/graph/outlook-create-send-messages"
  }),
  Object.freeze({
    id:"email-imap", nome:"E-mail corporativo IMAP/SMTP", provider:"imap-smtp", canal:"email",
    familia:"E-mail", autenticacao:"servidor-tls", icone:"inbox",
    descricao:"Hostinger, Zoho e servidores de e-mail compatíveis com IMAP e SMTP seguros.",
    recursos:["receber","responder","enviar"],
    escopos:[],
    situacaoCodigo:"adaptador_implementado",
    dependencias:["servidores IMAP/SMTP seguros","credenciais no cofre","TLS","bibliotecas servidor"],
    referencia:"https://imapflow.com/docs/"
  }),
  Object.freeze({
    id:"whatsapp-parceiro", nome:"WhatsApp Business por parceiro oficial", provider:"whatsapp-bsp", canal:"whatsapp",
    familia:"BSP", autenticacao:"provedor-autorizado", icone:"message-circle",
    descricao:"Extensão para provedores WhatsApp Business oficiais, com credenciais próprias.",
    recursos:["receber","responder","enviar"],
    escopos:[],
    situacaoCodigo:"interface_extensivel",
    dependencias:["adaptação da API do BSP escolhido","conta e número autorizados","webhook assinado"],
    referencia:"https://developers.facebook.com/documentation/business-messaging/whatsapp/overview"
  })
]);

const indice = new Map(PLUGINS.map(p=>[p.id,p]));
if (PLUGINS.some(p=>!PROVEDORES[p.provider])) throw new Error("Plugin cadastrado sem adaptador declarado");

export function obterPlugin(id) {
  return indice.get(String(id??""))??null;
}
export function listarPlugins({canal}={}) {
  return PLUGINS.filter(p=>!canal||p.canal===canal).map(p=>({...p,recursos:[...p.recursos],escopos:[...p.escopos],dependencias:[...p.dependencias]}));
}
