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

export const trackInitiateCheckout = (value: number) => {
  if (typeof window.fbq === "function") {
    window.fbq("track", "InitiateCheckout", {
      content_name: "Doação Kerlen",
      content_ids: ["doacao-kerlen"],
      content_type: "product",
      value: value,
      currency: "BRL"
    });
  }
};

export const trackPurchase = (value: number, order_id?: string) => {
  if (typeof window.fbq === "function") {
    // order_id is sent as eventID to allow deduplication with CAPI
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
