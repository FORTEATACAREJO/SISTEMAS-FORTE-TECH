# Padrão empresarial de repositórios, bancos, homologações e publicações

**Titular declarada:** FORTE ATACAREJO LTDA. — CNPJ 49.832.961/0001-51  
**Nome fantasia:** Sistemas Forte Tech  
**Ambiente corporativo pretendido:** FORTE ATACAREJO LTDA. em GitHub, Supabase e Render  
**Data do inventário:** 16/11/2026  
**Status:** estrutura de referência; não representa mudança de titularidade já concluída nos provedores.

## Política corporativa

- **Uma única empresa titular** de código, bases, publicações, licenças e marca.
- **Uma organização GitHub empresarial** com repositórios de código proprietário privados. O GitHub atualmente apresenta `FORTEATACAREJO` como **User**; é necessário criar uma org distinta e transferir os repositórios com plano de migração.
- **Uma organização Supabase existente**, seis projetos independentes preservados; alterar somente nome exibido e dados administrativos, sem mover bancos sem avaliação.
- **Um workspace Render existente** com quinze serviços; manter os deployments e alterar apenas o nome administrativo para `FORTE ATACAREJO LTDA.` quando possível. Não contratar plano Scale apenas para obter camada de organização formal.
- **Cada sistema tem dono operacional e trilha de homologação própria**, embora compartilhe infraestrutura de IA.
- **FORTE MC6 continua projeto industrial**, pertencente à empresa, mas fora da FORTE IA.

## Separação lógica por sistema

| Sistema/área | Repositório atual conhecido | Banco atual conhecido | Publicação atual conhecida | Próximo passo seguro |
|---|---|---|---|---|
| FORTE FISCAL | FORTE-FISCAL (privado) | FORTE-FISCAL | forte-fiscal e homologação PR91 | Separar ambiente homologado de produção antes da virada; não alterar numeração de NF |
| FORTE OP | FORTE-ATACAREJO-OPERACIONAL (público) | FORTE-ATACAREJO-OPERACIONAL | FORTE OP e APIs Itaú/WhatsApp | Revisar código público; manter callbacks e integrações |
| FORTECOMPANNY IA | FORTECOMPANNY (público), site antigo em branch FORTE OP | forte-tech-cfop-estatisticas | forte-tech-cfop-publico | Migrar origem do frontend ao repositório correto mediante teste |
| FORTE IA | Apresentação em SISTEMAS-FORTE-TECH (público) | FORTE-IA | forte-ia (site) | Criar repositório privado de backend e portar funções/migrações |
| FORTE MULTIEMPRESARIAL IA | SISTEMAS-FORTE-TECH (público) | setor_fiscal_forte_tech_empresas | multiempresarial-forte-tech | Mapear módulos de gestão e controles de usuário antes de extrair |
| NANAPAY IA | Branch homolog/nanapay em FORTE OP | Integração a mapear; não presumir banco próprio | nanapay-forte e HONESTO legado | Criar repositório privado próprio depois de testar dependências |
| SUGIR IA AG | Branch feature/forte-tech-central em FORTE FISCAL | Integração a mapear; não presumir banco próprio | sugiriaag-homologacao, sugire-forte-homologacao, verifier | Separar código fiscal/SUGIR sem afetar produção |
| SITE FORTE ATACAREJO IA | Site institucional e fonte de catálogo ainda a identificar | Integração a mapear | Não foi demonstrado assistente ativo no inventário | Identificar backend/site institucional antes de integrar |
| FORTE MC6 — industrial | FORTE-MC-6 (público) | FORTE-MC-6 | FORTE-MC-6 (URL antiga forte-frete) | Preservar independente; não integrar ao motor de IA |

## Homologação e promoção: critérios obrigatórios

**Ambientes pretendidos:**
- `desenvolvimento`: branches `feature/*`, `fix/*` e testes locais.
- `homologacao`: branches `homolog/*` ou publicação de teste identificada e restrita, sem dados pessoais reais sempre que possível.
- `producao`: release explícito, aprovado por responsável com testes, auditoria, backup restaurável e plano de rollback. Branch `main` não comprova produção homologada.
- `site_publico`: página no ar, que **não** atesta homologação do backend.
- `servico_apoio`: APIs financeiras, webhook, validação de RLS e outros serviços dependentes.
- `legado`: manter enquanto houver URLs, DNS, callbacks ou serviços vinculados.

**Gates de produção:**
1. Rastrear repositório, commit, branch, serviço Render, banco Supabase e dono funcional.
2. Registrar inventário de variáveis secretas por NOME (nunca valor), permissões e callbacks.
3. Testes automatizados, controle multiempresa, segurança, revisão de permissões.
4. No fiscal: conferir legislação oficial, regras por UF, NF-e/NFC-e, contingência e numeração.
5. Backup e teste de restauração; isolamento de homologação/prod; revisão de impactos.
6. Aprovação explícita de uma release, publicação, teste de fumaça e rollback.
7. Monitoramento e trilha de auditoria depois da liberação.

