// Consulta status de cobrança Pix no Banco Inter
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";

let cachedToken: { value: string; exp: number } | null = null;

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


async function getHttpClient() {
  const rawCert = Deno.env.get("INTER_CERT_PEM");
  const rawKey = Deno.env.get("INTER_KEY_PEM");
  const cert = rawCert ? normalizePem(rawCert, "INTER_CERT_PEM") : null;
  const key = rawKey ? normalizePem(rawKey, "INTER_KEY_PEM") : null;
  if (!cert || !key) throw new Error("INTER_CERT_PEM/INTER_KEY_PEM não configurados");
  // @ts-ignore
  return Deno.createHttpClient({ cert, key });
}

async function getToken(client: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 30 > now) return cachedToken.value;

  const clientId = Deno.env.get("INTER_CLIENT_ID");
  const clientSecret = Deno.env.get("INTER_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("INTER_CLIENT_ID/SECRET não configurados");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "cob.write cob.read pix.read",
  });
  const resp = await fetch(`${INTER_BASE}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    // @ts-ignore
    client,
  });
  const text = await resp.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
  if (!resp.ok) throw new Error(`OAuth falhou: ${resp.status} ${text || "(empty body)"}`);
  if (!data?.access_token) throw new Error(`OAuth sem access_token: ${text || "(empty body)"}`);
  cachedToken = { value: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return cachedToken.value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const txid = url.searchParams.get("id");
    if (!txid) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = await getHttpClient();
    let token: string;
    try {
      token = await getToken(client);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Em caso de rate-limit no OAuth, devolve pending para o polling continuar sem 500
      if (msg.includes("429")) {
        return new Response(
          JSON.stringify({ status: "pending", id: txid, raw_status: "RATE_LIMITED" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw e;
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
      return new Response(JSON.stringify({ error: "Inter API error", status: resp.status, details: data || text }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inter status: ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
    const interStatus = data?.status;
    const status = interStatus === "CONCLUIDA" ? "approved" : "pending";

    return new Response(
      JSON.stringify({ status, id: txid, raw_status: interStatus, amount: data?.valor?.original }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
