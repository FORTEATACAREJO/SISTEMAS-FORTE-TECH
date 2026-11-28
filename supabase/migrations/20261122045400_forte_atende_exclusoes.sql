create table public.forte_atende_exclusoes (
  id bigint generated always as identity primary key,
  empresa_id uuid not null,
  canal text not null check (canal in ('email', 'whatsapp')),
  chave text not null,
  conversa text,
  evento_em timestamptz,
  descricao text not null,
  excluido_por uuid not null,
  excluido_por_nome text not null,
  excluido_em timestamptz not null default now(),
  restaurado_por uuid,
  restaurado_em timestamptz,
  check ((restaurado_por is null) = (restaurado_em is null))
);
create unique index forte_atende_exclusoes_ativas
  on public.forte_atende_exclusoes (empresa_id, canal, chave)
  where restaurado_em is null;

alter table public.forte_atende_exclusoes enable row level security;
revoke all on public.forte_atende_exclusoes from public, anon, authenticated;
grant select, insert, update on public.forte_atende_exclusoes to service_role;
