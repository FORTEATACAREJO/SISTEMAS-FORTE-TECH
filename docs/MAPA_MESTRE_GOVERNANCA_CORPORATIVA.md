# Mapa mestre de governança — FORTE ATACAREJO LTDA.

**Identidade empresarial informada pela administração**  
- **Razão social:** FORTE ATACAREJO LTDA.  
- **CNPJ:** 49.832.961/0001-51  
- **Nome fantasia:** Sistemas Forte Tech  
- **Titularidade declarada:** todos os sistemas empresariais, projetos industriais, marcas, códigos, domínios e aplicações são ativos da FORTE ATACAREJO LTDA.; esta declaração não substitui verificação jurídica ou cadastral junto aos fornecedores.

**Atualização do inventário:** 16/11/2026; dados consultados diretamente em Supabase, GitHub e Render.  
**Proibição:** não excluir, transferir, unificar, publicar segredos nem alterar recursos de produção como parte da mera padronização de nomes.

## Organograma técnico desejado

```text
FORTE ATACAREJO LTDA. (titular)
└── Sistemas Forte Tech (marca)
    ├── FORTE IA (motor comum de IA, sem vendas até homologação)
    ├── FORTECOMPANNY IA
    ├── FORTE MULTIEMPRESARIAL IA
    ├── NANAPAY IA
    ├── SUGIR IA AG
    ├── FORTE FISCAL IA
    ├── FORTE OP IA
    ├── SITE FORTE ATACAREJO IA
    └── FORTE MC6 (projeto industrial independente; FORA da FORTE IA)
```

## Infraestrutura efetivamente observada

| Plataforma | Conta observada | Tipo | Recursos inventariados | Estado da alteração de titular/nome |
|---|---|---|---:|---|
| Supabase | FORTE ATACAREJO | Organização existente | 6 projetos | Nome FORTE ATACAREJO LTDA. pendente no painel |
| GitHub | FORTEATACAREJO | Conta tipo **User**, não Organization | 5 repositórios | Criar organização corporativa distinta e planejar transferência |
| Render | FORTE-ATACAREJO | Workspace | 15 serviços | Ajustar nome do workspace; organização formal opcional depende do plano |

A titularidade jurídica, billing e dados de acesso devem ser verificados nos consoles administrativos. Escrever o nome da empresa aqui **não efetua transferência ou renomeação** no provedor.

## Supabase — 6 projetos

| Projeto | Área | Governança |
|---|---|---|
| FORTE-IA | FORTE IA | Banco de IA, permissões, custos e melhoria contínua; governança central |
| FORTE-FISCAL | FORTE FISCAL | Banco fiscal **independente** |
| FORTE-ATACAREJO-OPERACIONAL | FORTE OP | Banco de vendas, financeiro, fretes, estoque |
| setor_fiscal_forte_tech_empresas | FORTE MULTIEMPRESARIAL / serviços compartilhados | Não confundir com banco fiscal operacional; mapear vínculos |
| forte-tech-cfop-estatisticas | FORTECOMPANNY | Fontes tributárias e estatísticas; preservar vigência e auditoria |
| FORTE-MC-6 | FORTE MC6 | Industrial, independente e **sem FORTE IA** |

**Não consolidar bancos por coincidência de nomes.** Exigir backup recuperável e validação de esquema e identidade antes de qualquer mudança.

## GitHub — 5 repositórios

| Repositório | Visibilidade observada | Produto responsável | Dependências de migração |
|---|---|---|---|
| FORTE-FISCAL | Privado | FORTE FISCAL | Serviços SUGIR dependem de branch deste repositório |
| FORTE-ATACAREJO-OPERACIONAL | Público | FORTE OP | NANAPAY, site CFOP e APIs operacionais usam branches deste repositório |
| SISTEMAS-FORTE-TECH | Público | Marca / Multiempresarial / FORTE IA (página) | Separar backend privado FORTE IA da apresentação pública |
| FORTECOMPANNY | Público | FORTECOMPANNY | Confrontar código atual com serviço CFOP publicado a partir de outro repositório |
| FORTE-MC-6 | Público | MC6 industrial | Rever exposição de código proprietário, **sem misturar com IA** |

