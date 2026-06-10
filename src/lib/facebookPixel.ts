declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const trackViewContent = () => {
  if (typeof window.fbq === "function") {
    window.fbq("track", "ViewContent", {
      content_name: "Doação Kerlen",
      content_ids: ["doacao-kerlen"],
      content_type: "product"
    });
  }
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
