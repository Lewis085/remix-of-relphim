// Consulta status de cobrança Pix no Banco Inter
// Resiliente: nunca devolve 5xx para o polling. Erros viram 200 pending.
// DISTRIBUTED LOCK para renovação de token (mesmo padrão do create-inter-pix).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";
const TELEGRAM_CHAT_ID = "-1003744353930";
const TELEGRAM_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function notifyTelegramOnce(txid: string, amount: string | undefined) {
  try {
    const sb = getSupabaseAdmin();
    // Dedup: tenta inserir; se já existe, sai.
    const { error: insErr } = await sb
      .from("pix_notified")
      .insert({ txid });
    if (insErr) {
      // conflito de chave = já notificado
      return;
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    if (!lovableKey || !tgKey) {
      console.warn("Telegram secrets ausentes");
      return;
    }

    const valor = amount ? `R$ ${amount}` : "valor não informado";
    const text =
      `💙 <b>PIX recebido!</b>\n` +
      `Valor: <b>${valor}</b>\n` +
      `TXID: <code>${txid}</code>`;

    const r = await fetch(`${TELEGRAM_GATEWAY}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      console.warn("Telegram falhou:", r.status, t.slice(0, 200));
    }
  } catch (e) {
    console.warn("notifyTelegramOnce erro:", e);
  }
}

// ── Singletons ────────────────────────────────────────────────
let cachedToken: { value: string; exp: number } | null = null;
let httpClientSingleton: any = null;
let supabaseAdminSingleton: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  supabaseAdminSingleton = createClient(url, key, { auth: { persistSession: false } });
  return supabaseAdminSingleton;
}

function normalizePem(value: string, label: string): string {
  let v = value.trim().replace(/^(['"`])([\s\S]*)\1$/, "$2");
  v = v.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  const m = v.match(/-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/);
  if (!m) throw new Error(`${label} inválido (cabeçalho/rodapé PEM não encontrado). len=${value.length}`);
  const body = m[2].replace(/[\s\r\n]+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(body)) throw new Error(`${label} contém caracteres inválidos no corpo PEM`);
  const wrapped = body.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${m[1]}-----\n${wrapped}\n-----END ${m[1]}-----\n`;
}

function getHttpClient() {
  if (httpClientSingleton) return httpClientSingleton;
  const rawCert = Deno.env.get("INTER_CERT_PEM");
  const rawKey = Deno.env.get("INTER_KEY_PEM");
  if (!rawCert || !rawKey) throw new Error("INTER_CERT_PEM/INTER_KEY_PEM não configurados");
  const cert = normalizePem(rawCert, "INTER_CERT_PEM");
  const key = normalizePem(rawKey, "INTER_KEY_PEM");
  // @ts-ignore
  httpClientSingleton = Deno.createHttpClient({ cert, key });
  return httpClientSingleton;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Token: Leitura do banco ───────────────────────────────────
async function readTokenFromDb(): Promise<{ value: string; exp: number } | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("inter_token_cache")
      .select("access_token, expires_at")
      .eq("id", "singleton")
      .maybeSingle();
    if (!data || !data.access_token) return null;
    return {
      value: data.access_token as string,
      exp: Math.floor(new Date(data.expires_at).getTime() / 1000),
    };
  } catch { return null; }
}

// ── Token: Escrita no banco + libera lock ─────────────────────
async function writeTokenToDb(value: string, exp: number) {
  try {
    const sb = getSupabaseAdmin();
    await sb.from("inter_token_cache").upsert({
      id: "singleton",
      access_token: value,
      expires_at: new Date(exp * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      locked_until: null,
    });
  } catch { /* não-crítico */ }
}

// ── Distributed Lock ──────────────────────────────────────────
async function tryAcquireLock(): Promise<boolean> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("try_acquire_token_lock", { lock_seconds: 10 });
    if (error) return false;
    return data === true;
  } catch { return false; }
}

async function releaseLock() {
  try {
    const sb = getSupabaseAdmin();
    await sb.rpc("release_token_lock");
  } catch { /* não-crítico */ }
}

// ── Token: Busca no Inter (somente o vencedor do lock) ────────
async function fetchNewTokenFromInter(client: any): Promise<{ value: string; exp: number }> {
  const clientId = Deno.env.get("INTER_CLIENT_ID");
  const clientSecret = Deno.env.get("INTER_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("INTER_CLIENT_ID/SECRET não configurados");

  const bodyParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "cob.write cob.read pix.read",
  });

  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(800 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400));

    try {
      const resp = await fetch(`${INTER_BASE}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: bodyParams,
        // @ts-ignore
        client,
      });
      const text = await resp.text();
      if (resp.status === 429 || resp.status >= 500) {
        lastErr = `${resp.status}`;
        continue;
      }
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
      if (!resp.ok || !data?.access_token) {
        throw new Error(`OAuth falhou: ${resp.status} ${text || "(empty body)"}`);
      }
      const exp = Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600);
      return { value: data.access_token as string, exp };
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("OAuth falhou")) throw e;
      lastErr = `network: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  throw new Error(`OAuth esgotou retries: ${lastErr}`);
}

// ── getToken: Orquestra busca com Distributed Lock ────────────
async function getToken(client: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // 1) memória local
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  // 2) banco compartilhado
  const fromDb = await readTokenFromDb();
  if (fromDb && fromDb.exp - 60 > Math.floor(Date.now() / 1000)) {
    cachedToken = fromDb;
    return fromDb.value;
  }

  // 3) Distributed Lock
  const gotLock = await tryAcquireLock();

  if (gotLock) {
    try {
      const fresh = await fetchNewTokenFromInter(client);
      cachedToken = fresh;
      await writeTokenToDb(fresh.value, fresh.exp);
      return fresh.value;
    } catch (e) {
      await releaseLock();
      throw e;
    }
  }

  // Perdeu o lock: polling no banco até o vencedor salvar (max 12s)
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    await sleep(300);
    const fresh = await readTokenFromDb();
    if (fresh && fresh.exp - 60 > Math.floor(Date.now() / 1000)) {
      cachedToken = fresh;
      return fresh.value;
    }
  }

  // Timeout: tenta buscar direto
  const retryLock = await tryAcquireLock();
  if (retryLock) {
    try {
      const fresh = await fetchNewTokenFromInter(client);
      cachedToken = fresh;
      await writeTokenToDb(fresh.value, fresh.exp);
      return fresh.value;
    } catch (e) {
      await releaseLock();
      throw e;
    }
  }

  const lastChance = await readTokenFromDb();
  if (lastChance && lastChance.exp - 60 > Math.floor(Date.now() / 1000)) {
    cachedToken = lastChance;
    return lastChance.value;
  }

  throw new Error("Token indisponível após espera no lock distribuído");
}

// Devolve sempre 200 pending em qualquer falha para não derrubar o polling.
function pending(txid: string, raw = "PENDING") {
  return new Response(
    JSON.stringify({ status: "pending", id: txid, raw_status: raw }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const txid = url.searchParams.get("id") || "";
  if (!txid) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const client = getHttpClient();
    let token: string;
    try {
      token = await getToken(client);
    } catch (e) {
      console.warn("getToken falhou:", e);
      return pending(txid, "TOKEN_UNAVAILABLE");
    }

    const resp = await fetch(`${INTER_BASE}/pix/v2/cob/${txid}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      // @ts-ignore
      client,
    });
    const text = await resp.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }

    if (!resp.ok) {
      // Qualquer 4xx/5xx do Inter: mantém polling ativo
      console.warn(`Inter cob status=${resp.status} body=${text.slice(0, 200)}`);
      return pending(txid, `INTER_${resp.status}`);
    }

    const interStatus = data?.status;
    const status = interStatus === "CONCLUIDA" ? "approved" : "pending";

    if (status === "approved") {
      // dispara notificação em background, sem bloquear a resposta
      notifyTelegramOnce(txid, data?.valor?.original).catch(() => {});
    }

    return new Response(
      JSON.stringify({ status, id: txid, raw_status: interStatus, amount: data?.valor?.original }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("check-inter-pix erro inesperado:", err);
    // Nunca devolve 5xx ao cliente — polling continua
    return pending(txid, "INTERNAL_ERROR");
  }
});
