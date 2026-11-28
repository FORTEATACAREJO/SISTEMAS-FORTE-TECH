create schema forte_atende_privado;
revoke all on schema forte_atende_privado from public, anon, authenticated;

create table forte_atende_privado.config (
  singleton boolean primary key default true check (singleton),
  guard_hash bytea not null check (octet_length(guard_hash) = 32)
);
create table forte_atende_privado.oauth_estados (
  hash bytea primary key,
  conexao uuid not null references public.forte_atende_plugin_registros(id) on delete cascade,
  usuario uuid not null,
  verifier text not null,
  expira timestamptz not null default (now() + interval '10 minutes')
);
create index forte_atende_oauth_expira on forte_atende_privado.oauth_estados(expira);
create table forte_atende_privado.credenciais (
  conexao uuid primary key references public.forte_atende_plugin_registros(id) on delete restrict,
  segredo uuid not null unique
);
revoke all on all tables in schema forte_atende_privado from public, anon, authenticated;

-- Somente backend e usuário autorizado em conjunto podem executar operações.
-- O RPC nunca retorna tokens, senhas ou conteúdo do Vault.
create function public.forte_atende_cofre(
  p_guard text, p_conexao uuid, p_acao text, p_estado text default null,
  p_verifier text default null, p_segredo jsonb default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_empresa uuid;
  v_provedor text;
  v_hash bytea;
  v_verifier text;
  v_segredo uuid;
begin
  if v_usuario is null or p_guard is null or p_guard !~ '^[a-f0-9]{64}$'
     or not exists (select 1 from forte_atende_privado.config
         where guard_hash = sha256(convert_to(p_guard, 'UTF8'))) then
    raise insufficient_privilege using message='Acesso negado';
  end if;
  select empresa_id,provider into v_empresa,v_provedor
  from public.forte_atende_plugin_registros where id=p_conexao for update;
  if not found or not public.forte_atende_acesso_plugin(v_empresa,true) then
    raise insufficient_privilege using message='Acesso negado';
  end if;

  if p_acao in ('iniciar','consumir') then
    if v_provedor not in ('gmail-api','microsoft-graph') or
       p_estado is null or p_estado !~ '^[A-Za-z0-9_-]{43}$' then
      raise invalid_parameter_value using message='Estado inválido';
    end if;
    v_hash := sha256(convert_to(p_estado,'UTF8'));
    if p_acao = 'iniciar' then
      if p_verifier is null or p_verifier !~ '^[A-Za-z0-9_-]{43}$' then
        raise invalid_parameter_value using message='Verificador inválido';
      end if;
      delete from forte_atende_privado.oauth_estados where expira <= now()
        or (conexao=p_conexao and usuario=v_usuario);
      insert into forte_atende_privado.oauth_estados(hash,conexao,usuario,verifier)
      values (v_hash,p_conexao,v_usuario,p_verifier);
      return jsonb_build_object('ok',true);
    end if;
    delete from forte_atende_privado.oauth_estados
    where hash=v_hash and conexao=p_conexao and usuario=v_usuario and expira>now()
    returning verifier into v_verifier;
    return jsonb_build_object('verifier',v_verifier);
  end if;

  if p_acao = 'guardar' then
    if jsonb_typeof(p_segredo) is distinct from 'object' or
       octet_length(p_segredo::text) > 32768 or p_segredo->>'provider' is distinct from v_provedor then
      raise invalid_parameter_value using message='Credencial inválida';
    end if;
    select segredo into v_segredo from forte_atende_privado.credenciais where conexao=p_conexao;
    if found then
      perform vault.update_secret(v_segredo,p_segredo::text,null,null,null);
    else
      v_segredo := vault.create_secret(p_segredo::text,null,'FORTE ATENDE',null);
      insert into forte_atende_privado.credenciais(conexao,segredo) values(p_conexao,v_segredo);
    end if;
    return jsonb_build_object('ok',true);
  end if;

  raise invalid_parameter_value using message='Operação inválida';
end;
$$;
revoke all on function public.forte_atende_cofre(text,uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.forte_atende_cofre(text,uuid,text,text,text,jsonb) to authenticated;
