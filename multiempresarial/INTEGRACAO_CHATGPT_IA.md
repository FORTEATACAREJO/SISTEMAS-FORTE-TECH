# Multiempresarial — IA integrada à assinatura e Sign in with ChatGPT

**Titular:** Forte Atacarejo Ltda. — Sistemas Forte Tech. **Produto:** Multiempresarial, técnico `SFT_SETOR_FISCAL`.

## Decisão de produto

A mensalidade **Multiempresarial — Nuvem Compartilhada** incluirá, quando homologadas, funcionalidades assistidas por IA. O preço ainda é `NULL` no Supabase e nenhuma cobrança está habilitada. Não foi criada assinatura ChatGPT para os clientes; seu eventual plano ChatGPT é independente da mensalidade Multiempresarial.

- IA prevista para orientar cadastros, sugerir classificação tributária para revisão humana, explicar regras com fontes e auxiliar na conciliação; não substitui contador nem aprovação fiscal.
- Sign in with ChatGPT é um método de autenticação opcional, sujeito à aprovação da OpenAI para aplicativos comerciais.
- O acesso a *uso do plano ChatGPT para solicitações de IA* é autorização **separada**, exige usuário elegível, escopos autorizados e limites do plano. Não fornece acesso a conversas, memória ou chaves OpenAI do cliente.
- A sessão empresarial e o vínculo ao CNPJ devem continuar sendo geridos pela plataforma, com autorização por empresa/estabelecimento, jamais pelo login OpenAI isolado.
- Nenhuma inferência, login ChatGPT, vinculação de conta ou transferência de dados está ativa. **Não cadastrar segredos, tokens ou chaves no GitHub.**

## Estado implantado — controles técnicos

Supabase `tusmlfhzwlzwnoxfhomt`, tabela `sft_recurring_plans`, plano `SFT_FISCAL_MENSAL_NUVEM`:

- `ai_included_in_offer=true` — previsto na oferta, não equivale a execução.
- `ai_activation_status=PENDENTE_HOMOLOGACAO`.
- `chatgpt_signin_status=AGUARDANDO_APROVACAO`.
- `chatgpt_plan_usage_enabled=false`.
- `ai_execution_enabled=false`.
- `chatgpt_user_consent_required=true`.
- `amount_cents=NULL`, `availability=PRECIFICACAO_PENDENTE`.

Arquivos de interface: `index.html`, `admin.html`, `commercial-config.json`, `config/product.json`.

## Implementação posterior à aprovação

1. Solicitar aprovação como **parceiro comercial** e receber `client_id`, documentação/escopos e URLs de callback registradas: https://openai.com/form/sign-in-with-chatgpt-interest/.
2. Escolher endpoint de callback **seguro no backend** (não usar apenas hospedagem estática); cadastrar a URL HTTPS exata nas configurações fornecidas pela OpenAI. Manter `client_secret` e tokens somente em armazenamento protegido.
3. Implementar OAuth 2.0 Authorization Code com PKCE S256, state, nonce, JWKS e validação `iss`, `aud`, `exp`, `sub` do ID Token; estado de uso único com expiração; session cookies seguras; revogação, auditoria e tratamento de erros.
4. Vincular a conta OpenAI somente depois da autenticação existente no Multiempresarial e permissão por CNPJ. Não conceder acesso a empresa por e-mail coincidente. Pedir consentimento separado para dados de perfil e para uso do plano de IA.
5. Se o aplicativo for autorizado a utilizar o plano ChatGPT do usuário, configurar escopos Responses API, limites e verificação de elegibilidade; sem aprovação, disponibilizar apenas recursos aprovados em arquitetura própria, mediante orçamento.
6. Homologar com usuários e empresas de teste: acesso, trocas de CNPJ, consentimentos negados, revogação, expiração, CSRF, logs, custo e *nenhum* vazamento entre empresas.
7. Somente depois de homologação, liberar botão `Continue with ChatGPT` seguindo as diretrizes de marca da OpenAI e atualizar campos de ativação no banco.

**Sem aprovação OpenAI, não pode ser declarado como integrado operacionalmente.** O código atual apenas prepara a contratação e informa seu estado.

## Referências oficiais
- https://developers.openai.com/siwc/website
- https://developers.openai.com/siwc/request-client-id
- https://help.openai.com/en/articles/20001542-using-your-chatgpt-plan-in-other-apps-and-sites
- https://developers.openai.com/siwc/ui-ux-guidelines
