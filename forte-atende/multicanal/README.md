# FORTE ATENDE — Motor Multicanal e Multiempresa

Este código prepara a central para receber múltiplas contas por empresa e para adicionar novos provedores sem reescrever o atendimento. Não existe dependência fixa de um domínio ou número da Forte.

## Canais e conectores

| Provedor | Conta | Entrada | Saída | Estado do código |
| --- | --- | --- | --- | --- |
| gmail-api | Gmail e Google Workspace | API Gmail | API Gmail | Adaptador OAuth programado |
| microsoft-graph | Outlook e Microsoft 365 | API Graph | API Graph | Adaptador OAuth programado |
| imap-smtp | Hostinger, Zoho, e-mails corporativos e servidor próprio | IMAP seguro | SMTP seguro | Transporte programado com dependências instaladas no backend |
| whatsapp-cloud | Número WhatsApp Business autorizado na Meta | Webhook HMAC SHA-256 | Graph API Meta | Adaptador + normalização do webhook programados |
| whatsapp-bsp | Números Business ligados a BSP oficial | Webhook específico | API específica | Interface extensível; cada BSP requer adaptador autenticado |

**Limite essencial:** WhatsApp comum/pessoal não oferece acesso genérico via esta API. Não tentar automatizar logins com QR Code, sessões web não oficiais ou aparelhos de terceiros. Cada número precisa de autorização na Meta Business Platform ou em BSP homologado.

## Arquitetura

- catalogo.mjs: provedores, validação de identidade e cadastro seguro, sem tokens.
- central.mjs: segregação por empresa, múltiplas contas, recebimento idempotente, sincronização de e-mail, caixa de entrada, rascunhos, aprovação humana e envio com reserva anti-repetição.
- adaptadores.mjs: chamadas de leitura/envio para Gmail/Graph/Meta e interface para transportes extras. Não executa chamadas sem credenciais no backend.
- transporte-imap-smtp.mjs: driver IMAP/SMTP TLS (IMAP 993, SMTP 465/587), exige bibliotecas e remetente validado no cofre.
- webhook-meta.mjs: autenticação HMAC da requisição bruta e roteamento pelo Phone Number ID sem misturar empresas.
- api.mjs: API REST criada mas não publicada. Exige authenticate(req) seguro da aplicação host; nunca aceita tenantId do navegador como fonte de verdade.
- schema.sql: esquema PostgreSQL e RLS apenas preparados, não executados. Não tocar FORTE FISCAL.
- multicanal.test.mjs e api.test.mjs: testes com provedores simulados, sem disparos externos.

O banco de dados real deve usar migração revisada e filas com transações para preservar a deduplicação em múltiplas instâncias. MemoriaDeHomologacao é apenas para desenvolvimento e testes.

## Rotas planejadas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | /api/provedores | Lista de conectores disponíveis |
| GET | /api/conexoes | Contas da empresa autenticada, sem revelar secretRef |
| POST | /api/conexoes | Registra conta pendente de verificação |
| POST | /api/conexoes/:id/verificar | Valida identidade e permissões via provedor |
| POST | /api/conexoes/:id/sincronizar | Consulta mensagens da conta autorizada |
| GET | /api/mensagens?connectionId=... | Caixa isolada da empresa |
| POST | /api/rascunhos | Prepara resposta |
| POST | /api/rascunhos/:id/aprovar | Aprovação por Master/Admin |
| POST | /api/rascunhos/:id/enviar | Envia após aprovação e conexão verificada |
| POST | /webhooks/meta | Receptor opcional com assinatura verificada, sem substituir gateway existente |

Tokens OAuth, senhas IMAP/SMTP, App Secret e referências Meta permanecem em cofre segregado por empresa e conexão. A API hospedeira deve injetar autenticador, vault e store durável.

## Exemplo de integração

O projeto host fornece authenticate, resolveSecret, banco persistente e configuração de provedores.

- criarAdaptadores({resolveSecret, fetcher: fetch, imapSmtpTransport: transport, webhookVerificado: checker})
- new CentralMulticanal({store: durableStore, adapters})
- criarServidorApi({central, authenticate, allowedOrigins: [origemDaAplicacao], metaWebhook: handlerHmac})

O handlerHmac chama receberWebhookMeta após validar appSecret. Não criar um segundo callback Meta que substitua forte-whatsapp-api já utilizado pelo Operacional e Fiscal. A inclusão de outros números deve ser testada sem impacto nos existentes.

## Pendências de produção

1. Implementar e revisar autenticação do sistema, sessão e perfis, e resolver segredos por tenantId/connectionId.
2. Instalar e fixar dependências dos protocolos IMAP/SMTP no backend; criar OAuth Google/Microsoft, renovação e revogação seguras.
3. Aplicar migração em banco específico e rever RLS, CAS para filas e auditoria.
4. Validar cada número e modelo na Meta. Para WhatsApp fora da janela de atendimento ou campanhas, usar templates autorizados e consentimento.
5. Implantar opt-out, prova de consentimento, limites de frequência, envio de marketing por provedor dedicado e LGPD.
6. Vincular a UI atual ../painel.html à API após testes E2E com cada conta e empresa.

Status: código-fonte de programação/homologação. NÃO significa que integrações estão operando em produção.

## Documentação oficial
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- https://learn.microsoft.com/graph/api/user-sendmail?view=graph-rest-1.0
- https://developers.facebook.com/documentation/business-messaging/whatsapp/overview
- https://imapflow.com/docs/

### Cadastro de plugins no Operacional

O servidor Render usa a sessão Supabase existente da Caixa Real e consulta o mesmo acesso ao
módulo de vendas. A migração `20261122130000_forte_atende_plugin_registros.sql` cria apenas o
cadastro pendente com políticas de leitura pela empresa e escrita por administrador. Um cadastro
pendente não recebe token, senha nem flags de envio ou recebimento.

No serviço `forte-atende-api-homologacao`, configure `FORTE_ATENDE_SUPABASE_URL`,
`FORTE_ATENDE_SUPABASE_PUBLISHABLE_KEY` e `FORTE_ATENDE_PLUGIN_REGISTRY=on` depois de aplicar
a migração no projeto autorizado. Use a chave publicável do mesmo projeto da URL. O painel só usa a sessão desse projeto.
A branch de homologação aceita sessões de teste e permanece isolada do login principal.
Para desativar o cadastro, remova `FORTE_ATENDE_PLUGIN_REGISTRY`. O servidor mantém as rotas
de envio fora deste serviço e a autorização dos provedores continua indisponível.

Rode `node --test forte-atende/plugins/*.test.mjs` para verificar o fluxo HTTP usando um
Operacional simulado, incluindo isolamento, duplicatas, sessão inválida e bloqueio de ativação.
