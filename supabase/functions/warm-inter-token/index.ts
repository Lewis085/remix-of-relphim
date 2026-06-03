// Renova periodicamente o token OAuth do Banco Inter no cache compartilhado.
// Pode ser chamada por cron (pg_cron + pg_net) a cada 30 minutos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const INTER_BASE = "https://cdpj.partners.bancointer.com.br";

function normalizePem(value: string, label: string): string {
  let v = value.trim().replace(/^(['"`])([\s\S]*)\1$/, "$2");
  v = v.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  const m = v.match(/-----BEGIN ([A-Z ]+)-----([\s\S]+?)-----END \1-----/);
  if (!m) throw new Error(`${label} inválido`);
  const body = m[2].replace(/[\s\r\n]+/g, "");
  const wrapped = body.match(/.{1,64}/g)!.join("\n");
  return `-----BEGIN ${m[1]}-----\n${wrapped}\n-----END ${m[1]}-----\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cert = normalizePem(Deno.env.get("INTER_CERT_PEM")!, "INTER_CERT_PEM");
    const key = normalizePem(Deno.env.get("INTER_KEY_PEM")!, "INTER_KEY_PEM");
    // @ts-ignore
    const client = Deno.createHttpClient({ cert, key });

    const bodyParams = new URLSearchParams({
      client_id: Deno.env.get("INTER_CLIENT_ID")!,
      client_secret: Deno.env.get("INTER_CLIENT_SECRET")!,
      grant_type: "client_credentials",
      scope: "cob.write cob.read pix.read",
    });

    const resp = await fetch(`${INTER_BASE}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: bodyParams,
      // @ts-ignore
      client,
    });
    const text = await resp.text();
    if (!resp.ok) {
      console.error("warm-inter-token OAuth falhou:", resp.status, text.slice(0, 300));
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = JSON.parse(text);
    const exp = Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    await sb.from("inter_token_cache").upsert({
      id: "singleton",
      access_token: data.access_token,
      expires_at: new Date(exp * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, expires_in: data.expires_in }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
