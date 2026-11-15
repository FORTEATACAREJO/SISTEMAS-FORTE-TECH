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

## IA prevista na assinatura e Sign in with ChatGPT (14/11/2026)

O plano único `SFT_FISCAL_MENSAL_NUVEM` já registra **IA prevista na oferta**, sem preço nem ativação. O Supabase possui as colunas `ai_included_in_offer`, `ai_activation_status`, `chatgpt_signin_status`, `chatgpt_plan_usage_enabled`, `ai_execution_enabled` e `chatgpt_user_consent_required`. A migração foi aplicada e não alterou licenças, clientes, chaves, métodos de pagamento nem as tabelas fiscais.

`commercial-config.json` e `config/product.json` refletem o estado comercial. O site apresenta a integração como **pendente de aprovação**, sem oferecer botão OAuth falso.

A mensalidade do Multiempresarial é uma cobrança própria da FORTE, separada da assinatura ChatGPT individual. Sign in with ChatGPT para SaaS comercial depende de participação aprovada pela OpenAI e client ID próprio. O consentimento para entrar com ChatGPT e o consentimento para usar o plano ChatGPT para IA são distintos. **Não** utilizar o fluxo de registro destinado a ferramentas open-source locais para contornar a aprovação comercial.

Etapas e documentação: [INTEGRACAO_CHATGPT_IA.md](INTEGRACAO_CHATGPT_IA.md).

## Pilar principal: criação de sistemas e módulos pelo próprio usuário (15/11/2026)

O **Construtor Inteligente** não se limita a relatórios. A função principal prevista é permitir que usuários sem conhecimento de programação descrevam em português a criação de **sistemas próprios completos**, **módulos adicionais**, telas, formulários, fluxos, dashboards e relatórios, com apoio de IA.

- **Módulo interno:** instalado apenas no ambiente da empresa autorizada e integrado ao menu do Multiempresarial, preservando RLS e licenças.
- **Sistema próprio:** aplicativo personalizado com configuração, identidade, permissões e possível domínio/repositório/ambiente próprios após autorização e provisionamento controlado.
- **Processo:** descrever ideia → analisar requisitos → gerar arquitetura/definição validada → prévia de homologação → testes e aprovação do responsável → publicar → manter versões e rollback.
- **Restrições:** não permitir que IA execute código livre, crie banco arbitrariamente ou altere em produção o motor fiscal, sistemas de outras empresas, meios de pagamento ou credenciais.
- **Monetização:** assinatura base Multiempresarial, opções futuras por módulo ou sistema adicional e IA Forte por consumo; valores ainda não definidos. A utilização opcional do plano ChatGPT individual depende de aprovação e das regras OpenAI.

Especificação completa: [PROPOSTA_CONSTRUTOR_SISTEMAS_MODULOS.md](PROPOSTA_CONSTRUTOR_SISTEMAS_MODULOS.md). A implementação e a publicação dessas funções ainda **não** foram realizadas; a página pública atual permanece em homologação.
