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
function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!/^\+?[\d\s().-]+$/.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return !raw.startsWith("+") && /^\d{10,11}$/.test(digits) ? "55" + digits : digits;
}

async function matchingThreads(db, company, phone) {
  const { data, error } = await db.from("whatsapp_inbox_state").select("threads:estado->whatsappInboxThreads")
    .eq("empresa_id", company).maybeSingle();
  if (error) throw problem(503, "Não foi possível consultar as conversas de WhatsApp.");
  return (data?.threads || []).filter(thread => normalizePhone(thread.phone) === phone);
}

async function sendEmail(db, company, commandId, facts, base, token, payload) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(facts)));
  const fingerprint = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  const key = { empresa_id: company, command_id: commandId };
  const jobs = () => db.from("forte_atende_email_envios");
  const created = await jobs().insert({ ...key, fingerprint });
  if (created.error?.code === "23505") {
    const previous = await jobs().select("status,fingerprint").match(key).single();
    if (previous.error || previous.data.fingerprint !== fingerprint) {
      throw problem(409, "Identificador de envio já utilizado.");
    }
    return previous.data.status;
  }
  if (created.error) throw problem(503, "Não foi possível registrar o envio.");

  let status = "ACEITO";
  try {
    await provider(base + "/send", token, payload);
  } catch (error) {
    status = [404, 422, 503].includes(error.status) ? "RECUSADO" : "INCERTO";
  }
  const saved = await jobs().update({ status }).match(key);
  return saved.error ? "INCERTO" : status;
}

