const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PARADISE_URL = "https://multi.paradisepags.com/api/v1/transaction.php";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PARADISE_API_KEY");
    if (!apiKey) throw new Error("PARADISE_API_KEY not configured");

    const body = await req.json();
    const amount = Number(body?.amount); // em centavos
    if (!Number.isInteger(amount) || amount < 100) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `MM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const payload = {
      amount,
      description: "Taxa de verificação",
      reference,
      source: "api_externa",
      customer: {
        name: "Usuário anônimo",
        email: "anonuser@gmail.com",
        phone: "11999999999",
        document: "05531510101",
      },
    };

    const resp = await fetch(PARADISE_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("Paradise error", resp.status, data);
      return new Response(JSON.stringify({ error: "Paradise API error", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        transaction_id: data.transaction_id,
        reference: data.id ?? reference,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        amount: data.amount,
        expires_at: data.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
