# Multiempresarial — Sistemas Forte Tech

**Produto:** Multiempresarial, integrante do portfólio da Sistemas Forte Tech. **Titular:** Forte Atacarejo Ltda.

## Site público independente

Render: `multiempresarial-forte-tech` → https://multiempresarial-forte-tech.onrender.com/.
Build estático, publishPath: `multiempresarial`, branch `main` do repositório `FORTEATACAREJO/SISTEMAS-FORTE-TECH`.

- `index.html`: vitrine pública sem autenticação e sem dados empresariais reais
- `admin.html`, `admin.js`: painel de empresas com autenticação Supabase e controle de licenças por empresa
- `contador.html`: redirecionamento para login autorizado do contador
- `manifest.webmanifest`, `sw.js`, `icon.svg`: PWA, instalador e compartilhamento; cache **apenas de recursos públicos**
- `config/product.json`: identidade comercial e preços ainda a definir, sem cobrança
- `tests/public.test.mjs`: invariantes de segurança e produto

## Banco e licenças

Preservamos o Supabase **existente** `tusmlfhzwlzwnoxfhomt` (50 tabelas com RLS), com o identificador técnico `SFT_SETOR_FISCAL`. Não foi criado outro banco e nenhuma empresa foi cadastrada automaticamente. O código legado da marca Sistemas Forte Tech continua disponível em `sft-preview/`.

O plano `SFT_FISCAL_MENSAL_NUVEM` já prevê mensalidade por cartão na nuvem compartilhada, mas ainda tem `amount_cents=NULL` e `availability=PRECIFICACAO_PENDENTE`. Checkout real bloqueado.

## Pendente antes do acesso empresarial completo

1. No Supabase Auth, adicionar Redirect URL `https://multiempresarial-forte-tech.onrender.com/admin.html`. **Sem a URL permitida, o login por link de e-mail não está homologado no novo endereço.**
2. Criar e verificar o primeiro usuário Master; homologar duas empresas fictícias com papéis distintos.
3. Homologar fiscal (MG, GO, demais UFs), contadores e segregação real. Não emitir NF-e/NFC-e nem cobrar até testar.
4. Após escolher o novo domínio, configurar DNS/HTTPS, adicionar URL de redirecionamento no Supabase e manter a URL Render como fallback.
5. Após aprovação de preço, migrar a publicação para repositório `MULTIEMPRESARIAL` dedicado, se desejado, preservando o banco Supabase e os dados por CNPJ.

**O site público representa homologação; não é liberação para produção fiscal.**
