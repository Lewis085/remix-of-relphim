// fb-browser-event — Edge Function leve para espelhar eventos do Pixel na CAPI
// Recebe eventos do frontend (ViewContent, etc.) e encaminha para a Graph API do Facebook.
// Isso fecha o gap de cobertura entre Pixel e CAPI sem expor o access token no cliente.

const FB_PIXEL_ID = "3789383634536507";
const FB_ACCESS_TOKEN = "EAAbLLoCQTbYBRhO9XfVhm4Ul6i7RFF1JbECZCDZB2xdXK9Q9ALnXNTF47H9AqCxd4K1TVEg8MWZCgfM0u3YkUmyL7rMh6ogPXPSqqYa6epcbUHtJqRqVZBxG11DFA9AeDR3hD5h4h4y2ce7hZAR6JQMhyzUGE8ZBZAPodK4f4jgZAZCZA3xgKO4jQZALZBrUkhX4ZAs6XoQZDZD";

const ALLOWED_EVENTS = ["ViewContent", "InitiateCheckout"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event_name, event_id, url } = body;

    // Validação: só aceita eventos conhecidos e com event_id para desduplicar
    if (!event_name || !ALLOWED_EVENTS.includes(event_name)) {
      return new Response(JSON.stringify({ error: "Invalid event_name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!event_id) {
      return new Response(JSON.stringify({ error: "event_id is required for deduplication" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_id,
          event_source_url: url || "https://dudapacientezero.com.br/",
          user_data: {
            client_ip_address: ipAddress,
            client_user_agent: userAgent,
          },
          custom_data: {
            content_ids: ["doacao-kerlen"],
            content_type: "product",
            content_name: "Doação Kerlen",
          },
        },
      ],
    };

    const fbRes = await fetch(
      `https://graph.facebook.com/v20.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
    );

    if (!fbRes.ok) {
      const errText = await fbRes.text();
      console.warn(`FB CAPI falhou para ${event_name}:`, fbRes.status, errText);
    } else {
      const respJson = await fbRes.json();
      console.log(`FB CAPI sucesso para ${event_name}:`, respJson);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("fb-browser-event error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
