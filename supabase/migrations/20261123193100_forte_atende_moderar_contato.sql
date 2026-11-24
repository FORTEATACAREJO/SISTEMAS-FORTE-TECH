-- Mudança de estado + auditoria atômicas, invocadas somente pelo backend service_role.
create or replace function public.forte_atende_moderar_contato(
 p_empresa uuid, p_telefone text, p_status text, p_motivo text, p_usuario uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare anterior text;
begin
 if p_empresa is null or p_usuario is null or p_telefone !~ '^\\+[1-9][0-9]{7,14}$'
    or p_status not in ('ativo','descartado','bloqueado') then
   raise exception 'Dados de moderação inválidos';
 end if;
 if p_status <> 'ativo' and nullif(btrim(coalesce(p_motivo,'')),'') is null then
   raise exception 'Informe o motivo';
 end if;
 -- serializa operações concorrentes do mesmo número
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_empresa::text || ':' || p_telefone,0));
 select status into anterior from public.forte_atende_contatos_moderacao
 where empresa_id=p_empresa and telefone_e164=p_telefone;
 insert into public.forte_atende_contatos_moderacao
 (empresa_id,telefone_e164,status,motivo,alterado_por)
 values (p_empresa,p_telefone,p_status,left(p_motivo,200),p_usuario)
 on conflict (empresa_id,telefone_e164) do update set
 status=excluded.status,motivo=excluded.motivo,alterado_por=excluded.alterado_por,alterado_em=now();
 insert into public.forte_atende_contatos_moderacao_auditoria
 (empresa_id,telefone_e164,status_anterior,status_novo,motivo,usuario_id)
 values (p_empresa,p_telefone,anterior,p_status,left(p_motivo,200),p_usuario);
end $$;
revoke all on function public.forte_atende_moderar_contato(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.forte_atende_moderar_contato(uuid,text,text,text,uuid) to service_role;
