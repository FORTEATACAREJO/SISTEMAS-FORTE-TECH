-- Cadastro preparatório. Tokens, senhas e estados de ativação ficam fora desta tabela.
create table public.forte_atende_plugin_registros (
  id uuid primary key,
  empresa_id uuid not null,
  channel text not null,
  provider text not null,
  identity text not null,
  external_account_id text,
  display_name text not null default '' check (length(display_name) <= 120),
  forwarded_aliases text[] not null default '{}' check (cardinality(forwarded_aliases) <= 30 and octet_length(forwarded_aliases::text) <= 32000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (empresa_id, channel, identity),
  check (
    (channel = 'email' and provider in ('gmail-api','microsoft-graph','imap-smtp')
      and length(identity) <= 254 and identity = lower(identity)
      and identity ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
      and external_account_id is null)
    or (channel = 'whatsapp' and provider = 'whatsapp-cloud'
      and identity ~ '^\+[1-9][0-9]{9,14}$'
      and external_account_id is not null and external_account_id ~ '^[0-9]{8,32}$')
  )
);
create unique index forte_atende_plugin_meta_number
  on public.forte_atende_plugin_registros (empresa_id, external_account_id) where channel = 'whatsapp';
create index forte_atende_plugin_registros_empresa
  on public.forte_atende_plugin_registros (empresa_id, created_at, id);

create function public.forte_atende_acesso_plugin(p_empresa uuid, p_cadastrar boolean)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.fc_perfis p
    cross join (select to_jsonb(public.access_current_module('vendas')) as acesso) g
    where p.user_id = (select auth.uid())
      and p.empresa_id = p_empresa
      and p.ativo is true and p.trocar_senha is not true
      and p.status_aprovacao = 'APROVADO'
      and g.acesso->'allowed' = 'true'::jsonb
      and (
        g.acesso->>'role' in ('MASTER','ADMINISTRADOR')
        or (
          not p_cadastrar and g.acesso->>'role' in ('OPERADOR_GERAL','VENDEDOR_INTERNO')
          and (p.permissoes->'vendas' = 'true'::jsonb
            or p.permissoes->'carga-direta' = 'true'::jsonb
            or p.permissoes#>'{VENDAS E COMPRAS,editar}' = 'true'::jsonb)
        )
      )
  )
$$;

alter table public.forte_atende_plugin_registros enable row level security;
revoke all on public.forte_atende_plugin_registros from public, anon, authenticated;
revoke all on function public.forte_atende_acesso_plugin(uuid,boolean) from public, anon, authenticated;
grant execute on function public.forte_atende_acesso_plugin(uuid,boolean) to authenticated;
grant select (id, empresa_id, provider, identity, external_account_id, created_at)
  on public.forte_atende_plugin_registros to authenticated;
grant insert (id, empresa_id, channel, provider, identity, external_account_id, display_name, forwarded_aliases)
  on public.forte_atende_plugin_registros to authenticated;
create policy forte_atende_plugin_registros_leitura on public.forte_atende_plugin_registros
  for select to authenticated using (public.forte_atende_acesso_plugin(empresa_id, false));
create policy forte_atende_plugin_registros_cadastro on public.forte_atende_plugin_registros
  for insert to authenticated with check (public.forte_atende_acesso_plugin(empresa_id, true));
