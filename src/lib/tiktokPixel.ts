// Helper para disparar eventos do TikTok Pixel.
// O script é carregado em index.html (sdkid: D7OECCJC77U471PH1560).

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page: () => void;
      identify?: (params: Record<string, unknown>) => void;
    };
  }
}

/** Dispara o evento de visualização de conteúdo (Landing Page) */
export const trackViewContent = () => {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track("ViewContent", {
      content_type: "product",
      content_name: "Doação Duda - Landing Page",
    });
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
  }
};

/** Faz o Advanced Matching do usuário com os dados do formulário para otimizar ROAS */
export const trackIdentify = (email: string, phone: string) => {
  if (typeof window === "undefined" || !window.ttq || !window.ttq.identify) return;
  try {
    const cleanPhone = phone.replace(/\D/g, "");
    window.ttq.identify({
      email: email.trim().toLowerCase(),
      phone_number: `+55${cleanPhone}`
    });
  } catch (e) {
    console.warn("TikTok pixel identify failed", e);
  }
};

/** Dispara o evento quando o PIX é gerado e o checkout foi iniciado efetivamente */
export const trackInitiateCheckout = (valor: number, txId?: string) => {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track("InitiateCheckout", {
      value: valor,
      currency: "BRL",
      content_type: "product",
      content_id: txId || "doacao-pix-gerado",
      content_name: "Doação Duda - PIX Gerado",
      quantity: 1,
    }, txId ? { event_id: txId } : undefined);
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
  }
};

/**
 * Dispara o evento de compra finalizada (Purchase) no TikTok.
 * Chamado quando o polling detecta que o PIX foi pago/aprovado.
 */
export const trackPurchase = (valor: number, txId?: string) => {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track("Purchase", {
      value: valor,
      currency: "BRL",
      content_type: "product",
      content_id: txId || "doacao-pix",
      content_name: "Doação Duda",
      quantity: 1,
    }, txId ? { event_id: txId } : undefined);
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
  }
};