Cada repositório tem o documento `PROPRIEDADE_E_GOVERNANCA.md`. Repositórios públicos devem ser examinados antes de publicar regras proprietárias; o motor de IA e segredos exigem armazenamento privado.

## Render — 15 serviços

| Produto/área | Serviços identificados | Ação de organização |
|---|---|---|
| FORTE IA | `forte-ia` | Site público; API reside no Supabase; testar integração antes de vendas |
| FORTECOMPANNY | `forte-tech-cfop-publico` | Reconciliar dependência com repositório próprio |
| Multiempresarial | `multiempresarial-forte-tech` | Separar interface e sistema multiempresa |
| NANAPAY | `nanapay-forte`, `honesto-homologacao-forte` | Identificar qual é ativo e qual é legado, sem excluir automaticamente |
| SUGIR IA AG | `sugiriaag-homologacao`, `sugire-forte-homologacao`, `sugire-db-rls-verifier-bbtp` | Validar utilidade, migrar código para repositório apropriado |
| FORTE FISCAL | `FORTE-FISCAL`, `forte-fiscal` | Ambientes distintos; não alterar emissão fiscal nem cronograma de homologação |
| FORTE OP | `FORTE-ATACAREJO-OPERACIONAL`, `forte-whatsapp-api`, `forte-itau-api` | APIs críticas; preservar callbacks, cobrança, webhooks |
| Marca Sistemas Forte Tech | `sistemas-forte-tech` | Site institucional da marca |
| FORTE MC6 (fora IA) | `FORTE-MC-6` | URL legada menciona frete; verificar sem desligar |

**SITE FORTE ATACAREJO IA:** não há deploy de assistente identificado de forma inequívoca no inventário Render. A integração comercial com o site da empresa ainda deve ser mapeada.

## Prioridades de execução

### 1. Titularidade e segurança
- [ ] Confirmar **CNPJ 49.832.961/0001-51** nos campos fiscais/faturamento disponíveis e dados de recuperação em cada fornecedor.
- [ ] Ajustar nome da organização **Supabase existente** no painel, sem criar outra.
- [ ] Ajustar nome do **workspace Render existente**, sem criar outro nem mudar plano.
- [ ] Criar **organização GitHub empresarial** com nome público FORTE ATACAREJO LTDA.; definir administradores e recuperação com MFA/2FA.
- [ ] Fazer checklist de migração de GitHub App, Render, webhooks e URLs antes de mover repositórios.
- [ ] Revisar exposição de segredos e código proprietário nos 4 repositórios atualmente públicos.

### 2. Separação de produtos
- [ ] Desvincular NANAPAY da origem operacional e SUGIR da origem fiscal com migração gradual, testes e rollback.
- [ ] Criar backend privado versionado FORTE IA e conectar as 8 aplicações por contrato de autenticação e escopo.
- [ ] Revisar serviços Render redundantes e URL legadas; só arquivar após confirmar dependências e backup.
- [ ] Manter MC6 independente da plataforma IA.

### 3. Qualidade e operação
- [ ] Medir custos e consultar billing nos 3 fornecedores; evitar nova contratação sem autorização.
- [ ] Validar rotinas de backup e **restauração** de todos os bancos.
- [ ] Aplicar verificação de acesso por empresa, usuário e aplicativo, controle de orçamento e auditoria.
- [ ] Homologar os aplicativos individualmente antes de ofertá-los em produção.

**Rastreabilidade:** [Tarefa central de governança](https://github.com/FORTEATACAREJO/SISTEMAS-FORTE-TECH/issues/5).  
**Classificação:** documento de governança e mapeamento, não comprovação jurídica nem autorização para alterar meios de pagamento ou ambientes fiscais.