**Regras automáticas de proteção:** nenhuma migração nominal pode ativar cobrança, emissor fiscal, chaves OpenAI, publicação autônoma de código ou processamento real de pagamentos.

## Inventário Render por função (classificação preliminar baseada em nome/branch)

| Classe | Serviço | Fonte atual |
|---|---|---|
| Site público | forte-ia | SISTEMAS-FORTE-TECH · site/forte-ia-apresentacao |
| Site público | multiempresarial-forte-tech | SISTEMAS-FORTE-TECH · main |
| Site público | sistemas-forte-tech | FORTE-ATACAREJO-OPERACIONAL · site/sistemas-forte-tech-preview |
| Site público | forte-tech-cfop-publico | FORTE-ATACAREJO-OPERACIONAL · deploy/forte-tech-cfop-publico |
| Homologação | nanapay-forte | FORTE-ATACAREJO-OPERACIONAL · homolog/nanapay |
| Homologação | sugiriaag-homologacao | FORTE-FISCAL · feature/forte-tech-central |
| Homologação | sugire-forte-homologacao | FORTE-FISCAL · feature/forte-tech-central |
| Homologação | FORTE-FISCAL | FORTE-FISCAL · spec/parametrizacao-legal-mg-go |
| Apoio | sugire-db-rls-verifier-bbtp | FORTE-FISCAL · feature/forte-tech-central |
| Apoio | forte-whatsapp-api | FORTE-ATACAREJO-OPERACIONAL · fix/whatsapp-webhook-signature |
| Apoio | forte-itau-api | FORTE-ATACAREJO-OPERACIONAL · main |
| Legado | honesto-homologacao-forte | FORTE-ATACAREJO-OPERACIONAL · homolog/honesto-demo |
| Legado | FORTE-MC-6 | FORTE-MC-6 · main · URL forte-frete |
| Legado | FORTE-ATACAREJO-OPERACIONAL | FORTE-ATACAREJO-OPERACIONAL · main · URL forte-vendas |
| Não verificado | forte-fiscal | FORTE-FISCAL · main |

**Importante:** classificação documental não move, renomeia nem bloqueia deployments no Render. As definições de `homologação` indicam indícios no nome/branch e exigem validação funcional; não inferir produção real por `LIVE`.

## Migração da titularidade para pessoa jurídica

### 1. GitHub
- Criar organização cujo **nome público** é `FORTE ATACAREJO LTDA.`, slug disponível preferido `FORTE-ATACAREJO-LTDA`.
- Cadastrar e-mail corporativo de acesso, billing e segundo administrador autorizado com MFA; conferir plano e permissões.
- Avaliar repos públicos (4) para segredos e ativos proprietários, protegendo sem interromper o Render.
- Transferir repositórios individualmente em lotes após testar webhook, App GitHub, integrações Render, CI, URL remota, README e redirecionamentos.
- Após transferência, registrar novo owner efetivamente confirmado e verificar deploys.

### 2. Supabase
- Manter organização `FORTE ATACAREJO` com 6 projetos; alterar exibição para `FORTE ATACAREJO LTDA.` e conferir billing/documentos.
- Não juntar banco operacional ao fiscal; não juntar banco de estatísticas CFOP ao FORTE IA.
- Centralizar governança no banco privado de controle FORTE IA; cada produto mantém acesso a dados somente por escopo autorizado.

### 3. Render
- Manter workspace `FORTE-ATACAREJO` com 15 serviços; ajustar nome de exibição e dados administrativos.
- Nenhum upgrade para Scale/Enterprise apenas por nomenclatura sem orçamento/aceite.
- Documentar cada release com repositório, branch, banco e domínio; preservar serviços legados até concluir substituição e teste.

## Estado da execução

**Concluído:** identificação declarada e inventário no Supabase; documentos de titularidade nos cinco repositórios; mapa mestre e registro das 15 publicações/homologações no banco central.

**Ainda NÃO concluído:** criação de org GitHub, transferência de repositórios, renomeação real da organização Supabase, renomeação real do workspace Render, validação de billing/CNPJ nos provedores, separação efetiva de código SUGIR/NANAPAY, homologação integral de cada app.

**Controle e evidências:** [tarefa de governança](https://github.com/FORTEATACAREJO/SISTEMAS-FORTE-TECH/issues/5) e [mapa mestre](https://github.com/FORTEATACAREJO/SISTEMAS-FORTE-TECH/blob/main/docs/MAPA_MESTRE_GOVERNANCA_CORPORATIVA.md).
