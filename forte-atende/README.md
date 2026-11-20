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
