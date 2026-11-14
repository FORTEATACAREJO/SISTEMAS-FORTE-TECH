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
