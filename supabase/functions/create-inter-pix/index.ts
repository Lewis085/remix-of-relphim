// Cria cobrança imediata Pix no Banco Inter (mTLS + OAuth2)
// Resiliente para picos: token em 3 camadas (memória → DB → renovação),
// DISTRIBUTED LOCK anti-thundering-herd, retry com backoff exponencial + jitter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// ── Facebook CAPI (inlined) ─────────────────────────────────────
async function hashSha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface FacebookCapiData {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  amount: string | number;
  url?: string;
  ipAddress?: string;
  userAgent?: string;
  donorEmail?: string;
  donorPhone?: string;
}

async function sendFacebookCapi(data: FacebookCapiData) {
  const FB_PIXEL_ID = "3789383634536507";
  const FB_ACCESS_TOKEN = "EAAbLLoCQTbYBRhO9XfVhm4Ul6i7RFF1JbECZCDZB2xdXK9Q9ALnXNTF47H9AqCxd4K1TVEg8MWZCgfM0u3YkUmyL7rMh6ogPXPSqqYa6epcbUHtJqRqVZBxG11DFA9AeDR3hD5h4h4y2ce7hZAR6JQMhyzUGE8ZBZAPodK4f4jgZAZCZA3xgKO4jQZALZBrUkhX4ZAs6XoQZDZD";
  
  const userData: any = {
    client_ip_address: data.ipAddress,
    client_user_agent: data.userAgent,
  };

  if (data.donorEmail) userData.em = await hashSha256(data.donorEmail.trim().toLowerCase());
  if (data.donorPhone) {
    const cleanPhone = data.donorPhone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) userData.ph = await hashSha256(`55${cleanPhone}`);
  }

  const payload = {
    data: [
      {
        event_name: data.eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: data.eventId,
        event_source_url: data.url || "https://dudapacientezero.com.br/",
        user_data: userData,
        custom_data: {
          currency: "BRL",
          value: Number(data.amount),
          content_ids: ["doacao-kerlen"],
          content_type: "product",
          content_name: "Doação Kerlen"
        }
      }
    ]
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) { const errText = await response.text(); console.warn(`FB CAPI falhou para ${data.eventName}:`, response.status, errText); }
    else { const respJson = await response.json(); console.log(`FB CAPI sucesso para ${data.eventName}:`, respJson); }
  } catch (err) { console.error(`Erro ao disparar FB CAPI (${data.eventName}):`, err); }
}

// ── Utmify (inlined) ──────────────────────────────────────────
interface UtmifyOrderData {
  orderId: string;
  status: "waiting_payment" | "paid";
  amountInCents: number;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  ipAddress?: string;
  url?: string;
  createdAt?: string;
}

function extractUtms(urlStr?: string) {
  const nullUtms = { utm_source: null, utm_campaign: null, utm_medium: null, utm_content: null, utm_term: null, src: null, sck: null };
  if (!urlStr) return nullUtms;
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const utms: Record<string, any> = {};
    for (const field of ["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "src", "sck"]) {
      utms[field] = params.has(field) ? params.get(field)! : null;
    }
    return utms;
  } catch { return nullUtms; }
}

async function sendUtmifyPostback(data: UtmifyOrderData) {
  const API_TOKEN = "D6sjrdgGMIkI9f9zh5VTPd4x2FzHRvASNrPJ";
  const payload: any = {
    orderId: data.orderId, platform: "pacientzero", paymentMethod: "pix", status: data.status,
    customer: { document: null },
    products: [{ id: "oferta-validada", name: "Oferta Validada", quantity: 1, priceInCents: data.amountInCents, planId: "unico", planName: "Doacao Unica" }],
    commission: { totalPriceInCents: data.amountInCents, gatewayFeeInCents: 0, userCommissionInCents: data.amountInCents },
    isTest: false,
    trackingParameters: extractUtms(data.url)
  };
  const d = data.createdAt ? new Date(data.createdAt) : new Date();
  const dateStr = d.toISOString().replace("T", " ").substring(0, 19);
  payload.createdAt = dateStr;
  payload.approvedDate = dateStr;
  if (data.donorName) payload.customer.name = data.donorName;
  if (data.donorEmail) payload.customer.email = data.donorEmail.trim().toLowerCase();
  if (data.donorPhone) payload.customer.phone = data.donorPhone.replace(/\D/g, "");
  if (data.ipAddress) payload.customer.ip = data.ipAddress;
  try {
    const response = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: { "x-api-token": API_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) { const errText = await response.text(); console.warn(`Utmify falhou para status ${data.status}:`, response.status, errText); }
    else { const respJson = await response.json(); console.log(`Utmify sucesso para status ${data.status}:`, respJson); }
  } catch (err) { console.error(`Erro ao disparar Utmify (${data.status}):`, err); }
}

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
    try {
      const { error: insertError } = await supabaseAdmin.from("pix_transactions").insert({
        txid,
        amount: valor,
        donor_name: body?.donor_name || null,
        donor_email: body?.donor_email || null,
        donor_phone: body?.donor_phone || null,
        url: body?.url || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending'
      });
      if (insertError) console.error("Failed to insert pix_transaction:", insertError.message);
    } catch (err) {
      console.error("Failed to insert pix_transaction:", err);
    }

    // Dispara CAPI: InitiateCheckout
    sendFacebookCapi({
      eventName: "InitiateCheckout",
      eventId: txid,
      amount: valor,
      url: body?.url,
      ipAddress,
      userAgent,
      donorEmail: body?.donor_email,
      donorPhone: body?.donor_phone,
    }).catch(err => console.error("FB CAPI error:", err));

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
    }).catch(err => console.error("Utmify postback error:", err));



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
