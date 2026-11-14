# Infraestrutura — Sistemas Forte Tech

## Separação confirmada

Este repositório contém a cópia exata dos arquivos `sft-preview/`, `sft-billing/` e `sft-integrations/` da ramificação `site/sistemas-forte-tech-preview-20261112` do repositório FORTE-ATACAREJO-OPERACIONAL. Não importar diretórios ou segredos do FORTE FISCAL, FORTE OPERACIONAL ou MC-6.

### Supabase próprio

Projeto: `tusmlfhzwlzwnoxfhomt` — `setor_fiscal_forte_tech_empresas` (sa-east-1).

O banco **não foi duplicado**: o novo repositório continua usando o mesmo Supabase independente. Tabelas, RLS, chaves e funções seguem no projeto existente. Segredos somente no painel Supabase.

### Render existente

Serviço: `srv-dbqvomkipgvc73cv224g` (`sistemas-forte-tech`). Site estático com publicação de `sft-preview` e comando de build atual `echo 'Sistemas Forte Tech: arquivos estaticos preparados'`.

**Situação:** Render ainda lê `FORTEATACAREJO/FORTE-ATACAREJO-OPERACIONAL` na branch `site/sistemas-forte-tech-preview-20261112`. Para concluir o corte sem recriar o serviço:

1. No Render, abra https://dashboard.render.com/static/srv-dbqvomkipgvc73cv224g e conecte `FORTEATACAREJO/SISTEMAS-FORTE-TECH` na seção de repositório.
2. Defina branch `main`, diretório de publicação `sft-preview` e mantenha o comando de build atual.
3. Confira os logs e o deploy da nova origem, acessando `/admin.html`, `/contador.html` e `/`.
4. Mantenha os domínios já cadastrados no mesmo serviço Render. **Não** crie outro serviço pago ou remova `sistemas-forte-tech.onrender.com`.
5. Só depois da verificação de HTTPS de `sistemasfortetech.com.br`, autorize o Redirect URL correspondente no Supabase Auth.

A integração Render disponível não expõe a alteração do repositório de um serviço existente. A mudança de origem deve ser feita no Dashboard/Work e lida novamente no conector antes de ser considerada concluída.

### Cobrança

Edge Function `sft-billing-asaas-sandbox` já está no Supabase. O código fonte versionado não inclui chave da API nem webhook token. Ambiente exclusivamente Sandbox; não liberar cobrança real sem testes de cartão e homologação de todo o ciclo.

### Privacidade

**Revisar a visibilidade deste repositório no GitHub.** Deve ser privado antes de armazenar quaisquer informações técnicas sensíveis. Não usar dados de clientes nos testes de CI.
