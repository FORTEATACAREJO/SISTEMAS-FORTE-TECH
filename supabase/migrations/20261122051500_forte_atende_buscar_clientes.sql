create function public.forte_atende_buscar_clientes(
  p_empresa uuid,
  p_busca text default '',
  p_cliente text default null
)
returns table (id text, nome text, razao_social text, fantasia text, email text, whatsapp text, telefone text)
language sql stable
set search_path = ''
as $$
  with termos as (
    select lower(btrim(left(coalesce(p_busca, ''), 120))) as busca,
           regexp_replace(coalesce(p_busca, ''), '[^0-9]', '', 'g') as digitos
  ), clientes as (
    select c->>'id' as id, btrim(coalesce(c->>'nome','')) as nome,
           btrim(coalesce(c->>'razaoSocial','')) as razao_social,
           btrim(coalesce(c->>'nomeFantasia','')) as fantasia,
           btrim(coalesce(c->>'email','')) as email,
           btrim(coalesce(c->>'whatsapp','')) as whatsapp,
           btrim(coalesce(c->>'telefone','')) as telefone
    from public.fc_app_state a
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(a.estado->'clientes') = 'array' then a.estado->'clientes' else '[]'::jsonb end
    ) c
    where a.empresa_id = p_empresa and c->>'ativo' is distinct from 'false'
  )
  select c.* from clientes c cross join termos t
  where c.id <> '' and (
    (p_cliente is not null and c.id = p_cliente)
    or (p_cliente is null and length(t.busca) >= 2 and (
      strpos(
        translate(lower(concat_ws(' ',c.nome,c.razao_social,c.fantasia,c.email)), 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        translate(t.busca, 'áàãâäéèêëíìîïóòõôöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
      ) > 0
      or (length(t.digitos) >= 4 and t.busca !~ '[[:alpha:]]' and (
        strpos(regexp_replace(c.whatsapp, '[^0-9]', '', 'g'),t.digitos) > 0
        or strpos(regexp_replace(c.telefone, '[^0-9]', '', 'g'),t.digitos) > 0
      ))
    ))
  )
  order by lower(c.nome), c.id
  limit 31;
$$;
revoke all on function public.forte_atende_buscar_clientes(uuid,text,text) from public, anon, authenticated;
grant execute on function public.forte_atende_buscar_clientes(uuid,text,text) to service_role;
