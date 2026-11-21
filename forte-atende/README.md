# FORTE ATENDE

Central de atendimento inteligente da Forte Atacarejo. Primeiro canal: e-mail corporativo Hostinger. Integrações futuras: FORTE IA, WhatsApp Business e FORTE ATACAREJO OPERACIONAL (consulta somente-leitura).

## Registro inicial — 20/11/2026
- Origem: `contato@forteatacarejo.com.br` (Hostinger Mail).
- Pasta criada na caixa: `INBOX.FORTE ATENDE`.
- Arquivo de e-mails encaminhados: `entradasforteatacarejo@gmail.com` (confirmar teste ponta a ponta).
- Evento disponível na API Hostinger: `message.received`. Nenhum webhook foi criado até este registro.
- Fluxo pretendido: chegada -> registro idempotente -> triagem -> sugestão pela IA -> revisão humana -> resposta via Hostinger.
- Não habilitar resposta automática na fase inicial.
- Contas Gerência e Orçamentos devem ter autenticação independente validada antes de uso.
- Isolar dados, segredos, permissões e logs dos sistemas de emissão fiscal.

## Próxima implementação
1. Modelo de dados e permissões.
2. Endpoint seguro para webhooks e evento `message.received`.
3. Leitura de conversas e classificação.
4. Fila para revisão humana.
5. Interface do painel e testes de homologação.

Rastreamento: https://github.com/FORTEATACAREJO/SISTEMAS-FORTE-TECH/issues/7

**Aviso:** este diretório contém planejamento inicial, não prova que webhook, IA ou automação estejam operando.


## Campanhas Promocionais — Listas de Transmissão
- [Interface demonstrativa](campanhas.html), com cinco contatos inteiramente fictícios.
- [Motor de seleção e prévia](campanhas/core.mjs), com testes em [core.test.mjs](campanhas/core.test.mjs).
- O usuário escolhe um ou mais grupos e pode filtrar cidade/perfil, compor oferta com produto, preço e validade, conferir elegíveis e preparar rascunho.
- Cada destino recebe individualmente no futuro. O nome "grupo" refere-se à lista interna, **nunca** grupo público em que clientes veem outros contatos.
- Critérios de exclusão já codificados na preparação: destinatário inativo, sem permissão explícita registrada no contato para o canal, opt-out, endereço inválido e e-mail/telefone duplicado.
- Status **somente homologação**: botão de enviar desabilitado, nenhum contato real carregado e nenhum envio disparado.
- Botão "Baixar rascunho" exporta somente a estrutura da campanha e quantidades (não exporta destinatários).

### Requisitos antes de habilitar o envio real
1. Persistir grupos e consentimentos/permissões por canal em banco protegido (não usar os exemplos da prévia). Registrar fonte, data, base legal e versão do aceite; atender oposição/descadastro.
2. Restringir criação e aprovação a perfis autorizados, trilha de auditoria e prévia antes de disparar.
3. Enfileirar um trabalho idempotente por destinatário e campanha, com limites por hora, proteção contra repetição e supressão centralizada.
4. Hospedar endpoint seguro, usar provedor de marketing em conformidade com suas regras e não a caixa de e-mail de atendimento para milhares de mensagens.
5. Enviar e-mails individuais; WhatsApp somente com Business API oficial, consentimento adequado, políticas e templates aprovados quando necessários.
6. Confirmar integração, webhooks de entrega e falhas, processamento de SAIR e relatório de resultados; só então liberar botão de envio.
7. Testar fim a fim em homologação com contas controladas e autorizações.

Referência de desenvolvimento: https://github.com/FORTEATACAREJO/SISTEMAS-FORTE-TECH/issues/8

