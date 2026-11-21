create table public.forte_atende_email_envios (
    empresa_id uuid not null,
    command_id uuid not null,
    fingerprint text not null,
    status text not null default 'PROCESSANDO'
        check (status in ('PROCESSANDO', 'ACEITO', 'RECUSADO', 'INCERTO')),
    created_at timestamptz not null default now(),
    primary key (empresa_id, command_id)
);

alter table public.forte_atende_email_envios enable row level security;
revoke all on public.forte_atende_email_envios from public, anon, authenticated;
grant select, insert, update on public.forte_atende_email_envios to service_role;
