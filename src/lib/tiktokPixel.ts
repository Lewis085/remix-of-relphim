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

/**
 * Dispara o evento de compra finalizada (Purchase / CompletePayment) no TikTok.
 * Use ao confirmar pagamento PIX (quando a API PIX estiver integrada,
 * chamar isto na callback de "pago/aprovado").
 */
export const trackPurchase = (valor: number, txId?: string) => {
  if (typeof window === "undefined" || !window.ttq) return;
  try {
    window.ttq.track("CompletePayment", {
      value: valor,
      currency: "BRL",
      content_type: "product",
      content_id: txId || "doacao-pix",
      content_name: "Doação Duda",
      quantity: 1,
    });
  } catch (e) {
    console.warn("TikTok pixel track failed", e);
  }
};
