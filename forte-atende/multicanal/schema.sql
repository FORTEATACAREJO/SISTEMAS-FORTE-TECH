-- FORTE ATENDE — esquema multiempresa (PROPOSTA, NAO EXECUTADA).
-- Aplicar somente apos revisao da equipe do projeto e plano de rollback.
-- Este esquema nao deve substituir o banco FORTE FISCAL.
create extension if not exists pgcrypto;

create table if not exists public.forte_atende_tenants (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 2 and 180),
 created_at timestamptz not null default now()
);
create table if not exists public.forte_atende_memberships (
 tenant_id uuid not null references public.forte_atende_tenants(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('master','admin','atendente')),
 created_at timestamptz not null default now(),
 primary key (tenant_id,user_id)
);
create table if not exists public.forte_atende_connections (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.forte_atende_tenants(id) on delete cascade,
 channel text not null check (channel in ('email','whatsapp')),
 provider text not null check (provider in ('gmail-api','microsoft-graph','imap-smtp','whatsapp-cloud','whatsapp-bsp')),
 identity text not null,
 external_account_id text,
 -- Referencia para o cofre de segredos do backend, NUNCA token ou senha.
 secret_ref text not null,
 status text not null default 'pending' check (status in ('pending','verified','disabled')),
 send_enabled boolean not null default false,
 receive_enabled boolean not null default false,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique (tenant_id,channel,identity)
);
create unique index if not exists forte_atende_unique_whatsapp_external_account
on public.forte_atende_connections(provider,external_account_id)
where channel='whatsapp' and external_account_id is not null;
create index if not exists forte_atende_connections_tenant on public.forte_atende_connections(tenant_id);

create unique index if not exists forte_atende_connections_tenant_id_unique on public.forte_atende_connections(tenant_id,id);

create table if not exists public.forte_atende_messages (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.forte_atende_tenants(id) on delete cascade,
 connection_id uuid not null references public.forte_atende_connections(id) on delete cascade,
 external_id text not null,
 sender text not null,
 recipient text not null,
 original_recipient text,
 body text not null default '',
 received_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique (tenant_id,connection_id,external_id),
 -- FK composta impede que um ID de conexao de outra empresa seja associado.
 constraint forte_atende_messages_tenant_match foreign key(tenant_id,connection_id)
   references public.forte_atende_connections(tenant_id,id)
);

create index if not exists forte_atende_messages_tenant_time on public.forte_atende_messages(tenant_id,received_at desc);

create table if not exists public.forte_atende_drafts (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.forte_atende_tenants(id) on delete cascade,
 connection_id uuid not null references public.forte_atende_connections(id) on delete cascade,
 destination text not null,
 subject text,
 body text not null,
 kind text not null check (kind in ('service','campaign')),
 -- So registros de consentimento verificados podem ser usados nas campanhas.
 consent_reference text,
 template_name text,
 status text not null default 'draft'
   check (status in ('draft','approved','sending','accepted','sent','unknown','cancelled')),
 created_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 external_id text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint forte_atende_drafts_tenant_match foreign key(tenant_id,connection_id)
   references public.forte_atende_connections(tenant_id,id)
);
create index if not exists forte_atende_drafts_tenant_status
on public.forte_atende_drafts(tenant_id,status,created_at);

-- Backend confiavel devera fazer CAS/SELECT FOR UPDATE SKIP LOCKED na reserva do envio
-- para evitar disparo duplo. TIMEOUT deve ir para UNKNOWN; reenvio requer conferencia.
-- Mensagens de campanha dependem de consentimento, opt-out e APIs oficiais.

alter table public.forte_atende_tenants enable row level security;
alter table public.forte_atende_memberships enable row level security;
alter table public.forte_atende_connections enable row level security;
alter table public.forte_atende_messages enable row level security;
alter table public.forte_atende_drafts enable row level security;

-- Negar Data API direta aos dados e segredos do atendimento.
-- A API confiavel verifica identidade e vinculo de empresa no servidor.
revoke all on public.forte_atende_tenants from anon, authenticated;
revoke all on public.forte_atende_memberships from anon, authenticated;
revoke all on public.forte_atende_connections from anon, authenticated;
revoke all on public.forte_atende_messages from anon, authenticated;
revoke all on public.forte_atende_drafts from anon, authenticated;

-- Somente o membro visualiza sua propria associacao.
grant select(tenant_id,user_id,role) on public.forte_atende_memberships to authenticated;
drop policy if exists forte_atende_membership_self on public.forte_atende_memberships;
create policy forte_atende_membership_self on public.forte_atende_memberships
 for select to authenticated using ((select auth.uid())=user_id);

-- Nao criar politicas de insert/update/delete publicas para mensagens e conexoes.
-- Apenas backend com permissao de servidor e verificacao explicita de tenant.
