async function hashSha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface TikTokCapiData {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  amount: string | number;
  url?: string;
  ttclid?: string;
  ipAddress?: string;
  userAgent?: string;
  donorEmail?: string;
  donorPhone?: string;
}

export async function sendTikTokCapi(data: TikTokCapiData) {
  const TIKTOK_PIXEL_ID = "D7OECCJC77U471PH1560";
  const TIKTOK_ACCESS_TOKEN = "9f18d5319ffbf9ed7a31f633beff728e8dd90986";

  const payload: any = {
    pixel_code: TIKTOK_PIXEL_ID,
    event: data.eventName,
    event_id: data.eventId,
    event_time: Math.floor(Date.now() / 1000),
    context: {
      page: { url: data.url || "https://dudapacientezero.com.br/checkout" },
      user: {
        ttclid: data.ttclid || undefined,
        ip: data.ipAddress || undefined,
        user_agent: data.userAgent || undefined,
      }
    },
    properties: {
      contents: [{
        price: Number(data.amount),
        quantity: 1,
        content_id: data.eventId,
        content_type: "product",
        content_name: "Doação Duda"
      }],
      value: Number(data.amount),
      currency: "BRL"
    }
  };

  if (data.donorEmail) {
    payload.context.user.email = await hashSha256(data.donorEmail.trim().toLowerCase());
  }
  
  if (data.donorPhone) {
    const cleanPhone = data.donorPhone.replace(/\D/g, "");
    if (cleanPhone.length >= 10) {
      payload.context.user.phone_number = await hashSha256(`+55${cleanPhone}`);
    }
  }

  try {
    const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "Access-Token": TIKTOK_ACCESS_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`TikTok CAPI falhou para ${data.eventName}:`, response.status, errText);
    } else {
      const respJson = await response.json();
      console.log(`TikTok CAPI sucesso para ${data.eventName}:`, respJson);
    }
  } catch (err) {
    console.error(`Erro ao disparar TikTok CAPI (${data.eventName}):`, err);
  }
}
