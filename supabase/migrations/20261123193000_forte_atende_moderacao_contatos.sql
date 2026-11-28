-- FORTE ATENDE: lista interna de bloqueio, sem bloquear na Meta e sem excluir mensagens.
-- Migração preparada para revisão e aplicação controlada no banco operacional.
create table if not exists public.forte_atende_contatos_moderacao (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 telefone_e164 text not null check (telefone_e164 ~ '^[+][1-9][0-9]{7,14}$'),
 status text not null check (status in ('bloqueado','descartado','ativo')),
 motivo text,
 alterado_por uuid not null,
 alterado_em timestamptz not null default now(),
 criado_em timestamptz not null default now(),
 unique (empresa_id, telefone_e164)
);
create index if not exists forte_atende_moderacao_empresa_status
 on public.forte_atende_contatos_moderacao(empresa_id,status);
create table if not exists public.forte_atende_contatos_moderacao_auditoria (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null,
 telefone_e164 text not null,
 status_anterior text,
 status_novo text not null,
 motivo text,
 usuario_id uuid not null,
 ocorrido_em timestamptz not null default now()
);
create index if not exists forte_atende_moderacao_auditoria_empresa
 on public.forte_atende_contatos_moderacao_auditoria(empresa_id,ocorrido_em desc);
alter table public.forte_atende_contatos_moderacao enable row level security;
alter table public.forte_atende_contatos_moderacao_auditoria enable row level security;
revoke all on public.forte_atende_contatos_moderacao from anon,authenticated;
revoke all on public.forte_atende_contatos_moderacao_auditoria from anon,authenticated;
-- Nenhuma policy pública. Backend autenticado deve validar usuário, empresa,
-- permissões e registrar mudança + auditoria em uma única transação.
-- Nunca filtrar o armazenamento de mensagens recebidas: filtrar apenas
-- listagem e notificações. Desbloqueio restaura visibilidade do histórico.

revoke all on public.forte_atende_contatos_moderacao, public.forte_atende_contatos_moderacao_auditoria from public,anon,authenticated,service_role;
grant select,insert,update on public.forte_atende_contatos_moderacao to service_role;
grant select,insert on public.forte_atende_contatos_moderacao_auditoria to service_role;
