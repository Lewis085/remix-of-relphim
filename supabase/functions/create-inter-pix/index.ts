// Cria cobrança imediata Pix no Banco Inter (mTLS + OAuth2)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";
const PIX_KEY = "67014485000143";

let cachedToken: { value: string; exp: number } | null = null;

function normalizePem(value: string, label: string): string {
  let v = value.trim().replace(/^(['"`])([\s\S]*)\1$/, "$2");
  // Unescape literal \n / \r\n that some secret stores save
  v = v.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();

  // Extract header/footer + body
  const m = v.match(/-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/);
  if (!m) {
    throw new Error(`${label} inválido (cabeçalho/rodapé PEM não encontrado). len=${value.length}`);
  }
  const label2 = m[1];
  // Body: strip all whitespace, then rewrap in 64-char lines
  const body = m[2].replace(/[\s\r\n]+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error(`${label} contém caracteres inválidos no corpo PEM`);
  }
  const wrapped = body.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${label2}-----\n${wrapped}\n-----END ${label2}-----\n`;
}


async function getHttpClient() {
  const rawCert = Deno.env.get("INTER_CERT_PEM");
  const rawKey = Deno.env.get("INTER_KEY_PEM");
  const cert = rawCert ? normalizePem(rawCert, "INTER_CERT_PEM") : null;
  const key = rawKey ? normalizePem(rawKey, "INTER_KEY_PEM") : null;
  if (!cert || !key) throw new Error("INTER_CERT_PEM/INTER_KEY_PEM não configurados");
  // @ts-ignore - Deno unstable API disponível no edge runtime
  return Deno.createHttpClient({ cert, key });
}

async function getToken(client: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 30 > now) return cachedToken.value;

  const clientId = Deno.env.get("INTER_CLIENT_ID");
  const clientSecret = Deno.env.get("INTER_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("INTER_CLIENT_ID/SECRET não configurados");

  const bodyParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "cob.write cob.read pix.read",
  });

  // Tenta obter token com 1 retry após 1.5s em caso de rate limit
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await fetch(`${INTER_BASE}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyParams,
      // @ts-ignore
      client,
    });

    if (resp.status === 429 && attempt === 0) {
      console.warn("Inter OAuth rate limited, aguardando 1.5s para retry...");
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Inter OAuth error", resp.status, data);
      throw new Error(`OAuth falhou: ${resp.status} ${JSON.stringify(data)}`);
    }
    cachedToken = { value: data.access_token, exp: now + Number(data.expires_in || 3600) };
    return cachedToken.value;
  }

  throw new Error("OAuth falhou após retry (rate limit persistente)");
}

function makeProductTxid(): string {
  // txid legível no formato ORD-{pedido_id}. Mantém 26-35 chars alfanuméricos.
  // pedido_id derivado de timestamp + random para garantir unicidade.
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const pedidoId = `${ts}${rand}`;
  const raw = `ORD${pedidoId}`.replace(/[^A-Za-z0-9]/g, "");
  return raw.slice(0, 32).padEnd(26, "0");
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const amountCents = Number(body?.amount);
    if (!Number.isInteger(amountCents) || amountCents < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = await getHttpClient();
    const token = await getToken(client);
    const txid = makeProductTxid();
    const valor = (amountCents / 100).toFixed(2);

    const cobPayload = {
      calendario: { expiracao: 900 },
      valor: { original: valor },
      chave: PIX_KEY,
      solicitacaoPagador: "30Dias 7kgs",
      infoAdicionais: [
        { nome: "Produto", valor: "30Dias 7kgs" },
        { nome: "Referencia", valor: txid },
      ],
    };

    const cobResp = await fetch(`${INTER_BASE}/pix/v2/cob/${txid}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cobPayload),
      // @ts-ignore
      client,
    });
    const cob = await cobResp.json();
    if (!cobResp.ok) {
      console.error("Inter cob error", cobResp.status, cob);
      return new Response(JSON.stringify({ error: "Inter API error", details: cob }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // O QR Code é renderizado no frontend via qrcode.react a partir do pixCopiaECola.
    // Removida a requisição extra GET /loc/{id}/qrcode que causava timeouts desnecessários.

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
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

