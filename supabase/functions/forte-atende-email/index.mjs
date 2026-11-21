import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const origin = "https://forte-atende-homologacao.onrender.com";
const host = "https://api.mail.hostinger.com/api/v1";
const address = "contato@forteatacarejo.com.br";
const env = name => Deno.env.get(name) || "";
const cors = {
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin"
};

const json = (data, status = 200) => Response.json(data, { status, headers: cors });
const problem = (status, message) => Object.assign(new Error(message), { status });
const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function provider(path, token, payload) {
  let response;
  try {
    response = await fetch(host + path, {
      method: payload ? "POST" : "GET",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(12000)
    });
  } catch {
    throw problem(502, "A Hostinger não respondeu.");
  }
  if (response.status === 204) return null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw problem(503, "Credencial da Hostinger inválida ou sem acesso à caixa.");
    }
    if (response.status === 404) throw problem(404, "Mensagem não encontrada na Hostinger.");
    if (response.status === 422) throw problem(422, "A Hostinger recusou os dados da mensagem.");
    throw problem(502, "A Hostinger não concluiu a operação.");
  }
  return await response.json();
}

function summary(message) {
  return {
    uid: message.uid,
    messageId: message.messageId,
    from: message.from?.address || "",
    subject: message.subject || "",
    date: message.date,
    hasAttachments: Boolean(message.attachments?.length)
  };
}

Deno.serve(async req => {
  if (req.headers.get("origin") !== origin) return new Response(null, { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Entre no FORTE ATENDE." }, 401);

  try {
    const url = env("SUPABASE_URL");
    const auth = { persistSession: false, autoRefreshToken: false };
    const client = createClient(url, env("SUPABASE_ANON_KEY"), {
      auth, global: { headers: { Authorization: authorization } }
    });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "Entre no FORTE ATENDE." }, 401);

    const [grant, account] = await Promise.all([
      client.rpc("access_current_module", { p_app: "vendas" }),
      client.from("fc_perfis").select("empresa_id,ativo,trocar_senha,status_aprovacao,permissoes").eq("user_id", user.id).maybeSingle()
    ]);
    const profile = account.data;
    const role = grant.data?.role;
    const adminRole = ["MASTER", "ADMINISTRADOR"].includes(role);
    const permission = profile?.permissoes;
    if (grant.error || !grant.data?.allowed || account.error || !profile?.ativo ||
        profile.trocar_senha || profile.status_aprovacao !== "APROVADO" ||
        (!adminRole && (!["OPERADOR_GERAL", "VENDEDOR_INTERNO"].includes(role) ||
          (permission?.vendas !== true && permission?.["carga-direta"] !== true &&
           permission?.["VENDAS E COMPRAS"]?.editar !== true)))) {
      return json({ error: "Seu perfil não tem acesso à caixa de e-mails." }, 403);
    }

    const db = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth });
    const tenant = await db.from("gmail_hub_config").select("empresa_id").eq("id", true).maybeSingle();
    if (tenant.error || !profile.empresa_id || profile.empresa_id !== tenant.data?.empresa_id) {
      return json({ error: "Caixa indisponível para esta empresa." }, 403);
    }

    const raw = await req.text();
    if (raw.length > 80000) return json({ error: "Requisição muito grande." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Requisição inválida." }, 400); }
    if (!["LIST", "OPEN", "REPLY"].includes(body?.action)) {
      return json({ error: "Ação inválida." }, 400);
    }
    const token = env("FORTE_ATENDE_HOSTINGER_MAIL_TOKEN");
    if (!token) return json({ error: "Falta autorizar a Hostinger no servidor do FORTE ATENDE." }, 503);

    const me = await provider("/me", token);
    const mailbox = me.data?.mailboxes?.find(item => item.address?.toLowerCase() === address);
    if (!mailbox?.resourceId) return json({ error: "A credencial não tem acesso à caixa Contato." }, 503);
    const base = "/mailboxes/" + encodeURIComponent(mailbox.resourceId);
    const inbox = base + "/folders/INBOX/messages";
    if (body.action === "LIST") {
      const page = Math.max(1, Math.min(1000, Math.trunc(Number(body.page) || 1)));
      const result = await provider(inbox + "?perPage=25&sort=-uid&page=" + page, token);
      return json({ address, messages: result.data.map(summary), total: result.pagination?.total });
    }

    if (!Number.isSafeInteger(body.uid) || body.uid < 1) return json({ error: "Mensagem inválida." }, 400);
    const messagePath = inbox + "/" + body.uid;
    const { data: message } = await provider(messagePath, token);
    if (body.action === "OPEN") {
      const { data: contents } = await provider(messagePath + "/text", token);
      return json({ ...summary(message), text: (contents.text || "").slice(0, 150000),
        htmlOnly: !contents.text && Boolean(contents.html) });
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 10000 || !requestIdPattern.test(String(body.commandId || "")) ||
        !message.messageId || body.messageId !== message.messageId ||
        !emailPattern.test(message.from?.address || "")) {
      return json({ error: "Confira a mensagem original, o remetente e o texto da resposta." }, 400);
    }
    const fingerprintBytes = await crypto.subtle.digest(
      "SHA-256", new TextEncoder().encode(JSON.stringify([user.id, message.messageId, text]))
    );
    const fingerprint = Array.from(new Uint8Array(fingerprintBytes), byte => byte.toString(16).padStart(2, "0")).join("");
    const key = { empresa_id: profile.empresa_id, command_id: body.commandId };
    const jobs = () => db.from("forte_atende_email_envios");
    const created = await jobs().insert({ ...key, fingerprint });
    if (created.error?.code === "23505") {
      const previous = await jobs().select("status,fingerprint").match(key).single();
      if (previous.error || previous.data.fingerprint !== fingerprint) {
        return json({ error: "Identificador de envio já utilizado." }, 409);
      }
      return json({ status: previous.data.status });
    }
    if (created.error) throw problem(503, "Não foi possível registrar o envio.");

    let status = "ACEITO";
    try {
      const subject = (message.subject || "").replace(/[\r\n]/g, " ").trim();
      await provider(base + "/send", token, {
        to: [message.from.address],
        subject: /^re:/i.test(subject) ? subject : "Re: " + subject,
        text,
        inReplyTo: { uid: body.uid, folder: "INBOX" }
      });
    } catch (error) {
      status = [404, 422, 503].includes(error.status) ? "RECUSADO" : "INCERTO";
    }
    const saved = await jobs().update({ status }).match(key);
    return json({ status: saved.error ? "INCERTO" : status });
  } catch (error) {
    if (error.status) return json({ error: error.message }, error.status);
    console.error("FORTE_ATENDE_EMAIL_ERROR");
    return json({ error: "Não foi possível acessar a caixa de e-mails." }, 503);
  }
});
