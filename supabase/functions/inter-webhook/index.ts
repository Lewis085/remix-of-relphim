import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendTikTokCapi } from "./_shared/tiktokCapi.ts";
import { sendUtmifyPostback } from "./_shared/utmify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


let supabaseAdminSingleton: ReturnType<typeof createClient> | null = null;

function getSupabaseAdmin() {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  supabaseAdminSingleton = createClient(url, key, { auth: { persistSession: false } });
  return supabaseAdminSingleton;
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


      // 4. TikTok CAPI & Utmify (Purchase / Paid)
      if (tx) {
        // TikTok
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

        // Utmify
        await sendUtmifyPostback({
          orderId: txid,
          status: "paid",
          amountInCents: Math.round(Number(valor) * 100),
          donorName: tx.donor_name,
          donorEmail: tx.donor_email,
          donorPhone: tx.donor_phone,
          ipAddress: tx.ip_address,
          url: tx.url,
          createdAt: tx.created_at, // Send original creation date if available
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
