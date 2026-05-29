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

async function getHttpClient() {
  const cert = Deno.env.get("INTER_CERT_PEM");
  const key = Deno.env.get("INTER_KEY_PEM");
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

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "cob.write cob.read pix.read",
  });

  const resp = await fetch(`${INTER_BASE}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    // @ts-ignore
    client,
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error("Inter OAuth error", resp.status, data);
    throw new Error(`OAuth falhou: ${resp.status} ${JSON.stringify(data)}`);
  }
  cachedToken = { value: data.access_token, exp: now + Number(data.expires_in || 3600) };
  return cachedToken.value;
}

function makeTxid(): string {
  // 26-35 chars alfanuméricos
  const rand = crypto.randomUUID().replace(/-/g, "");
  return ("MM" + rand).slice(0, 32);
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
    const txid = makeTxid();
    const valor = (amountCents / 100).toFixed(2);

    const cobPayload = {
      calendario: { expiracao: 900 },
      valor: { original: valor },
      chave: PIX_KEY,
      solicitacaoPagador: "30Dias 7kgs",
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

    // Gera imagem do QR a partir do location
    let qr_code_base64: string | undefined;
    const locId = cob?.loc?.id;
    if (locId) {
      const qrResp = await fetch(`${INTER_BASE}/pix/v2/loc/${locId}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
        // @ts-ignore
        client,
      });
      if (qrResp.ok) {
        const qrData = await qrResp.json();
        if (qrData?.imagemQrcode) {
          qr_code_base64 = qrData.imagemQrcode.startsWith("data:")
            ? qrData.imagemQrcode
            : `data:image/png;base64,${qrData.imagemQrcode}`;
        }
      } else {
        await qrResp.text();
      }
    }

    return new Response(
      JSON.stringify({
        transaction_id: txid,
        reference: txid,
        qr_code: cob.pixCopiaECola,
        qr_code_base64,
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
