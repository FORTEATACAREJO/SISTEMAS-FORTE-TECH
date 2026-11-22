import { definirConexao } from "../multicanal/catalogo.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const selection = "id,provider,identity,external_account_id";
const table = "/rest/v1/forte_atende_plugin_registros";

function roleOf(grant, profile) {
  if (grant?.allowed !== true || profile?.ativo !== true || profile.trocar_senha === true ||
      profile.status_aprovacao !== "APROVADO" || !uuid.test(profile.empresa_id ?? "")) return null;
  if (grant.role === "MASTER") return "master";
  if (grant.role === "ADMINISTRADOR") return "admin";
  const p = profile.permissoes;
  if (["OPERADOR_GERAL", "VENDEDOR_INTERNO"].includes(grant.role) &&
      (p?.vendas === true || p?.["carga-direta"] === true || p?.["VENDAS E COMPRAS"]?.editar === true)) {
    return "atendente";
  }
  return null;
}

export function criarIntegracaoOperacional({url, publishableKey, fetcher = fetch}) {
  const origin = new URL(url);
  if (origin.protocol !== "https:" || origin.href !== origin.origin + "/" || origin.username || origin.password ||
      !publishableKey?.startsWith("sb_publishable_")) {
    throw Error("Configuração do FORTE Operacional inválida");
  }
  const sessions = new WeakMap();
  const request = (path, authorization, {method = "GET", body, prefer} = {}) => fetcher(new URL(path, origin), {
    method,
    headers: {
      apikey: publishableKey,
      authorization,
      ...(body ? {"Content-Type":"application/json"} : {}),
      ...(prefer ? {Prefer:prefer} : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "error",
    signal: AbortSignal.timeout(8000)
  });

  async function authenticate(req) {
    const authorization = req.headers.authorization;
    if (!/^Bearer [\w.-]{1,4096}$/.test(authorization ?? "")) return null;
    try {
      const identity = await request("/auth/v1/user", authorization);
      if (identity.status === 401 || identity.status === 403) return null;
      if (!identity.ok) throw Error();
      const {id} = await identity.json();
      if (!uuid.test(id ?? "")) return null;
      const [grant, profiles] = await Promise.all([
        request("/rest/v1/rpc/access_current_module", authorization, {method:"POST",body:{p_app:"vendas"}}),
        request("/rest/v1/fc_perfis?select=empresa_id,ativo,trocar_senha,status_aprovacao,permissoes&limit=2&user_id=eq."+id, authorization)
      ]);
      if (!grant.ok || !profiles.ok) return {forbidden:true};
      const rows = await profiles.json();
      const profile = rows.length === 1 ? rows[0] : null;
      const role = roleOf(await grant.json(), profile);
      if (!role) return {forbidden:true};
      const actor = {tenantId:profile.empresa_id,userId:id,role};
      sessions.set(actor, authorization);
      return actor;
    } catch {
      throw Error("Autenticação indisponível");
    }
  }

  async function query(actor, path, options) {
    const authorization = sessions.get(actor);
    if (!authorization) throw Error("Acesso não autorizado");
    let response;
    try {
      response = await request(path, authorization, options);
    } catch {
      throw Error("Cadastro de plugins indisponível");
    }
    if (response.status === 409) throw Error("Identidade ou número já conectado");
    if (response.status === 401 || response.status === 403) throw Error("Acesso não autorizado");
    if (!response.ok) throw Error("Cadastro de plugins indisponível");
    return response.json();
  }

  const connection = (actor,row) => ({
    id:row.id, tenantId:actor.tenantId, provider:row.provider, identity:row.identity,
    externalAccountId:row.external_account_id, status:"pending", sendEnabled:false, receiveEnabled:false
  });
  const scoped = actor => table + "?select=" + selection + "&empresa_id=eq." + actor.tenantId;

  const central = {
    async conexoes(actor) {
      const rows = await query(actor, scoped(actor) + "&order=created_at.asc,id.asc");
      return rows.map(row => connection(actor,row));
    },
    async registrar(actor,input) {
      if (!["master","admin"].includes(actor?.role)) throw Error("Acesso não autorizado");
      const c = definirConexao({...input,tenantId:actor.tenantId});
      const rows = await query(actor,table+"?select="+selection,{
        method:"POST", prefer:"return=representation",
        body:{id:c.id,empresa_id:actor.tenantId,channel:c.canal,provider:c.provider,
          identity:c.identity,external_account_id:c.externalAccountId || null,
          display_name:c.settings.displayName,forwarded_aliases:c.settings.forwardedAliases}
      });
      if (rows.length !== 1) throw Error("Cadastro de plugins indisponível");
      return connection(actor,rows[0]);
    },
    store: {
      async getConnection(tenantId,id,actor) {
        if (tenantId !== actor.tenantId || !uuid.test(id)) return null;
        const rows = await query(actor, scoped(actor)+"&id=eq."+id);
        return rows.length === 1 ? connection(actor,rows[0]) : null;
      }
    },
    async validar() {
      throw Error("Verificação do provedor não configurada");
    }
  };
  return {authenticate,central};
}
