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
        // Facebook
        await sendFacebookCapi({
          eventName: "Purchase",
          eventId: txid,
          amount: valor,
          url: tx.url,
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
