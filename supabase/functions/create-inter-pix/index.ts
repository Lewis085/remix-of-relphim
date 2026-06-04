// Cria cobrança imediata Pix no Banco Inter (mTLS + OAuth2)
// Resiliente para picos: token em 3 camadas (memória → DB → renovação),
// DISTRIBUTED LOCK anti-thundering-herd, retry com backoff exponencial + jitter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTikTokCapi } from "../_shared/tiktokCapi.ts";
import { sendUtmifyPostback } from "../_shared/utmify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";
const PIX_KEY = "67014485000143";

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
  // @ts-ignore - Deno unstable
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
    const exp = Math.floor(new Date(data.expires_at).getTime() / 1000);
    return { value: data.access_token as string, exp };
  } catch (e) {
    console.warn("readTokenFromDb falhou:", e);
    return null;
  }
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
      locked_until: null, // libera o lock
    });
  } catch (e) {
    console.warn("writeTokenToDb falhou:", e);
  }
}

// ── Distributed Lock: tenta adquirir via RPC ──────────────────
async function tryAcquireLock(): Promise<boolean> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.rpc("try_acquire_token_lock", { lock_seconds: 10 });
    if (error) {
      console.warn("tryAcquireLock RPC falhou:", error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}

// ── Distributed Lock: libera via RPC ──────────────────────────
async function releaseLock() {
  try {
    const sb = getSupabaseAdmin();
    await sb.rpc("release_token_lock");
  } catch { /* não-crítico */ }
}

// ── Token: Busca no Inter (chamado apenas pelo "vencedor" do lock)
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
        lastErr = `${resp.status} ${text.slice(0, 200)}`;
        console.warn(`OAuth retry ${attempt + 1}/4 status=${resp.status}`);
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
      console.warn(`OAuth network error attempt ${attempt + 1}/4:`, lastErr);
    }
  }
  throw new Error(`OAuth esgotou retries: ${lastErr}`);
}

// ── getToken: Orquestra a busca de token com Distributed Lock ─
// Fluxo:
// 1. Checa memória local
// 2. Checa banco compartilhado
// 3. Tenta adquirir o lock
//    - Se ganhou: busca token no Inter, salva no banco, libera lock
//    - Se perdeu: fica em polling no banco até o vencedor salvar (max 12s)
async function getToken(client: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // 1) cache em memória da instância
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  // 2) cache compartilhado no banco
  const fromDb = await readTokenFromDb();
  if (fromDb && fromDb.exp - 60 > Math.floor(Date.now() / 1000)) {
    cachedToken = fromDb;
    return fromDb.value;
  }

  // 3) Tenta adquirir o lock (distributed mutex)
  const gotLock = await tryAcquireLock();

  if (gotLock) {
    // ── EU SOU O VENCEDOR: vou buscar o token ──────────────
    try {
      const fresh = await fetchNewTokenFromInter(client);
      cachedToken = fresh;
      await writeTokenToDb(fresh.value, fresh.exp);
      return fresh.value;
    } catch (e) {
      // Se falhou, libera o lock para outra instância tentar
      await releaseLock();
      throw e;
    }
  }

  // ── EU PERDI O LOCK: espero o vencedor salvar o token ────
  // Polling no banco a cada 300ms, por no máximo 12 segundos.
  const maxWait = 12_000;
  const pollInterval = 300;
  const deadline = Date.now() + maxWait;

  while (Date.now() < deadline) {
    await sleep(pollInterval);
    const fresh = await readTokenFromDb();
    const nowCheck = Math.floor(Date.now() / 1000);
    if (fresh && fresh.exp - 60 > nowCheck) {
      cachedToken = fresh;
      return fresh.value;
    }
  }

  // Timeout: ninguém salvou. Tenta adquirir o lock e buscar direto.
  console.warn("Token lock timeout — tentando busca direta");
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

  // Última tentativa: talvez agora tenha no banco
  const lastChance = await readTokenFromDb();
  if (lastChance && lastChance.exp - 60 > Math.floor(Date.now() / 1000)) {
    cachedToken = lastChance;
    return lastChance.value;
  }

  throw new Error("Token indisponível após espera no lock distribuído");
}

function makeProductTxid(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const raw = `ORD${ts}${rand}`.replace(/[^A-Za-z0-9]/g, "");
  return raw.slice(0, 32).padEnd(26, "0");
}

