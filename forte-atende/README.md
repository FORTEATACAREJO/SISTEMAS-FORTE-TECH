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
