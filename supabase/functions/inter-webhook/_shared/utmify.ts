export interface UtmifyOrderData {
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
  if (!urlStr) return {};
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    const utms: Record<string, string> = {};
    
    const fields = ["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term", "src", "sck"];
    for (const field of fields) {
      utms[field] = params.has(field) ? params.get(field)! : null;
    }
    return utms;
  } catch {
    return {
      utm_source: null,
      utm_campaign: null,
      utm_medium: null,
      utm_content: null,
      utm_term: null,
      src: null,
      sck: null
    };
  }
}

export async function sendUtmifyPostback(data: UtmifyOrderData) {
  const API_TOKEN = "D6sjrdgGMIkI9f9zh5VTPd4x2FzHRvASNrPJ";
  
  const payload: any = {
    orderId: data.orderId,
    platform: "pacientzero",
    paymentMethod: "pix",
    status: data.status,
    customer: {
      document: null
    },
    products: [
      {
        id: "oferta-validada",
        name: "Oferta Validada",
        quantity: 1,
        priceInCents: data.amountInCents,
        planId: "unico",
        planName: "Doacao Unica"
      }
    ],
    commission: {
      totalPriceInCents: data.amountInCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: data.amountInCents
    },
    isTest: false,
    trackingParameters: extractUtms(data.url)
  };

  // Safe Date formatting (YYYY-MM-DD HH:mm:ss)
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
      headers: {
        "x-api-token": API_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Utmify falhou para status ${data.status}:`, response.status, errText);
    } else {
      const respJson = await response.json();
      console.log(`Utmify sucesso para status ${data.status}:`, respJson);
    }
  } catch (err) {
    console.error(`Erro ao disparar Utmify (${data.status}):`, err);
  }
}