async function sendWhatsApp(url, authorization, thread, text, commandId) {
  let response, payload;
  try {
    response = await fetch(url + "/functions/v1/order-communications", {
      method: "POST",
      headers: { Authorization: authorization, apikey: env("SUPABASE_ANON_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "INBOX_REPLY", threadId: thread.id, text, commandId }),
      signal: AbortSignal.timeout(35000)
    });
    payload = await response.json();
  } catch {
    return { status: "INCERTO" };
  }
  if (!response.ok) {
    return { status: "INCERTO", detail: payload.error || "Não foi possível confirmar o envio pelo WhatsApp." };
  }
  const state = payload.message?.state;
  return { status: ["SENT", "DELIVERED", "READ"].includes(state) ? "ACEITO" : state === "FAILED" ? "RECUSADO" : "INCERTO" };
}

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
      client.from("fc_perfis").select("empresa_id,nome,perfil,ativo,trocar_senha,status_aprovacao,permissoes").eq("user_id", user.id).maybeSingle()
    ]);
    const profile=account.data;
    if(account.error||!profile?.ativo||profile.trocar_senha||profile.status_aprovacao!=="APROVADO"||!profile.empresa_id)return json({error:"Perfil não autorizado."},403);
    const db=createClient(url,env("SUPABASE_SERVICE_ROLE_KEY"),{auth});
    const adminRole=!grant.error&&grant.data?.allowed===true&&grant.data.role==="MASTER"&&profile.perfil==="MASTER";
    const allowed=await db.from("forte_atende_access").select("ativo,whatsapp,email").eq("empresa_id",profile.empresa_id).eq("user_id",user.id).order("revision",{ascending:false}).limit(1).maybeSingle();
    if(allowed.error)return json({error:"Permissão indisponível."},503);
    const canEmail=adminRole||allowed.data?.ativo===true&&allowed.data.email===true;
    const canWhatsApp=adminRole||allowed.data?.ativo===true&&allowed.data.whatsapp===true;
    if(!canEmail&&!canWhatsApp)return json({error:"Acesso ao FORTE ATENDE não autorizado."},403);
    const tenant = await db.from("gmail_hub_config").select("empresa_id").eq("id", true).maybeSingle();
    if (tenant.error || !profile.empresa_id || profile.empresa_id !== tenant.data?.empresa_id) {
      return json({ error: "Caixa indisponível para esta empresa." }, 403);
    }

    const raw = await req.text();
    if (raw.length > 80000) return json({ error: "Requisição muito grande." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Requisição inválida." }, 400); }
    if (!["LIST", "OPEN", "REPLY", "EXCLUSIONS", "EXCLUDE", "RESTORE", "CLIENT_SEARCH", "CLIENT_WHATSAPP", "CLIENT_EMAILS", "CLIENT_SEND", "CONTACT_MODERATE", "CONTACT_MODERATION_LIST"].includes(body?.action)) {
      return json({ error: "Ação inválida." }, 400);
    }

    if(!adminRole&&["EXCLUDE","RESTORE","CONTACT_MODERATE"].includes(body.action))return json({error:"Ação exclusiva do MASTER."},403);
    if((["CONTACT_MODERATION_LIST","CLIENT_WHATSAPP"].includes(body.action)||body.action==="CLIENT_SEND"&&body.channel==="whatsapp")&&!canWhatsApp)return json({error:"WhatsApp não autorizado."},403);
    if((["LIST","OPEN","REPLY","CLIENT_EMAILS"].includes(body.action)||body.action==="CLIENT_SEND"&&body.channel==="email")&&!canEmail)return json({error:"E-mail não autorizado."},403);
    if (body.action === "CONTACT_MODERATION_LIST") {
      const { data, error } = await db.from("forte_atende_contatos_moderacao")
        .select("telefone_e164,status,motivo,alterado_em")
        .eq("empresa_id",profile.empresa_id).order("alterado_em",{ascending:false}).limit(200);
      if (error) throw problem(503,"Não foi possível consultar a moderação de contatos.");
      return json({items:data});
    }
    if (body.action === "CONTACT_MODERATE") {
      const phone = normalizePhone(body.phone);
      const status = body.status;
      const motivo = typeof body.motivo === "string" ? body.motivo.trim().slice(0,200) : "";
      if (!/^[1-9]\d{7,14}$/.test(phone) || !["ativo","descartado","bloqueado"].includes(status) ||
          (status !== "ativo" && !motivo)) return json({error:"Confira número, situação e motivo."},400);
      const { data: state, error: stateError } = await db.from("whatsapp_inbox_state")
        .select("threads:estado->whatsappInboxThreads").eq("empresa_id",profile.empresa_id).maybeSingle();
      if (stateError) throw problem(503,"Não foi possível conferir a conversa.");
      if (!(state?.threads || []).some(thread => normalizePhone(thread.phone) === phone)) {
        return json({error:"Número não encontrado nas conversas desta empresa."},404);
      }
      const {error} = await db.rpc("forte_atende_moderar_contato",{
        p_empresa:profile.empresa_id,p_telefone:"+"+phone,p_status:status,p_motivo:motivo,p_usuario:user.id
      });
      if (error) throw problem(503,"Não foi possível registrar a decisão.");
      return json({saved:true,status});
    }
    let customer;
    const compose = body.action === "CLIENT_SEND";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    if (compose && (!["whatsapp", "email"].includes(body.channel) || !text ||
        text.length > (body.channel === "whatsapp" ? 4096 : 10000) ||
        !requestIdPattern.test(String(body.commandId || "")) ||
        (body.channel === "email" && (!subject || subject.length > 180 || /[\r\n]/.test(subject))))) {
      return json({ error: "Confira o canal, o assunto e o texto da mensagem." }, 400);
    }
    if (body.action.startsWith("CLIENT_")) {
      const query = typeof body.query === "string" ? body.query.trim() : "";
      const lookup = body.action !== "CLIENT_SEARCH";
      const id = lookup && typeof body.customerId === "string" ? body.customerId : null;
      if (lookup ? !id || id.length > 160 : query.length < 2 || query.length > 120) {
        return json({ error: "Informe um nome ou contato válido para buscar." }, 400);
      }
      const { data, error } = await db.rpc("forte_atende_buscar_clientes", {
        p_empresa: profile.empresa_id, p_busca: query, p_cliente: id
      });
      if (error) throw problem(503, "Não foi possível consultar os clientes do FORTE OPERACIONAL.");
      if (!lookup) return json({ items: data.slice(0, 30), more: data.length > 30 });
      if (data.length !== 1) return json({ error: "Cadastro indisponível. Faça a busca novamente." }, 404);
      customer = data[0];

      if (body.action === "CLIENT_WHATSAPP" || (compose && body.channel === "whatsapp")) {
        const phone = normalizePhone(customer.whatsapp || customer.telefone);
        if (!/^[1-9]\d{7,14}$/.test(phone)) return json({ error: "Este cadastro não tem um número válido." }, 422);
        if (compose && phone !== normalizePhone(body.destination)) {
          return json({ error: "O número do cliente mudou. Faça a busca novamente." }, 409);
        }
        const threads = await matchingThreads(db, profile.empresa_id, phone);
        if (!compose) return json({ threads: threads.map(thread => ({ id: thread.id, name: thread.name, phone: thread.phone })) });
        if (threads.length !== 1) {
          return json({ status: "BLOQUEADO", detail: threads.length ?
            "Há mais de uma conversa com esse número. Selecione a correta na aba WhatsApp." :
            "Não há conversa aberta com esse cliente. O primeiro contato pela API exige um modelo aprovado." });
        }
        const { data: state, error: stateError } = await db.from("whatsapp_inbox_state")
          .select("messages:estado->whatsappInboxMessages").eq("empresa_id", profile.empresa_id).maybeSingle();
        if (stateError) throw problem(503, "Não foi possível verificar a janela do WhatsApp.");
        const now = Date.now();
        const eligible = (state?.messages || []).some(message => {
          const at = Date.parse(message.at);
          return message.threadId === threads[0].id && message.direction === "IN" &&
            at <= now && now - at < 86400000;
        });
        if (!eligible) return json({ status: "BLOQUEADO", detail: "Janela de 24 horas fechada. O WhatsApp exige um modelo aprovado para retomar." });
        return json(await sendWhatsApp(url, authorization, threads[0], text, body.commandId));
      }

      if (!emailPattern.test(customer.email)) return json({ error: "Este cadastro não tem um e-mail válido." }, 422);
      if (compose && customer.email.toLowerCase() !== String(body.destination || "").trim().toLowerCase()) {
        return json({ error: "O e-mail do cliente mudou. Faça a busca novamente." }, 409);
      }
    }

    const exclusions = () => db.from("forte_atende_exclusoes");
    const actor = profile.nome?.trim() || user.email || user.id;
    if (body.action === "EXCLUSIONS") {
      const items = [];
      let lastId = 0;
      while (true) {
        const { data, error } = await exclusions()
          .select("id,canal,chave,conversa,evento_em,descricao,excluido_por_nome,excluido_em")
          .eq("empresa_id", profile.empresa_id).is("restaurado_em", null)
          .gt("id", lastId).order("id").limit(250);
        if (error) throw problem(503, "Não foi possível consultar a Caixa de Exclusões.");
        items.push(...data);
        if (data.length < 250) break;
        lastId = data.at(-1).id;
      }
      return json({actor,items:items.filter(item=>item.canal==='email'?canEmail:canWhatsApp)});
    }

    if (body.action === "RESTORE") {
      if (!Number.isSafeInteger(body.id) || body.id < 1) return json({ error: "Registro inválido." }, 400);
      const { error } = await exclusions().update({ restaurado_em: new Date().toISOString(), restaurado_por: user.id })
        .eq("empresa_id", profile.empresa_id).eq("id", body.id).is("restaurado_em", null);
      if (error) throw problem(503, "Não foi possível restaurar a mensagem.");
      return json({ restored: true });
    }

    async function exclude(item) {
      const { error } = await exclusions().insert({
        empresa_id: profile.empresa_id, excluido_por: user.id, excluido_por_nome: actor, ...item
      });
      if (error && error.code !== "23505") throw problem(503, "Não foi possível mover a mensagem.");
      return json({ excluded: true });
    }

    if (body.action === "EXCLUDE" && body.canal === "whatsapp") {
      const messageId = typeof body.messageId === "string" ? body.messageId : "";
      if (!messageId || messageId.length > 500) return json({ error: "Mensagem inválida." }, 400);

      const { data: state, error } = await db.from("whatsapp_inbox_state").select("estado")
        .eq("empresa_id", profile.empresa_id).maybeSingle();
      if (error) throw problem(503, "Não foi possível consultar o WhatsApp.");
      const message = state?.estado?.whatsappInboxMessages?.find(item => item.id === messageId);
      if (!message) return json({ error: "Mensagem não encontrada nesta empresa." }, 404);
      return await exclude({
        canal: "whatsapp", chave: message.id, conversa: message.threadId,
        evento_em: message.at || null,
        descricao: typeof message.text === "string" && message.text.trim() ? message.text.slice(0, 120) : "Mensagem de WhatsApp"
      });
    }
    if (body.action === "EXCLUDE" && body.canal !== "email") return json({ error: "Canal inválido." }, 400);
    const token = env("FORTE_ATENDE_HOSTINGER_MAIL_TOKEN");
    if (!token) return json({ error: "Falta autorizar a Hostinger no servidor do FORTE ATENDE." }, 503);

    const me = await provider("/me", token);
    const mailbox = me.data?.mailboxes?.find(item => item.address?.toLowerCase() === address);
    if (!mailbox?.resourceId) return json({ error: "A credencial não tem acesso à caixa Contato." }, 503);
    const base = "/mailboxes/" + encodeURIComponent(mailbox.resourceId);
    const inbox = base + "/folders/INBOX/messages";
    if (compose) {
      const status = await sendEmail(db, profile.empresa_id, body.commandId,
        [user.id, "cliente", customer.id, customer.email.toLowerCase(), subject, text],
        base, token, { to: [customer.email], subject, text });
      return json({ status });
    }
    if (body.action === "CLIENT_EMAILS") {
      const expected = customer.email.toLowerCase();
      const result = await provider(inbox + "/search?perPage=25&sort=-uid", token, { from: customer.email });
      const matches = result.data.filter(message => message.from?.address?.trim().toLowerCase() === expected);
      return json({ items: matches.map(summary) });
    }
    if (body.action === "LIST") {
      const page = Math.max(1, Math.min(1000, Math.trunc(Number(body.page) || 1)));
      const result = await provider(inbox + "?perPage=25&sort=-uid&page=" + page, token);
      return json({ address, messages: result.data.map(summary), total: result.pagination?.total });
    }

    if (!Number.isSafeInteger(body.uid) || body.uid < 1) return json({ error: "Mensagem inválida." }, 400);
    const messagePath = inbox + "/" + body.uid;
    const { data: message } = await provider(messagePath, token);
    if (body.action === "EXCLUDE") {
      if (!message.messageId || body.messageId !== message.messageId) {
        return json({ error: "Atualize a lista e abra a mensagem novamente." }, 409);
      }
      return await exclude({
        canal: "email", chave: body.uid + ":" + message.messageId,
        descricao: (message.subject || "(Sem assunto)").slice(0, 120)
      });
    }
    if (body.action === "OPEN") {
      const { data: contents } = await provider(messagePath + "/text", token);
      return json({ ...summary(message), text: (contents.text || "").slice(0, 150000),
        htmlOnly: !contents.text && Boolean(contents.html) });
    }

    if (!text || text.length > 10000 || !requestIdPattern.test(String(body.commandId || "")) ||
        !message.messageId || body.messageId !== message.messageId ||
        !emailPattern.test(message.from?.address || "")) {
      return json({ error: "Confira a mensagem original, o remetente e o texto da resposta." }, 400);
    }
    const originalSubject = (message.subject || "").replace(/[\r\n]/g, " ").trim();
    const status = await sendEmail(db, profile.empresa_id, body.commandId, [user.id, message.messageId, text],
      base, token, {
        to: [message.from.address], subject: /^re:/i.test(originalSubject) ? originalSubject : "Re: " + originalSubject,
        text, inReplyTo: { uid: body.uid, folder: "INBOX" }
      });
    return json({ status });
  } catch (error) {
    if (error.status) return json({ error: error.message }, error.status);
    console.error("FORTE_ATENDE_EMAIL_ERROR");
    return json({ error: "Não foi possível acessar a caixa de e-mails." }, 503);
  }
});
