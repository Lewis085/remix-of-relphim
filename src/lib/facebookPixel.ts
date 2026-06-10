declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Envia evento para a CAPI via Supabase Edge Function
// Isso fecha o gap de cobertura Pixel x CAPI sem expor o token no cliente.
async function sendToCapi(eventName: string, eventId: string, url?: string) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/functions/v1/fb-browser-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ event_name: eventName, event_id: eventId, url }),
    });
  } catch {
    // Não critico erros de tracking — nunca pode bloquear o fluxo do usuário
  }
}

export const trackViewContent = () => {
  const eventId = crypto.randomUUID();
  
  if (typeof window.fbq === "function") {
    window.fbq("track", "ViewContent", {
      content_name: "Doação Kerlen",
      content_ids: ["doacao-kerlen"],
      content_type: "product"
    }, { eventID: eventId });
  }

  // Espelha na CAPI para fechar o gap de cobertura
  sendToCapi("ViewContent", eventId, window.location.href);
};

// eventId deve ser gerado no frontend e passado também para o Supabase (CAPI)
// para que o Facebook faça a desduplicação correta entre Pixel e CAPI.
export const trackInitiateCheckout = (value: number, eventId?: string) => {
  if (typeof window.fbq === "function") {
    const options = eventId ? { eventID: eventId } : undefined;
    window.fbq("track", "InitiateCheckout", {
      content_name: "Doação Kerlen",
      content_ids: ["doacao-kerlen"],
      content_type: "product",
      value: value,
      currency: "BRL"
    }, options);
  }
};

export const trackPurchase = (value: number, order_id?: string) => {
  if (typeof window.fbq === "function") {
    const options = order_id ? { eventID: order_id } : undefined;
    window.fbq("track", "Purchase", {
      content_name: "Doação Kerlen",
      content_ids: ["doacao-kerlen"],
      content_type: "product",
      value: value,
      currency: "BRL"
    }, options);
  }
};