// Envia "PIX gerado" para o Telegram em background (não bloqueia a resposta).
// Erros são silenciosos para nunca afetar a geração do PIX.
function notifyPixCreated(txid: string, valor: string) {
  const promise = (async () => {
    try {
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      const tgKey = Deno.env.get("TELEGRAM_API_KEY");
      if (!lovableKey || !tgKey) return;
      const text =
        `🟡 <b>PIX gerado</b>\n` +
        `Valor: <b>R$ ${valor}</b>\n` +
        `TXID: <code>${txid}</code>`;
      // timeout de 3s — Telegram não pode segurar a resposta nunca
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": tgKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: "-1003744353930",
          text,
          parse_mode: "HTML",
        }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(t));
    } catch (e) {
      console.warn("notifyPixCreated falhou:", e);
    }
  })();
  // Mantém vivo após o response (em runtimes que suportam)
  // @ts-ignore
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(promise);
  }
}

// ── Criação do PIX com retry + jitter exponencial ─────────────
async function createCob(client: any, token: string, cobPayload: any): Promise<{ txid: string; cob: any }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const txid = makeProductTxid();

    if (attempt > 0) {
      // Jitter exponencial: 1.2s, 2.4s + aleatoriedade
      await sleep(1200 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 800));
    }

    try {
      const cobResp = await fetch(`${INTER_BASE}/pix/v2/cob/${txid}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(cobPayload),
        // @ts-ignore
        client,
      });
      const cobText = await cobResp.text();
      let cob: any = {};
      try { cob = cobText ? JSON.parse(cobText) : {}; } catch { /* keep raw */ }

      if (cobResp.ok) {
        return { txid, cob };
      }

      // 429 ou 503: retry com jitter
      if ((cobResp.status === 429 || cobResp.status === 503) && attempt < 2) {
        console.warn(`Cob retry ${attempt + 1}/3 status=${cobResp.status}`);
        continue;
      }

      console.error("Inter cob error", cobResp.status, cobText);
      throw new Error(`Inter API error: ${cobResp.status} ${cobText.slice(0, 200)}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Inter API error")) throw e;
      console.error(`Cob network error attempt ${attempt + 1}/3:`, e);
      if (attempt >= 2) throw e;
    }
  }
  throw new Error("Falha ao criar cobrança PIX após retentativas");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const amountCents = Number(body?.amount);
    if (!Number.isInteger(amountCents) || amountCents < 2000 || amountCents > 200000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = getHttpClient();
    const token = await getToken(client);
    const valor = (amountCents / 100).toFixed(2);

    const cobPayload = {
      calendario: { expiracao: 900 },
      valor: { original: valor },
      chave: PIX_KEY,
    };

    const { txid, cob } = await createCob(client, token, cobPayload);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Save transaction to database for webhook usage
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from("pix_transactions").insert({
      txid,
      amount: valor,
      donor_name: body?.donor_name || null,
      donor_email: body?.donor_email || null,
      donor_phone: body?.donor_phone || null,
      ttclid: body?.ttclid || null,
      url: body?.url || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'pending'
    }).catch(err => console.error("Failed to insert pix_transaction:", err));

    // Dispara CAPI: InitiateCheckout
    sendTikTokCapi({
      eventName: "InitiateCheckout",
      eventId: txid,
      amount: valor,
      url: body?.url,
      ttclid: body?.ttclid,
      ipAddress,
      userAgent,
      donorEmail: body?.donor_email,
      donorPhone: body?.donor_phone,
    });

    // Dispara Utmify: PIX Gerado (waiting_payment)
    sendUtmifyPostback({
      orderId: txid,
      status: "waiting_payment",
      amountInCents: amountCents,
      donorName: body?.donor_name,
      donorEmail: body?.donor_email,
      donorPhone: body?.donor_phone,
      ipAddress,
      url: body?.url,
    });

    // Dispara notificação em background — nunca bloqueia/atrasa a resposta
    notifyPixCreated(txid, valor);

    return new Response(
      JSON.stringify({
        transaction_id: txid,
        reference: txid,
        qr_code: cob.pixCopiaECola,
        qr_code_base64: undefined,
        amount: amountCents,
        expires_at: cob?.calendario?.expiracao,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error. Please try again later." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
