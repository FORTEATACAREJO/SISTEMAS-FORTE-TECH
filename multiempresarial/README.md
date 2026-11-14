# Multiempresarial — Sistema independente da Sistemas Forte Tech

**Produto:** Multiempresarial, parte do catálogo Sistemas Forte Tech.  
**Serviço público provisório:** https://multiempresarial-forte-tech.onrender.com  
**Caminho de publicação atual:** `multiempresarial/` no repositório `FORTEATACAREJO/SISTEMAS-FORTE-TECH`.  
**Domínio próprio:** ainda não contratado; definir mais tarde sem alterar o domínio institucional `sistemasfortetech.com.br`.

## Situação comercial
- Licença individual por empresa; compartilhar o mesmo Supabase com RLS por CNPJ e papéis.
- Código de licença estável: `SFT_SETOR_FISCAL`.
- Plano já provisionado no Supabase: `SFT_FISCAL_MENSAL_NUVEM`, mensal, cartão, nuvem compartilhada.
- **Preço a definir, sem assinatura ativa nem cobrança**. `commercial-config.json` é uma declaração de estado, não inicia checkout nem emissão fiscal.
- Asaas no modo Sandbox atual. Antes de testes de checkout no novo host, autorizar a origem https://multiempresarial-forte-tech.onrender.com na Edge Function de faturamento; validar CORS, callback e o ciclo completo de pagamento. Não ativar cobrança enquanto isso não for testado.
- As regras tributárias ainda estão pendentes de homologação, NF-e/NFC-e indisponíveis.

## Acesso seguro e onboarding
- `index.html`: vitrine pública e ações.
- `demo.html`: demonstração local sem salvar informações reais.
- `admin.html` / `admin.js`: acesso com link por e-mail via Supabase. Requer configuração do Redirect URL `https://multiempresarial-forte-tech.onrender.com/admin.html` em Supabase → Authentication → URL Configuration. Sem allowlist, o login não está homologado neste host.
- `contador.html`: encaminha ao acesso autorizado.
- Para contas reais, é necessário usuário autenticado, vínculo/licença e revisão de segurança. O projeto Supabase atual está com zero usuários e zero empresas.

## Separação futura em repositório próprio
A pasta `multiempresarial/` é independente em termos de assets e de publicação. Para transferir:
1. Criar novo repositório exclusivo do produto e transferir os arquivos de `multiempresarial/` sem alterar caminhos absolutos `/...`.
2. Ajustar o Render deste serviço para apontar ao repositório novo e seu diretório de publicação.
3. Preservar o mesmo projeto Supabase `tusmlfhzwlzwnoxfhomt` inicialmente para não perder cadastros ou licenças; se houver migração de banco, executar por procedimento separado e auditado.
4. Adicionar o domínio novo ao **mesmo** serviço Render, verificar DNS/TLS e incluir URL de callback no Supabase Auth.
5. Revisar origens permitidas no faturamento Sandbox, e só então habilitar venda mensal após preço aprovado e testes.
6. Manter o endereço `onrender.com` até homologação do domínio próprio.

Este serviço **não deve modificar** FORTE FISCAL, FORTE OPERACIONAL, FORTECOMPANNY ou MC-6.

## Verificação
- `node --test multiempresarial/tests/publicacao.test.mjs`
- Verificar `/`, `/demo.html`, `/admin.html`, `/contador.html`, `/manifest.webmanifest` e `/commercial-config.json` pelo endereço Render.
