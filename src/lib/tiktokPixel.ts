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

// Nome interno do produto usado para rastrear vendas no TikTok Ads.
// Mantém consistência com o que a API Inter recebe (solicitacaoPagador / infoAdicionais).
const PRODUCT_NAME = "30Dias 7kgs";
const PRODUCT_ID = "30D7K";

/** Dispara o evento de visualização de conteúdo (Landing Page) */
export const trackViewContent = () => {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track("ViewContent", {
      content_type: "product",
      content_id: PRODUCT_ID,
      content_name: PRODUCT_NAME,
    });
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
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
      content_id: txId || PRODUCT_ID,
      content_name: PRODUCT_NAME,
      quantity: 1,
    });
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
      content_id: txId || PRODUCT_ID,
      content_name: PRODUCT_NAME,
      quantity: 1,
    });
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
  }
};
