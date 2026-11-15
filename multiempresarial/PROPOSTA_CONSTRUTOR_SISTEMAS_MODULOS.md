# MULTIEMPRESARIAL — PROPOSTA DE CONSTRUTOR DE SISTEMAS E MÓDULOS COM IA
**Titular:** Forte Atacarejo Ltda. | **Marca:** Sistemas Forte Tech
**Status:** visão funcional aprovada; não implementada nem habilitada em produção

## 1. Objetivo principal
Transformar o Multiempresarial em uma plataforma em que o usuário não desenvolvedor possa **criar o seu próprio sistema** ou adicionar **módulos sob medida** ao ambiente de sua empresa, falando com a IA em português. Relatórios e dashboards são apenas uma das classes de produtos gerados.

### Três opções no menu "Criar com IA"
1. **Novo sistema próprio**: aplicação sob medida, com nome, menus, perfis, tabelas, formulários, processos e, se autorizado, serviço/URL independente.
2. **Novo módulo para minha empresa**: funcionalidade adicionada ao menu Multiempresarial da empresa — por exemplo manutenção de frota, pedidos internos, controle de obras, CRM e aprovação de compras.
3. **Relatório, painel ou automação**: consultas autorizadas, gráficos, comparações e alertas programados.

## 2. Conversa guiada
A IA deve perguntar o mínimo necessário, em etapas curtas e reutilizando informações existentes: segmento, finalidade, quem utilizará o recurso, dados necessários, papéis/permissões, necessidade de integrar módulos existentes, infraestrutura preferida (nuvem, instalação local ou dedicada), custo, requisitos legais e critérios de conclusão.

O sistema produz uma **especificação verificável**, não código irrestrito: entidades e relacionamentos, formulários, páginas, fluxos, campos, validações, integrações permitidas, escopos e regras de autorização.

**Exemplo de intenção:** "Crie um sistema de assistência técnica para a minha empresa, com chamados, equipamentos, técnicos, estoque de peças e relatórios". A plataforma desenha o sistema, mostra protótipo, organiza testes e só publica após aprovação do usuário responsável.

## 3. Arquitetura proposta
- **Control plane** Multiempresarial: gestão de empresas/CNPJ, titularidade de módulos, direitos, licenças, ambiente, auditoria e versões.
- **Builder declarativo**: schemas JSON versionados e validados, lista estrita de componentes UI e regras permitidas. Não usar eval, JavaScript arbitrário ou SQL escrito pela IA contra dados reais.
- **Runtime de módulos**: executa apenas configurações autorizadas, com verificações de permissões no servidor, RLS, limites e contratos de dados.
- **Extensibilidade por plugins/adaptadores**: contratos tipados para integrar dados autorizados do Multiempresarial (produtos, estoque, financeiro, cadastros) sem alterar a base global.
- **Sistema independente**: gerado e testado em ambiente isolado, com provisionamento de infraestrutura, GitHub/Render/Supabase e domínio próprios **somente mediante autorização explícita de custo e publicação**; dados e credenciais segregados.
- **IA intercambiável**: provedor IA Forte por API com medição e teto de gastos; opção de conexão autorizada com ChatGPT somente quando oficialmente elegível. Nunca compartilhar a assinatura de um usuário.
- **Segurança**: separação total por empresa, testes de acesso cruzado, nenhum segredo no browser/GitHub, revisão de código antes do deploy, trilha de auditoria e rollback.

## 4. Fluxo de publicação
1. **Ideia** → descreve necessidade.
2. **Projeto** → IA elabora especificação, telas e requisitos; usuário confirma.
3. **Prévia** → executa somente no sandbox, com dados fictícios/anônimos.
4. **Homologação** → testa critérios de aceitação, permissões, acessibilidade, integração e qualidade.
5. **Autorização** → administrador aprova módulo ou sistema, infraestrutura e eventual custo.
6. **Publicação** → integra no menu daquela empresa ou entrega aplicação independente com URL.
7. **Evolução** → usuário pede alterações, gera nova versão, aprova ou volta à anterior.