Fontes para implantação:
- [Hostinger — envio em massa](https://www.hostinger.com/support/1583510-is-mass-mailing-supported-at-hostinger/)
- [Hostinger — diferença entre Reach e Business Email](https://www.hostinger.com/support/hostinger-reach-and-business-email-whats-the-difference-and-why-you-need-both/)
- [ANPD — legítimo interesse e LGPD](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse)

## Painel integrado de atendimento — prévia de layout
- [Abrir interface (HTML)](painel.html) — visualização lado a lado, **e-mail à esquerda e WhatsApp à direita (50/50)** em telas amplas.
- Listas de mensagens e conversas independentes, filtros, busca, leitura, marcação de favoritas, respostas e rascunhos locais.
- Botão Campanhas: selecionar grupos fictícios e montar prévia promocional; disparo desabilitado.
- Navegação responsiva: no celular alternar entre as abas E-mail e WhatsApp e abrir/fechar a conversa selecionada.
- **Somente dados fictícios**, sem credenciais embutidas, sem envio de e-mails ou WhatsApp, sem consulta ao provedor, sem persistência de dados.
- A interface foi conferida no navegador em desktop e celular, com testes manuais de preparação de campanhas, rascunho de e-mail, rascunho de mensagem e navegação responsiva. Integrações reais seguem pendentes.

## Identidade visual aprovada — 20/11/2026
O usuário aprovou o ícone FORTE ATENDE que integra visualmente os símbolos de WhatsApp e Gmail em um único quadrado arredondado, com transição verde, turquesa e branco e assinatura FORTE ATENDE. Este é o padrão visual a ser adotado na interface, PWA, favicon, instalação em dispositivos e materiais de apresentação.

Arquivos-fonte e versões quadradas (512 e 192 px) foram preparados como artefatos da conversa, **mas ainda precisam ser adicionados como arquivos binários ao repositório**. Não substituir a arte aprovada por uma recriação aproximada. Validar o uso das marcas de terceiros conforme suas respectivas diretrizes antes de distribuir comercialmente.

## Canais escolhidos para integração — 20/11/2026
- [Configuração não secreta em homologação](config/canais-homologacao.json).
- WhatsApp oficial indicado: **+55 (64) 99917-2700**, números de referência da Meta registrados anteriormente: WABA **1081614524680450**, Phone Number ID **1278417945364665**, Meta App **FORTE ATACAREJO APP**. O usuário afirma que o número é aprovado, mas **não foi verificado acesso atual à Meta Developers nem status de registro operacional ao vivo nesta etapa**.
- O gateway compartilhado **forte-whatsapp-api** e `order-communications` existem no FORTE ATACAREJO OPERACIONAL. Reutilizar sem substituir o callback, sem alterar segredos nem quebrar integrações existentes, especialmente Fiscal.
- **E-mails corporativos:** `gerencia@forteatacarejo.com.br`, `contato@forteatacarejo.com.br`, `orcamentos@forteatacarejo.com.br`; todos têm encaminhamento de teste recebido na caixa Gmail central. A conexão Hostinger disponível neste chat ainda dá acesso direto somente à caixa Contato. `emails@forteatacarejo.com.br` foi somente um exemplo, não será criado.
- Gmail conectado selecionado para arquivo e encaminhamentos: **entradasforteatacarejo@gmail.com**. Não usar como identidade de envio do canal corporativo.
- A tela [painel.html](painel.html) foi atualizada para exibir o número e sinalizar a integração pendente, mas **não lê mensagens reais da Meta nem inicia envios**.
- Antes da ativação: validar Phone Number ID/WABA e permissões por chamada Meta autorizada, confirmar webhook e eventos, sessão e RLS, autenticação Hostinger, testagem ponta a ponta autorizada, campanhas com opt-in e templates de marketing aprovados.
- Comando local de verificação: `node --test forte-atende/config/canais.test.mjs forte-atende/campanhas/core.test.mjs`.

## Esclarecimento sobre a expressão E-mails — 20/11/2026
- O usuário esclareceu que `emails@forteatacarejo.com.br` era apenas um exemplo, não uma conta a criar ou cadastrar.
- Canal corporativo comprovadamente conectado: `contato@forteatacarejo.com.br` (Hostinger Mail).
- `entradasforteatacarejo@gmail.com` permanece conta de arquivo/recebimento dos encaminhamentos; os três e-mails de teste recebidos em 20/11/2026 (um para cada caixa) foram localizados e tiveram o cabeçalho `Delivered-To: entradasforteatacarejo@gmail.com` conferido.
- Na interface, exibir a seção genérica **E-mails**, com a caixa operacional conectada identificada. Não criar endereços novos por inferência.
- A configuração não libera envios em massa nem conexão Meta, que permanecem pendentes de homologação.

## Arquitetura de três caixas com um arquivo central — 20/11/2026
**Endereços corretos (conferidos nas mensagens de teste reais recebidas pelo Gmail):**
- Gerência: `gerencia@forteatacarejo.com.br`
- Contato: `contato@forteatacarejo.com.br`
- Orçamentos: `orcamentos@forteatacarejo.com.br`
- Destino central de encaminhamentos: `entradasforteatacarejo@gmail.com`.

No Gmail central foram encontradas três mensagens intituladas `TESTE FORTE ATACAREJO — Encaminhamento Hostinger 1/3`, `2/3` e `3/3` de 20/11/2026, cada uma endereçada à caixa correspondente. Todas chegaram ao endereço Gmail central conforme cabeçalho Delivered-To. Isso comprova o **teste realizado**, não garante entregabilidade contínua futura.

**Separar dois conceitos no FORTE ATENDE:**
1. **Entrada:** uma caixa central do Gmail recebe os encaminhamentos, preservando `To` original e origem do atendimento. Identificar cada conversa como Gerência, Contato ou Orçamentos; em caso de destinatário original ambíguo, pedir triagem humana, não adivinhar.
2. **Saída:** responder a partir da mesma identidade corporativa que recebeu a mensagem, **apenas quando a conexão Hostinger específica estiver autorizada e verificada**. Hoje as conexões chamadas Gerência/Orçamentos retornaram a caixa Contato; não tratá-las como autorização de envio `From: gerencia@` ou `From: orcamentos@`.

A [configuração não secreta](config/canais-homologacao.json) registra os três canais, o Gmail central, a confirmação de teste e as limitações de envio. Nenhum token, senha ou endereço fictício é usado como remetente.

### Preparação de roteamento
- [Identificação do destinatário original](email/roteamento.mjs) e [testes](email/roteamento.test.mjs): classificar `To`/`Cc` de mensagens encaminhadas pelo Gmail central como Gerência, Contato ou Orçamentos.
- Se duas caixas corporativas forem destinatárias da mesma mensagem, ou o endereço original não estiver visível, manter em **triagem humana**, sem escolher um remetente automaticamente.
- A função de elegibilidade da identidade de resposta é apenas uma conferência local. **Não envia mensagens**, não substitui autorização de operador e não modifica configurações das contas Hostinger.
- O workflow de testes incluiu os cenários de roteamento, além das validações das campanhas e dos canais.

## Prévia interativa de três contas — 20/11/2026
- [Painel HTML](painel.html): arquivo autocontido com ícone aprovado incorporado e aparência mais vibrante.
- Visual desktop 50% E-mails/50% WhatsApp; mobile alterna abas e abre detalhes sem rolagem horizontal.
- Filtros funcionais por `Gerência`, `Contato` e `Orçamentos`; cada conversa fictícia indica a caixa de destino.
- Ao preparar uma resposta, o formulário sugere o mesmo remetente; as identidades Gerência e Orçamentos exibem aviso de que o envio independente ainda não foi validado. Todas as respostas são apenas rascunhos locais.
- Simulação de conversa WhatsApp, nova conversa fictícia e prévia de campanha; nenhum envio externo nem dados reais.
- Testado em navegador Chromium (1600×900 desktop e 390×844 celular): seleção por setor, rascunho de resposta, campanhas, nova conversa e navegação responsiva, sem erros JavaScript na sequência conferida.
- **Não confundir esta interface demonstrativa com integração de produção.** A leitura centralizada efetiva e o envio real ainda dependem de backend seguro, credenciais/autorizações e homologação.

## Plugins de integração — 20/11/2026
Catálogo extensível de plugins internos do FORTE ATENDE, com manifests separados e gerenciamento por empresa:
- Gmail/Google Workspace: plugins/gmail/plugin.json; API Gmail com OAuth 2.0.
- WhatsApp Business Meta Cloud API: plugins/whatsapp-business/plugin.json; Meta Developers, Phone Number ID e webhook HMAC.
- Outlook/Microsoft 365: plugins/microsoft365/plugin.json; Entra ID e Microsoft Graph.
- Hostinger e outros e-mails corporativos: plugins/email-imap/plugin.json; IMAP/SMTP TLS.
- WhatsApp por BSP autorizado: plugins/whatsapp-parceiro/plugin.json; interface de extensão, precisa de implementação específica para cada parceiro.

A tela integracoes.html abre a partir de painel.html. Em modo demonstrativo, mostra requisitos e formulário, mas não grava senhas nem ativa contas. Hospedeiro pode injetar window.FORTE_ATENDE_PLUGIN_CLIENT autenticado para criar conexões pendentes.

API autenticada em multicanal/api.mjs:
- GET /api/plugins: lista plugins e conexões da empresa;
- POST /api/plugins/instalar: registra conta pendente sem tokens no navegador;
- POST /api/plugins/conexoes/:id/autorizar: devolve URL OAuth se broker seguro estiver configurado;
- POST /api/plugins/conexoes/:id/verificar: verifica identidade e permissões no provedor.

Arquivos principais: plugins/registro.mjs, plugins/gerenciador.mjs e plugins/plugins.test.mjs.

Limites: plugins INTERNOS do FORTE ATENDE, não plugins publicados no diretório do ChatGPT. Integração real depende de backend autenticado, cofre de segredos, credenciais oficiais e testes. Nenhum envio externo ou mudança no webhook compartilhado do Fiscal foi feito. WhatsApp pessoal não é compatível automaticamente com Cloud API Business.
