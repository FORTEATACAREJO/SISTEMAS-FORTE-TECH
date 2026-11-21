# Sistemas Forte Tech

Aplicação independente de Setor Fiscal Multiempresa, Portal do Contador, licenciamento comercial, integrações e automações com IA.

## Aplicação e testes

- Site e painel: `sft-preview/`
- Backend do checkout recorrente (Asaas Sandbox): `sft-billing/edge-functions/sft-billing-asaas-sandbox/`
- Testes dos adaptadores: `sft-integrations/tests/`
- Testar localmente: `npm test` (Node.js 24 ou superior)
- Implantação: [docs/INFRAESTRUTURA.md](docs/INFRAESTRUTURA.md)

## Infraestrutura existente

- Supabase exclusivo: `tusmlfhzwlzwnoxfhomt` (`setor_fiscal_forte_tech_empresas`)
- Serviço Render atual: `srv-dbqvomkipgvc73cv224g`
- Endereço atual: https://sistemas-forte-tech.onrender.com/
- Domínio pretendido: `sistemasfortetech.com.br` (verificação DNS/HTTPS pendente)

**Atenção:** o Render ainda usa o repositório legado até a conexão ser alterada pelo painel. O backend fiscal não está homologado para produção e o checkout de cartões permanece em Sandbox.

Não armazenar senhas, credenciais bancárias, certificados ou tokens de produção neste repositório.

## Produto Multiempresarial — serviço público independente (14/11/2026)

- Produto: **Multiempresarial**, um dos sistemas da Sistemas Forte Tech.
- Código para publicação separado em `multiempresarial/`.
- Endereço provisório: https://multiempresarial-forte-tech.onrender.com
- O banco permanece `tusmlfhzwlzwnoxfhomt`. Não transferir FORTECOMPANNY, FORTE FISCAL ou FORTE OPERACIONAL.
- Mensalidade planejada por CNPJ; preço a definir, sem contratos ou pagamentos ativos.
- [Plano de publicação e migração futura](multiempresarial/README.md).

## FORTE ATENDE — motor de integracoes multicanal (em homologacao)
- [Painel demonstrativo](forte-atende/painel.html) para e-mails, WhatsApp e campanhas, com historico e clientes ficticios.
- [Motor e APIs multiconexao](forte-atende/multicanal/README.md) para multiplas empresas, caixas de e-mail e numeros WhatsApp Business.
- Suportes programados: Gmail/Google Workspace, Microsoft 365, IMAP/SMTP (Hostinger e outros), WhatsApp Business Cloud API e BSP autorizados.
- Integracoes reais exigem autenticacao, cofre de segredos, banco persistente e autorizacoes dos provedores. Nao esta em producao.