## 5. Gestão de dados e direitos
- Um **módulo** pertence à empresa solicitante e usa licenças/permissões próprias; não fica visível a outros CNPJs por padrão.
- Um **sistema independente** requer projeto de dados, ambiente e, conforme escopo comercial, licenciamento separados, sem comprometimento do banco principal.
- Definir em contrato os direitos sobre configurações e códigos específicos, suporte, hospedagem, portabilidade e propriedade intelectual, em alinhamento com a titular Forte Atacarejo Ltda.
- Não clonar dados reais nem emitir NF-e/NFC-e com aplicativos não homologados.

## 6. Desenvolvimento em entregas
**P0 — Fundação**: autenticação e Master homologados, empresas A/B de teste, RBAC/RLS, feature flags por CNPJ e isolamento.

**P1 — Criador de módulos sem IA externa**: editor guiado de entidades, formulários, consultas, menus, permissões, regras de validação, prévia e publicação interna com rollback. Sem compra adicional.

**P2 — Criador de sistemas independentes**: assistente de projeto, templates por segmento, sandbox, geração controlada de artefatos e pipeline GitHub CI, sempre com aprovação antes do deploy ou custos.

**P3 — IA de linguagem natural**: tradutor de intenção para esquemas declarativos, revisão de requisitos e testes; integração opcional IA Forte por API com limites por empresa e orçamento autorizado.

**P4 — Automações e integrações**: processos, notificações, importações e adaptadores com escopos mínimos e auditoria, sem alterações fiscais automáticas.

**P5 — Sign in with ChatGPT**: eventual identidade e uso elegível do plano do usuário somente após aprovação comercial OpenAI, requisitos técnicos e consentimentos separados.

**P6 — Comercial**: mensalidade base Multiempresarial; preços a definir para módulos premium, sistemas independentes, suporte e IA Forte opcional. Nunca atrelar uso permitido do plano ChatGPT do usuário a upgrade cobrado.

## 7. Critérios iniciais de aceite
1. Empresa A pode montar módulo de chamados, adicionar campos, testar e publicar **somente em seu menu**; B não consegue consultar, publicar nem exportar seus dados.
2. Usuário sem conhecimento técnico cria "Cadastro de equipamentos e ordens de serviço" por interface guiada, sem editar código.
3. Usuário requisita "Meu próprio sistema de locação", obtém arquitetura/fluxos/protótipo e vê orçamento de implantação separado; nenhuma infraestrutura criada sem aprovação.
4. ADMIN aprova publicação, usuários com papel CONSULTA não alteram estrutura, e todas as versões ficam auditadas.
5. Requisitos que envolvam dados sensíveis, impostos, pagamento, emissão fiscal, código arbitrário ou custos bloqueiam a publicação até revisão e autorização.
6. Sem aprovações OpenAI, nenhum botão promete utilizar o plano ChatGPT; sem orçamento de API, nenhum consumo faturável é iniciado.

## 8. Dependências e restrições
Repositório atual: `FORTEATACAREJO/SISTEMAS-FORTE-TECH`, pasta `multiempresarial/`. Supabase: `tusmlfhzwlzwnoxfhomt`. Render: `srv-dbser6gn74is739lrth0`.

**Nenhuma nova contratação ou recurso pago automático.** Não modificar FORTE FISCAL, FORTE OPERACIONAL, FORTECOMPANNY, SUGIRE e MC-6. Sistemas independentes produzidos pelos clientes devem permanecer isolados e rastreáveis.

## Entrega P2 — 15/11/2026

Implementado **criador de especificações de sistemas independentes**, com modelos, componentes permitidos, prévia visual, salvamento por CNPJ, atualização de rascunho, aprovação para homologação e trilha de auditoria. **Não é gerador de aplicações executáveis nem deploy automático**; o próximo trabalho de P2 será o provisionador isolado, após garantia de segurança, orçamento e autorização. P3 (IA por linguagem natural) permanece pendente.
