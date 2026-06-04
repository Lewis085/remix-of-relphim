import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTikTokCapi } from "../_shared/tiktokCapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TELEGRAM_CHAT_ID = "-1003744353930";
const TELEGRAM_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

let supabaseAdminSingleton: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  supabaseAdminSingleton = createClient(url, key, { auth: { persistSession: false } });
  return supabaseAdminSingleton;
}

async function notifyTelegramOnce(txid: string, amount: string | undefined, donorInfo?: any) {
  try {
    const sb = getSupabaseAdmin();
    // Dedup table to ensure we only send once per txid
    const { error: insErr } = await sb.from("pix_notified").insert({ txid });
    if (insErr) {
      // already notified
      return;
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    if (!lovableKey || !tgKey) return;

    const valor = amount ? `R$ ${amount}` : "valor não informado";
    
    let text = `💙 <b>PIX recebido (Webhook)!</b>\nValor: <b>${valor}</b>\nTXID: <code>${txid}</code>`;
    if (donorInfo && donorInfo.donor_name) {
      text += `\nDoador: ${donorInfo.donor_name}`;
    }

    await fetch(`${TELEGRAM_GATEWAY}/sendMessage`, {
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
  } catch (e) {
    console.error("notifyTelegramOnce erro:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Inter sends a POST with a body containing { "pix": [ ... ] }
    const payload = await req.json();
    if (!payload || !Array.isArray(payload.pix)) {
      return new Response("Invalid payload", { status: 400 });
    }

    const sb = getSupabaseAdmin();

    for (const item of payload.pix) {
      const txid = item.txid;
      const valor = item.valor;
      if (!txid) continue;

      // 1. Fetch transaction
      const { data: tx } = await sb
        .from("pix_transactions")
        .select("*")
        .eq("txid", txid)
        .maybeSingle();

      // 2. Update transaction status
      if (tx && tx.status !== "approved") {
        await sb
          .from("pix_transactions")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .eq("txid", txid);
      }

      // 3. Notify Telegram (and in the future, Utmify)
      await notifyTelegramOnce(txid, valor, tx);
      
      // 4. TikTok CAPI (Purchase)
      if (tx) {
        await sendTikTokCapi({
          eventName: "Purchase",
          eventId: txid,
          amount: valor,
          url: tx.url,
          ttclid: tx.ttclid,
          ipAddress: tx.ip_address,
          userAgent: tx.user_agent,
          donorEmail: tx.donor_email,
          donorPhone: tx.donor_phone,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Must return 200 to acknowledge receipt to Banco Inter, so they don't block us with retries
    return new Response("ok", { status: 200 }); 
  }
});
